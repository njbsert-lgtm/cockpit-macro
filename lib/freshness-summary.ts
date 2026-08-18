import { freshnessTier, type FreshnessTier, worstTier } from "./freshness";
import { getInstruments, getMacroIndicators, getObservations, getMacroObservations } from "./data";
import { getReadClient } from "./supabase";
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
 * Pour les sources collectées, la vérité vient de `series_health` et de nulle part ailleurs :
 * c'est la seule table qui distingue « FRED n'a pas répondu » de « FRED a répondu, il n'y a
 * rien de neuf ». Pour les autres, la fraîcheur se lit sur le relevé le plus ancien du seed —
 * le pire cas, pas le meilleur, parce que c'est lui qui doit déclencher l'alerte visuelle.
 */
export async function getFreshnessSummary(now: Date = new Date()): Promise<SourceFreshness[]> {
  const bySource = new Map<string, SourceFreshness>();

  const record = (entry: SourceFreshness) => {
    const current = bySource.get(entry.source);
    // Le relevé le plus ancien l'emporte : une source n'est à jour que si toutes ses séries
    // le sont.
    if (!current || entry.fetchedAt! < current.fetchedAt!) bySource.set(entry.source, entry);
  };

  for (const entry of await readSeriesHealth(now)) record(entry);
  for (const entry of readSeedFreshness(now)) record(entry);

  // Une source configurée dont rien n'est encore remonté : elle doit se voir, et se lire comme
  // « jamais collectée » plutôt que de disparaître du panneau. Un tuyau qu'on a branché mais
  // qui n'a jamais coulé est une information ; une ligne absente n'en est pas une.
  for (const source of configuredSources()) {
    if (!bySource.has(source)) {
      bySource.set(source, { source, fetchedAt: null, tier: "absente" });
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

/**
 * La fraîcheur des séries lues sur le seed.
 *
 * **Une entrée du seed ne parle jamais au nom d'une source configurée.** C'est la règle qui
 * manquait, et elle a coûté cher : la fusion retenant le relevé le plus ancien, une ligne du
 * seed étiquetée « FRED » avec une date figée écrasait silencieusement ce que le cron venait
 * d'écrire. L'indicateur devenait incapable de répondre à la seule question qu'on lui pose.
 *
 * Le piège ne se limitait pas aux séries collectées, qu'il aurait suffi d'exclure une à une :
 * `us-current-account` reste volontairement au seed — FRED le publie en dollars et non en part
 * du PIB — mais son entrée porte quand même l'étiquette « FRED ». Une série qu'on ne collecte
 * pas n'a pourtant rien à dire sur la santé d'une collecte.
 *
 * D'où le filtre au niveau de la source et non de la série : pour FRED et Eurostat, la vérité
 * est dans `series_health`, un point c'est tout — y compris quand c'est le seed qui fournit
 * les valeurs affichées faute de base. « D'où vient le chiffre » et « la collecte
 * fonctionne-t-elle » sont deux questions distinctes, et les mêler rend la seconde muette.
 */
function readSeedFreshness(now: Date): SourceFreshness[] {
  const collectees = new Set(configuredSources());
  const entries: SourceFreshness[] = [];

  const latestOf = (obs: ReturnType<typeof getObservations>) =>
    [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  const push = (latest: ReturnType<typeof latestOf>) => {
    if (!latest || collectees.has(latest.source)) return;
    entries.push({
      source: latest.source,
      fetchedAt: latest.fetchedAt,
      tier: freshnessTier(latest.fetchedAt, now),
    });
  };

  for (const instrument of getInstruments()) push(latestOf(getObservations(instrument.id)));
  for (const indicator of getMacroIndicators()) push(latestOf(getMacroObservations(indicator.id)));

  return entries;
}

export function getOverallTier(summary: SourceFreshness[]): FreshnessTier {
  return worstTier(summary.map((s) => s.tier));
}
