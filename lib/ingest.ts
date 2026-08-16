import type { SupabaseClient } from "@supabase/supabase-js";
import { ENABLED_SERIES, FRED_SERIES, type FredMapping } from "@/config/fred-series";
import { fetchFredSeries, FRED_SOURCE, type FredFetchResult } from "./fred";
import { getMacroIndicators } from "./data";

export type SeriesOutcome = {
  seriesId: string;
  targetId: string;
  ok: boolean;
  written: number;
  error?: string;
};

export type IngestReport = {
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
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  };
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
  const timestamp = now.toISOString();
  await client.from("series_health").upsert(
    {
      series_key: mapping.seriesId,
      source: FRED_SOURCE,
      target_kind: mapping.target.kind,
      target_id: mapping.target.id,
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
  const timestamp = now.toISOString();

  // `last_success_at` n'est jamais touché : c'est lui qui porte la fraîcheur, et un échec ne
  // doit pas effacer la mémoire du dernier succès.
  const { data } = await client
    .from("series_health")
    .select("consecutive_failures")
    .eq("series_key", mapping.seriesId)
    .maybeSingle();

  const previous = (data as { consecutive_failures: number } | null)?.consecutive_failures ?? 0;

  await client.from("series_health").upsert(
    {
      series_key: mapping.seriesId,
      source: FRED_SOURCE,
      target_kind: mapping.target.kind,
      target_id: mapping.target.id,
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
