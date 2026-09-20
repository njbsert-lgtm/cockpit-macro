import type { MacroIndicator } from "./types";
import { metricOf } from "./macro";
import type { SeriesPoint } from "./chart-range";

/**
 * Les séries **en palier** : celles qui ne bougent qu'à une décision, et tiennent entre deux.
 *
 * Un taux directeur n'est pas une série continue. Il est fixé par un comité, il vaut exactement
 * la même chose tous les jours jusqu'au comité suivant, et il saute. Le collecter quotidiennement
 * est juste — c'est ce que la source publie — mais le **rendre** quotidiennement produit deux
 * mensonges d'affichage :
 *
 * - un graphique interpolé dessine des pentes douces entre les paliers, donc un taux qui aurait
 *   dérivé alors qu'il a sauté ;
 * - un historique en table répète la même valeur des centaines de fois et noie les six lignes
 *   qui portent toute l'information.
 *
 * Réduire aux ruptures n'enlève rien : entre deux ruptures, la valeur est celle de la rupture
 * précédente, par construction. C'est la série entière, écrite sans répétition.
 */

/** Une série est-elle un palier ? Décidé sur la métrique, jamais sur la zone. */
export function estEnPalier(indicator: MacroIndicator): boolean {
  return metricOf(indicator) === "policy-rate";
}

export type Palier = SeriesPoint & {
  /** L'écart avec le palier précédent, en points de pourcentage. `null` pour le premier. */
  variation: number | null;
  /** La dernière date où ce palier valait encore — utile pour lire la durée d'un maintien. */
  jusquA: string;
};

/**
 * Les ruptures d'une série en palier : le premier relevé, puis chaque changement de valeur.
 *
 * **Ce sont les dates de décision, et rien d'autre.** Une réunion qui laisse le taux inchangé
 * n'apparaît donc pas : elle ne produit aucun point de donnée, et l'inventer demanderait un
 * calendrier historique des comités de chaque banque centrale que nous n'avons pas — le
 * fabriquer serait exactement la donnée inventée que le cahier interdit. Ce que la table
 * affiche, c'est l'histoire du taux, complète ; ce qu'elle n'affiche pas, c'est la liste des
 * réunions, qui est une autre information.
 *
 * La comparaison se fait sur la valeur exacte, sans tolérance : une source qui publie un taux
 * directeur publie une décision, pas une mesure bruitée.
 */
export function paliersDe(points: SeriesPoint[]): Palier[] {
  const tries = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const paliers: Palier[] = [];

  for (const point of tries) {
    const dernier = paliers.at(-1);
    if (!dernier) {
      paliers.push({ ...point, variation: null, jusquA: point.date });
      continue;
    }
    if (point.value === dernier.value) {
      dernier.jusquA = point.date; // le palier tient, on note seulement qu'il dure
      continue;
    }
    paliers.push({ ...point, variation: point.value - dernier.value, jusquA: point.date });
  }

  return paliers;
}

/**
 * La variation d'un palier, en points de base — l'unité dans laquelle une décision se lit.
 *
 * « +0,25 point » et « +25 bps » disent la même chose ; la seconde est celle que tout le monde
 * emploie pour une décision de banque centrale, et le cahier l'impose déjà pour les taux et les
 * spreads côté Marchés. L'arrondi à l'entier évite d'afficher « +25,000000000000004 bps », que
 * la soustraction de deux flottants produit sans faute de notre part.
 */
export function enPointsDeBase(variation: number): string {
  const bps = Math.round(variation * 100);
  return `${bps > 0 ? "+" : bps < 0 ? "−" : ""}${Math.abs(bps)} bps`;
}
