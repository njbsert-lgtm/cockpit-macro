/**
 * L'origine d'une valeur affichée : collectée par une source, ou saisie à la main dans
 * `data/seed.json`.
 *
 * Toute observation du seed porte `source: "seed"` — jamais le nom d'une institution. Le seed
 * attribuait auparavant ses valeurs à « Bundesbank », « Banque de France », « FRED /
 * Bundesbank »… alors qu'aucune n'avait été collectée : l'interface nommait comme source une
 * institution qui n'avait rien publié de tel. Une valeur du seed s'affiche désormais toujours
 * marquée comme non collectée, jusqu'à ce qu'une source branchée la remplace et qu'elle soit
 * retirée du seed.
 */
export const SEED_SOURCE = "seed";

export function estNonCollectee(observation: { source: string } | null | undefined): boolean {
  return observation?.source === SEED_SOURCE;
}
