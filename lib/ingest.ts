import type { SupabaseClient } from "@supabase/supabase-js";
import { ENABLED_SERIES, FRED_SERIES, type FredMapping } from "@/config/fred-series";
import {
  ENABLED_EUROSTAT_SERIES,
  EUROSTAT_SOURCE,
  type EurostatMapping,
} from "@/config/eurostat-series";
import { fetchFredSeries, FRED_SOURCE, type FredFetchResult } from "./fred";
import { fetchEurostatSeries } from "./eurostat";
import { getMacroIndicators } from "./data";

export type SeriesOutcome = {
  seriesId: string;
  targetId: string;
  ok: boolean;
  written: number;
  error?: string;
};

export type IngestReport = {
  source: string;
  startedAt: string;
  finishedAt: string;
  ok: number;
  failed: number;
  outcomes: SeriesOutcome[];
};

type Fetcher = (mapping: FredMapping, apiKey: string, now: Date) => Promise<FredFetchResult>;

/**
 * Un passage de collecte. Séquentiel et tolérant : l'échec d'une série est enregistré et
 * **n'interrompt pas les autres**, sinon une seule série cassée gèlerait tout le reste.
 *
 * Idempotent de bout en bout : chaque écriture est un `upsert` sur (identifiant, date), donc
 * un passage interrompu à mi-course n'abîme rien et celui du lendemain rattrape.
 */
export async function runIngest(
  client: SupabaseClient,
  apiKey: string,
  options: { now?: Date; fetcher?: Fetcher } = {},
): Promise<IngestReport> {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetchFredSeries;
  const startedAt = now.toISOString();
  const outcomes: SeriesOutcome[] = [];

  await syncMacroIndicators(client);

  for (const mapping of ENABLED_SERIES) {
    outcomes.push(await ingestOne(client, mapping, apiKey, now, fetcher));
  }

  return {
    source: FRED_SOURCE,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  };
}

// ---------------------------------------------------------------------------
// Eurostat
// ---------------------------------------------------------------------------

type EurostatFetcher = (mapping: EurostatMapping) => Promise<
  { ok: true; points: Array<{ date: string; value: number }> } | { ok: false; error: string }
>;

/**
 * Un passage de collecte Eurostat. Même mécanique que FRED, à la source près : séquentiel,
 * tolérant à l'échec d'une série, et **idempotent par upsert sur (identifiant, date)** — ce qui
 * compte doublement ici, Eurostat révisant régulièrement ses publications. Une valeur déjà
 * stockée qui change est écrasée, jamais ignorée.
 *
 * La santé s'écrit dans `series_health` avec `source: 'Eurostat'`, donc l'indicateur de
 * fraîcheur la présente comme une source distincte : un échec Eurostat ne peut pas se lire
 * comme un échec FRED.
 */
export async function runEurostatIngest(
  client: SupabaseClient,
  options: { now?: Date; fetcher?: EurostatFetcher; series?: EurostatMapping[] } = {},
): Promise<IngestReport> {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetchEurostatSeries;
  const startedAt = now.toISOString();
  const outcomes: SeriesOutcome[] = [];

  for (const mapping of options.series ?? ENABLED_EUROSTAT_SERIES) {
    outcomes.push(await ingestEurostatOne(client, mapping, now, fetcher));
  }

  return {
    source: EUROSTAT_SOURCE,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  };
}

/** L'identifiant lisible d'une série Eurostat : le dataset et ses dimensions fixées. */
export function eurostatSeriesKey(mapping: EurostatMapping): string {
  const dims = Object.entries(mapping.dimensions)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return `${mapping.dataset}?${dims}`;
}

async function ingestEurostatOne(
  client: SupabaseClient,
  mapping: EurostatMapping,
  now: Date,
  fetcher: EurostatFetcher,
): Promise<SeriesOutcome> {
  const targetId = mapping.target.id;
  const seriesKey = eurostatSeriesKey(mapping);
  const result = await fetcher(mapping);

  if (!result.ok) {
    await recordHealthFailure(client, {
      seriesKey,
      source: EUROSTAT_SOURCE,
      targetKind: "macro",
      targetId,
      error: result.error,
      now,
    });
    return { seriesId: seriesKey, targetId, ok: false, written: 0, error: result.error };
  }

  const fetchedAt = now.toISOString();
  const rows = result.points.map((p) => ({
    indicator_id: targetId,
    date: p.date,
    value: p.value,
    source: EUROSTAT_SOURCE,
    fetched_at: fetchedAt,
  }));

  if (rows.length > 0) {
    // `upsert` sans `ignoreDuplicates` : Supabase fait un ON CONFLICT DO UPDATE. C'est ce qui
    // fait entrer les révisions d'Eurostat plutôt que de les laisser à la porte.
    const { error } = await client
      .from("macro_observations")
      .upsert(rows, { onConflict: "indicator_id,date" });
    if (error) {
      await recordHealthFailure(client, {
        seriesKey,
        source: EUROSTAT_SOURCE,
        targetKind: "macro",
        targetId,
        error: `écriture refusée — ${error.message}`,
        now,
      });
      return { seriesId: seriesKey, targetId, ok: false, written: 0, error: error.message };
    }
  }

  await recordHealthSuccess(client, {
    seriesKey,
    source: EUROSTAT_SOURCE,
    targetKind: "macro",
    targetId,
    latestObservation: result.points.at(-1)?.date ?? null,
    now,
  });
  return { seriesId: seriesKey, targetId, ok: true, written: rows.length };
}

