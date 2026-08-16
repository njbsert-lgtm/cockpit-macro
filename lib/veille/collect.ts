import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Le second module de l'orchestrateur cron (`app/api/cron/collect/route.ts`) : la collecte de
 * veille, indépendante de FRED.
 *
 * Trois garanties, dans l'ordre où le cahier des charges les pose :
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
 */

export type VeilleCollectorContext = {
  client: SupabaseClient;
  now: Date;
  /** Millisecondes restantes avant que ce passage doive s'arrêter. */
  budgetMs: number;
};

export type VeilleCollector = {
  /** Clé dans `veille_health` — 'GDELT', 'institutional', 'EDGAR'. */
  name: string;
  run: (ctx: VeilleCollectorContext) => Promise<{ written: number }>;
};

export type VeilleCollectorOutcome = {
  collector: string;
  ok: boolean;
  written: number;
  /** Budget épuisé avant que ce collecteur n'ait pu démarrer — pas un échec. */
  skipped: boolean;
  error?: string;
};

export type VeilleReport = {
  startedAt: string;
  finishedAt: string;
  outcomes: VeilleCollectorOutcome[];
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

  for (const collector of options.collectors) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_COLLECTOR_BUDGET_MS) {
      outcomes.push({ collector: collector.name, ok: true, written: 0, skipped: true });
      continue;
    }

    try {
      const result = await collector.run({ client, now, budgetMs: remaining });
      outcomes.push({ collector: collector.name, ok: true, written: result.written, skipped: false });
      await recordVeilleSuccess(client, collector.name, result.written, now);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcomes.push({ collector: collector.name, ok: false, written: 0, skipped: false, error: message });
      await recordVeilleFailure(client, collector.name, message, now);
    }
  }

  const purged = await purgeOldItems(client, now);

  return { startedAt, finishedAt: new Date().toISOString(), outcomes, purged };
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
  written: number,
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
      items_written: written,
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
