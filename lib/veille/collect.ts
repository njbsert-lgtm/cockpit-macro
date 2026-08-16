import type { SupabaseClient } from "@supabase/supabase-js";
import type { VeilleItem } from "@/lib/types";
import {
  applyKeywordGate,
  DAILY_TRANSMISSION_CAP,
  rankAndCap,
  toVeilleItem,
  type FilteredVeilleCandidate,
  type RawVeilleCandidate,
} from "./filter";

/**
 * Le second module de l'orchestrateur cron (`app/api/cron/collect/route.ts`) : la collecte de
 * veille, indépendante de FRED.
 *
 * Quatre garanties, dans l'ordre où le cahier des charges les pose :
 *
 * 1. **Isolation par collecteur.** L'échec de l'un — erreur réseau, exception — n'empêche pas
 *    les suivants de s'exécuter, au même titre que `runIngest` isole chaque série FRED.
 * 2. **Isolation vis-à-vis de FRED.** Le résultat de chaque collecteur est journalisé dans
 *    `veille_health`, une table distincte de `series_health`. L'indicateur de fraîcheur de la
 *    barre persistante (`lib/freshness-summary.ts`) ne lit jamais `veille_health` : un incident
 *    de veille ne peut donc jamais se lire comme un incident FRED dans la barre.
 * 3. **Budget de temps global, pas par collecteur.** Les fonctions Vercel ont une limite de
 *    durée ; un collecteur qui n'a pas eu sa chance ce passage-ci est marqué `skipped`, pas en
 *    échec, et la retrouve au passage suivant — via `veille_cursor` pour ceux qui en tiennent
 *    un (GDELT, dont la collecte se découpe en requêtes thème × pays).
 * 4. **Passe 1 et plafond centralisés.** Chaque collecteur ne fait que remonter des candidats
 *    bruts ; le filtre par mot-clé, le classement par autorité de source et le plafond
 *    quotidien de 40 items s'appliquent une fois tous les candidats réunis — sinon un
 *    collecteur isolé ne pourrait jamais savoir combien de place il lui reste face aux autres.
 */

export type VeilleCollectorContext = {
  client: SupabaseClient;
  now: Date;
  /** Millisecondes restantes avant que ce passage doive s'arrêter. */
  budgetMs: number;
};

export type VeilleCollector = {
  /** Clé dans `veille_health` — 'GDELT', 'institutional', 'SEC EDGAR'. */
  name: string;
  run: (ctx: VeilleCollectorContext) => Promise<{ candidates: RawVeilleCandidate[] }>;
};

export type VeilleCollectorOutcome = {
  collector: string;
  ok: boolean;
  /** Candidats bruts remontés par ce collecteur, avant la passe 1. */
  harvested: number;
  /** Budget épuisé avant que ce collecteur n'ait pu démarrer — pas un échec. */
  skipped: boolean;
  error?: string;
};

export type VeilleReport = {
  startedAt: string;
  finishedAt: string;
  outcomes: VeilleCollectorOutcome[];
  /** Combien de candidats ont survécu à la passe 1 (un driver ou un canal reconnu). */
  gated: number;
  /** Combien ont effectivement été écrits, après le plafond quotidien. */
  written: number;
  purged: number;
};

// En dessous de ce reliquat, un collecteur n'a pas le temps de faire une seule requête utile :
// autant le reporter intact au passage suivant plutôt que de le lancer pour rien.
const MIN_COLLECTOR_BUDGET_MS = 2_000;

// « Purge automatique au-delà de quinze jours » (cahier des charges, § Veille).
const RETENTION_DAYS = 15;

export async function runVeilleCollect(
  client: SupabaseClient,
  options: { now?: Date; budgetMs: number; collectors: VeilleCollector[] },
): Promise<VeilleReport> {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const deadline = Date.now() + Math.max(0, options.budgetMs);
  const outcomes: VeilleCollectorOutcome[] = [];
  const allCandidates: RawVeilleCandidate[] = [];

  for (const collector of options.collectors) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_COLLECTOR_BUDGET_MS) {
      outcomes.push({ collector: collector.name, ok: true, harvested: 0, skipped: true });
      continue;
    }

    try {
      const { candidates } = await collector.run({ client, now, budgetMs: remaining });
      allCandidates.push(...candidates);
      outcomes.push({ collector: collector.name, ok: true, harvested: candidates.length, skipped: false });
      await recordVeilleSuccess(client, collector.name, candidates.length, now);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcomes.push({ collector: collector.name, ok: false, harvested: 0, skipped: false, error: message });
      await recordVeilleFailure(client, collector.name, message, now);
    }
  }

  const gatedCandidates = allCandidates
    .map(applyKeywordGate)
    .filter((c): c is FilteredVeilleCandidate => c !== null);

  const alreadyToday = await countItemsCollectedToday(client, now);
  const remainingSlots = DAILY_TRANSMISSION_CAP - alreadyToday;
  const toWrite = rankAndCap(gatedCandidates, remainingSlots).map(toVeilleItem);
  const written = await writeItems(client, toWrite, now);

  const purged = await purgeOldItems(client, now);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    outcomes,
    gated: gatedCandidates.length,
    written,
    purged,
  };
}

async function countItemsCollectedToday(client: SupabaseClient, now: Date): Promise<number> {
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await client
    .from("veille_items")
    .select("id", { count: "exact", head: true })
    .gte("collected_at", startOfDay.toISOString());
  if (error || count === null) return 0;
  return count;
}

async function writeItems(client: SupabaseClient, items: VeilleItem[], now: Date): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    source: item.source,
    published_at: item.publishedAt,
    zones: item.zones,
    driver_refs: item.driverRefs,
    channels: item.channels,
    is_signal: item.isSignal,
    status: item.status,
    attached_to_block: item.attachedToBlock,
    draft_note_slug: item.draftNoteSlug,
    collected_at: now.toISOString(),
  }));

  const { error } = await client.from("veille_items").upsert(rows, { onConflict: "id" });
  return error ? 0 : items.length;
}

async function purgeOldItems(client: SupabaseClient, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client.from("veille_items").delete().lt("published_at", cutoff).select("id");
  if (error || !data) return 0;
  return (data as unknown[]).length;
}

async function recordVeilleSuccess(
  client: SupabaseClient,
  collector: string,
  harvested: number,
  now: Date,
): Promise<void> {
  const timestamp = now.toISOString();
  await client.from("veille_health").upsert(
    {
      collector,
      last_attempt_at: timestamp,
      last_success_at: timestamp,
      last_error: null,
      consecutive_failures: 0,
      items_written: harvested,
      updated_at: timestamp,
    },
    { onConflict: "collector" },
  );
}

async function recordVeilleFailure(
  client: SupabaseClient,
  collector: string,
  error: string,
  now: Date,
): Promise<void> {
  const timestamp = now.toISOString();

  const { data } = await client
    .from("veille_health")
    .select("consecutive_failures")
    .eq("collector", collector)
    .maybeSingle();
  const previous = (data as { consecutive_failures: number } | null)?.consecutive_failures ?? 0;

  await client.from("veille_health").upsert(
    {
      collector,
      last_attempt_at: timestamp,
      last_error: error.slice(0, 500),
      consecutive_failures: previous + 1,
      updated_at: timestamp,
    },
    { onConflict: "collector" },
  );
}
