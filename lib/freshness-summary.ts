import { freshnessTier, type FreshnessTier, worstTier } from "./freshness";
import { getInstruments, getMacroIndicators, getObservations, getMacroObservations } from "./data";
import { getReadClient } from "./supabase";

export type SourceFreshness = {
  source: string;
  fetchedAt: string;
  tier: FreshnessTier;
  /** Renseigné quand la dernière tentative a échoué — l'état 5 du cahier nomme la cause. */
  error?: string;
};

/**
 * Fraîcheur par source, dans l'ordre du plus ancien au plus récent.
 *
 * Elle est **par source et non par zone** : le point de la barre persistante dit si la
 * collecte fonctionne, une question qui n'a pas de géographie. La zone ne pilote plus que
 * l'onglet Macro depuis que le sélecteur y a été cantonné.
 *
 * Pour les séries collectées, la vérité vient de `series_health` : c'est la seule table qui
 * distingue « FRED n'a pas répondu » de « FRED a répondu, il n'y a rien de neuf ». Pour tout
 * le reste, la fraîcheur se lit sur le relevé le plus ancien du seed — le pire cas, pas le
 * meilleur, parce que c'est lui qui doit déclencher l'alerte visuelle.
 */
export async function getFreshnessSummary(now: Date = new Date()): Promise<SourceFreshness[]> {
  const bySource = new Map<string, SourceFreshness>();

  const record = (entry: SourceFreshness) => {
    const current = bySource.get(entry.source);
    // Le relevé le plus ancien l'emporte : une source n'est à jour que si toutes ses séries
    // le sont.
    if (!current || entry.fetchedAt < current.fetchedAt) bySource.set(entry.source, entry);
  };

  for (const entry of await readSeriesHealth(now)) record(entry);
  for (const entry of readSeedFreshness(now)) record(entry);

  return [...bySource.values()].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
}

async function readSeriesHealth(now: Date): Promise<SourceFreshness[]> {
  const client = getReadClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("series_health")
      .select("source, last_success_at, last_error, consecutive_failures");
    if (error || !data) return [];

    return (
      data as Array<{
        source: string;
        last_success_at: string | null;
        last_error: string | null;
        consecutive_failures: number;
      }>
    )
      .filter((row) => row.last_success_at !== null)
      .map((row) => ({
        source: row.source,
        fetchedAt: row.last_success_at!,
        tier: freshnessTier(row.last_success_at, now),
        error: row.consecutive_failures > 0 ? (row.last_error ?? undefined) : undefined,
      }));
  } catch {
    // Base injoignable : la fraîcheur du seed prend le relais, comme les valeurs elles-mêmes.
    return [];
  }
}

function readSeedFreshness(now: Date): SourceFreshness[] {
  const entries: SourceFreshness[] = [];

  const latestOf = (obs: ReturnType<typeof getObservations>) =>
    [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  for (const instrument of getInstruments()) {
    const latest = latestOf(getObservations(instrument.id));
    if (latest) {
      entries.push({
        source: latest.source,
        fetchedAt: latest.fetchedAt,
        tier: freshnessTier(latest.fetchedAt, now),
      });
    }
  }

  for (const indicator of getMacroIndicators()) {
    const latest = latestOf(getMacroObservations(indicator.id));
    if (latest) {
      entries.push({
        source: latest.source,
        fetchedAt: latest.fetchedAt,
        tier: freshnessTier(latest.fetchedAt, now),
      });
    }
  }

  return entries;
}

export function getOverallTier(summary: SourceFreshness[]): FreshnessTier {
  return worstTier(summary.map((s) => s.tier));
}
