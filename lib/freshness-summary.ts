import { freshnessTier, type FreshnessTier, worstTier } from "./freshness";
import { getReadClient, missingSupabaseConfig } from "./supabase";
import { ENABLED_SERIES } from "@/config/fred-series";
import { ENABLED_EUROSTAT_SERIES, EUROSTAT_SOURCE } from "@/config/eurostat-series";
import { FRED_SOURCE } from "./fred";

export type SourceFreshness = {
  source: string;
  /** `null` quand la source est configurée mais n'a jamais rien collecté. */
  fetchedAt: string | null;
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
 * **Seules les sources réellement collectées y figurent.** Une série servie par le seed n'a
 * rien à dire sur la santé d'une collecte : elle ne vieillit pas, elle est simplement écrite
 * en dur. Les faire figurer noyait les quelques sources qui comptent sous une trentaine de
 * lignes rouges permanentes — et un indicateur qui crie sans raison finit par ne plus être lu.
 *
 * La vérité vient donc de `series_health` et de nulle part ailleurs : c'est la seule table qui
 * distingue « FRED n'a pas répondu » de « FRED a répondu, il n'y a rien de neuf ».
 */
export async function getFreshnessSummary(now: Date = new Date()): Promise<SourceFreshness[]> {
  const bySource = new Map<string, SourceFreshness>();

  const record = (entry: SourceFreshness) => {
    const current = bySource.get(entry.source);
    // Le relevé le plus ancien l'emporte : une source n'est à jour que si toutes ses séries
    // le sont.
    if (!current || entry.fetchedAt! < current.fetchedAt!) bySource.set(entry.source, entry);
  };

  const health = await readSeriesHealth(now);
  for (const entry of health.entries) record(entry);

  // Une source configurée dont rien n'est remonté : elle doit se voir, et se lire comme
  // « jamais collectée » plutôt que de disparaître du panneau. Un tuyau qu'on a branché mais
  // qui n'a jamais coulé est une information ; une ligne absente n'en est pas une.
  //
  // Encore faut-il ne pas confondre deux pannes que rien ne distingue à l'écran sans ça : une
  // collecte qui n'a jamais tourné, et une base qu'on ne sait pas interroger. C'est l'état 5
  // du cahier — nommer la cause, pas seulement constater le vide.
  for (const source of configuredSources()) {
    if (!bySource.has(source)) {
      bySource.set(source, { source, fetchedAt: null, tier: "absente", error: health.failure });
    }
  }

  // Les sources sans relevé d'abord : c'est le cas le plus grave, il ouvre la liste.
  return [...bySource.values()].sort((a, b) =>
    (a.fetchedAt ?? "").localeCompare(b.fetchedAt ?? ""),
  );
}

/** Les sources qui ont au moins une série active, donc dont on attend un relevé quotidien. */
function configuredSources(): string[] {
  const sources = new Set<string>();
  if (ENABLED_SERIES.length > 0) sources.add(FRED_SOURCE);
  if (ENABLED_EUROSTAT_SERIES.length > 0) sources.add(EUROSTAT_SOURCE);
  return [...sources];
}

type HealthRead = {
  entries: SourceFreshness[];
  /** Renseigné quand c'est la lecture qui a échoué, pas la collecte. */
  failure?: string;
};

async function readSeriesHealth(now: Date): Promise<HealthRead> {
  const client = getReadClient();
  if (!client) {
    const manquantes = missingSupabaseConfig().join(", ");
    return {
      entries: [],
      failure: `Base non configurée en lecture — ${manquantes} absente(s) des variables d'environnement.`,
    };
  }

  try {
    const { data, error } = await client
      .from("series_health")
      .select("source, last_success_at, last_error, consecutive_failures");
    // Une requête refusée — table absente, politique RLS, droits — n'est pas une collecte qui
    // n'a rien produit. Les confondre envoie chercher la panne du mauvais côté.
    if (error) return { entries: [], failure: `series_health illisible — ${error.message}` };
    if (!data) return { entries: [], failure: "series_health n'a rien renvoyé du tout." };

    return {
      entries: (
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
        })),
    };
  } catch (err) {
    return {
      entries: [],
      failure: `Base injoignable — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function getOverallTier(summary: SourceFreshness[]): FreshnessTier {
  return worstTier(summary.map((s) => s.tier));
}