async function ingestOne(
  client: SupabaseClient,
  mapping: FredMapping,
  apiKey: string,
  now: Date,
  fetcher: Fetcher,
): Promise<SeriesOutcome> {
  const targetId = mapping.target.id;
  const result = await fetcher(mapping, apiKey, now);

  if (!result.ok) {
    // Rien n'est écrit : la dernière valeur valide reste en place, et l'échec est journalisé.
    await recordFailure(client, mapping, result.error, now);
    return { seriesId: mapping.seriesId, targetId, ok: false, written: 0, error: result.error };
  }

  const table = mapping.target.kind === "instrument" ? "observations" : "macro_observations";
  const idColumn = mapping.target.kind === "instrument" ? "instrument_id" : "indicator_id";
  const fetchedAt = now.toISOString();

  // Toutes les observations de la fenêtre sont réécrites, pas seulement les nouvelles. C'est
  // ce qui fait que `fetched_at` de la dernière ligne se rafraîchit chaque jour même quand la
  // valeur n'a pas bougé — et donc qu'un week-end ou une série mensuelle restent verts.
  // C'est aussi ce qui récupère les révisions historiques de FRED.
  const rows = result.points.map((p) => ({
    [idColumn]: targetId,
    date: p.date,
    value: p.value,
    source: FRED_SOURCE,
    fetched_at: fetchedAt,
  }));

  if (rows.length > 0) {
    const { error } = await client.from(table).upsert(rows, { onConflict: `${idColumn},date` });
    if (error) {
      await recordFailure(client, mapping, `écriture refusée — ${error.message}`, now);
      return {
        seriesId: mapping.seriesId,
        targetId,
        ok: false,
        written: 0,
        error: error.message,
      };
    }
  }

  const latest = result.points.at(-1)?.date ?? null;
  await recordSuccess(client, mapping, latest, now);
  return { seriesId: mapping.seriesId, targetId, ok: true, written: rows.length };
}

async function recordSuccess(
  client: SupabaseClient,
  mapping: FredMapping,
  latestObservation: string | null,
  now: Date,
): Promise<void> {
  await recordHealthSuccess(client, {
    seriesKey: mapping.seriesId,
    source: FRED_SOURCE,
    targetKind: mapping.target.kind,
    targetId: mapping.target.id,
    latestObservation,
    now,
  });
}

type HealthKey = {
  seriesKey: string;
  source: string;
  targetKind: "instrument" | "macro";
  targetId: string;
  now: Date;
};

/** La table de santé est partagée par toutes les sources : seule la colonne `source` diffère. */
async function recordHealthSuccess(
  client: SupabaseClient,
  { seriesKey, source, targetKind, targetId, latestObservation, now }: HealthKey & {
    latestObservation: string | null;
  },
): Promise<void> {
  const timestamp = now.toISOString();
  await client.from("series_health").upsert(
    {
      series_key: seriesKey,
      source,
      target_kind: targetKind,
      target_id: targetId,
      last_attempt_at: timestamp,
      // Un tableau vide est un succès : FRED a répondu, il n'y a simplement rien de neuf.
      last_success_at: timestamp,
      last_error: null,
      consecutive_failures: 0,
      latest_observation: latestObservation,
      updated_at: timestamp,
    },
    { onConflict: "series_key" },
  );
}

async function recordFailure(
  client: SupabaseClient,
  mapping: FredMapping,
  error: string,
  now: Date,
): Promise<void> {
  await recordHealthFailure(client, {
    seriesKey: mapping.seriesId,
    source: FRED_SOURCE,
    targetKind: mapping.target.kind,
    targetId: mapping.target.id,
    error,
    now,
  });
}

async function recordHealthFailure(
  client: SupabaseClient,
  { seriesKey, source, targetKind, targetId, error, now }: HealthKey & { error: string },
): Promise<void> {
  const timestamp = now.toISOString();

  // `last_success_at` n'est jamais touché : c'est lui qui porte la fraîcheur, et un échec ne
  // doit pas effacer la mémoire du dernier succès.
  const { data } = await client
    .from("series_health")
    .select("consecutive_failures")
    .eq("series_key", seriesKey)
    .maybeSingle();

  const previous = (data as { consecutive_failures: number } | null)?.consecutive_failures ?? 0;

  await client.from("series_health").upsert(
    {
      series_key: seriesKey,
      source,
      target_kind: targetKind,
      target_id: targetId,
      last_attempt_at: timestamp,
      last_error: error.slice(0, 500),
      consecutive_failures: previous + 1,
      updated_at: timestamp,
    },
    { onConflict: "series_key" },
  );
}

/**
 * Réécrit la projection des métadonnées macro. La configuration reste la source de vérité :
 * il n'y a jamais rien à maintenir à la main en base, et une divergence se corrige d'elle-même
 * au passage suivant.
 */
async function syncMacroIndicators(client: SupabaseClient): Promise<void> {
  const bySeries = new Map(
    FRED_SERIES.filter((m) => m.target.kind === "macro").map((m) => [m.target.id, m]),
  );

  const rows = getMacroIndicators().map((indicator) => ({
    id: indicator.id,
    label: indicator.label,
    zone: indicator.zone,
    unit: indicator.unit,
    // La cadence de la source fait foi quand elle est connue : DFEDTARU est quotidienne, pas
    // mensuelle comme le seed le déclarait.
    frequency: bySeries.get(indicator.id)?.cadence ?? indicator.frequency,
    series_key: bySeries.get(indicator.id)?.seriesId ?? indicator.seriesKey,
    next_release: indicator.nextRelease,
    synced_at: new Date().toISOString(),
  }));

  await client.from("macro_indicators").upsert(rows, { onConflict: "id" });
}
