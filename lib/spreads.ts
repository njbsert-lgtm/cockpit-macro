import type { Observation } from "./types";
import { SPREAD_SOURCE, type SpreadDefinition } from "@/config/spreads";

/**
 * Un spread hérite de la cadence de sa jambe la plus lente (le cahier, § Étape 3) : un point par
 * relevé de la jambe courte, jamais un par jour de la jambe longue. `de10y`/`fr10y` sont mensuels
 * tant qu'aucune source quotidienne libre de droits n'est trouvée (voir `config/fred-series.ts`) ;
 * calculer un point par jour ferait croire à une variation quotidienne que la donnée sous-jacente
 * n'a pas.
 *
 * Chaque point de la jambe courte s'apparie à la dernière valeur connue de la jambe longue à
 * cette date ou avant — jamais après, ce qui reviendrait à connaître une clôture future au jour
 * où le point mensuel est publié. Une date de jambe courte antérieure à la première valeur connue
 * de la jambe longue ne produit aucun point : pas de jambe longue, pas de spread, jamais une
 * valeur inventée pour combler le trou.
 */
export function computeSpread(
  longLeg: Observation[],
  shortLeg: Observation[],
  definition: SpreadDefinition,
  now: Date,
): Observation[] {
  const longSorted = [...longLeg].sort((a, b) => a.date.localeCompare(b.date));
  const shortSorted = [...shortLeg].sort((a, b) => a.date.localeCompare(b.date));
  const fetchedAt = now.toISOString();

  const points: Observation[] = [];
  let cursor = 0;
  let latestLong: Observation | null = null;

  for (const short of shortSorted) {
    while (cursor < longSorted.length && longSorted[cursor].date <= short.date) {
      latestLong = longSorted[cursor];
      cursor += 1;
    }
    if (!latestLong) continue;

    points.push({
      instrumentId: definition.target.id,
      date: short.date,
      value: latestLong.value - short.value,
      source: SPREAD_SOURCE,
      fetchedAt,
    });
  }

  return points;
}
