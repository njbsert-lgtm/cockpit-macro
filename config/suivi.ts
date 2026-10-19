/**
 * Le début du suivi — la remise à zéro du corpus (CLAUDE.md, Étape 6.6).
 *
 * Les notes de développement S24 à S32 étaient de la fiction écrite pour éprouver le maillage
 * driver ↔ tendance ↔ instrument ↔ note. Elles ont été retirées le 19/10/2026, avec leurs versions
 * de scénarios et leurs historiques de tendance. Le suivi réel commence à la S38.
 *
 * Ce fichier est la seule trace de ce qui a été retiré. Il sert à trois choses, et à rien d'autre :
 *  - la S38 se compare à une note qui n'existe plus (`precedentePurgee`) : la chaîne des notes
 *    l'accepte pour elle seule, jamais pour une autre ;
 *  - les versions de scénario réelles gardent leur numéro (v4, v5…), qui suppose les versions
 *    retirées : la contiguïté des numéros n'est exigée qu'à partir du début du suivi ;
 *  - les anciennes adresses de notes redirigent vers `/notes` plutôt que de produire un 404.
 *
 * On ne reconstitue rien pour les semaines S33 à S37 : un trou reste un trou.
 */
export const DEBUT_DU_SUIVI = {
  /** La première note réelle. */
  slug: "2026-S38",
  semaine: "S38",
  /** La note à laquelle la S38 se comparait : retirée avec les autres. */
  precedentePurgee: "2026-S32",
} as const;

/** Les notes de développement retirées. Leurs adresses redirigent vers `/notes`. */
export const NOTES_PURGEES: readonly string[] = [
  "2026-S24",
  "2026-S26",
  "2026-S26-E1",
  "2026-S27",
  "2026-S28",
  "2026-S28-E1",
  "2026-S29",
  "2026-S31",
  "2026-S32",
];

export function estPurgee(slug: string): boolean {
  return NOTES_PURGEES.includes(slug);
}
