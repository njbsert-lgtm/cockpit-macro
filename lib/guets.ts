import type { Guet } from "./types";

/**
 * Le cycle de vie d'un guet — fonctions pures, sans accès disque ni base, comme le reste de
 * la logique de contenu. C'est ici que se joue la règle la plus facile à casser sans s'en
 * apercevoir : **un guet sans échéance n'expire jamais.**
 */

/** Le plafond du cahier : « un dispositif qui surveille quinze choses ne surveille rien ». */
export const GUETS_MAX = 3;

/**
 * Un guet est expiré quand son échéance est passée sans qu'il ait été résolu.
 *
 * Trois façons de ne pas l'être, et la première est la raison d'être de cette fonction :
 * - `echeance` nulle — « si Ormuz rouvre » n'a pas de date, il n'y a rien à dépasser ;
 * - déjà résolu (`confirme`, `infirme`) ou clos (`sans-objet`) ;
 * - échéance à venir, ou aujourd'hui même : l'événement n'a pas encore eu lieu.
 */
export function estExpire(guet: Guet, aujourdhui: string): boolean {
  if (guet.echeance === null) return false;
  if (guet.statut !== "ouvert") return false;
  return guet.echeance < aujourdhui;
}

/**
 * Fait passer à `expire` les guets dont l'échéance est dépassée. Renvoie la liste
 * **inchangée par référence** quand rien ne bouge, comme `mergeTrendDeltas` : un rendu qui
 * compare par identité ne doit pas se croire modifié sans raison.
 */
export function expirer(guets: Guet[], aujourdhui: string): Guet[] {
  if (!guets.some((g) => estExpire(g, aujourdhui))) return guets;
  return guets.map((g) => (estExpire(g, aujourdhui) ? { ...g, statut: "expire" as const } : g));
}

/**
 * Les guets de la note précédente qui reviennent dans le bloc 5 de la suivante : ceux qui
 * sont encore ouverts, et ceux qui viennent d'expirer.
 *
 * Un guet expiré remonte **avec sa date d'origine visible** — c'est tout l'intérêt. Un guet
 * oublié est une question qu'on a cessé de se poser sans le décider, et ça doit se voir.
 * Un guet résolu ou clos en `sans-objet` ne remonte pas : sa question est réglée.
 */
export function guetsARemonter(precedents: Guet[], aujourdhui: string): Guet[] {
  return expirer(precedents, aujourdhui).filter(
    (g) => g.statut === "ouvert" || g.statut === "expire",
  );
}

/**
 * Combien de guets neufs la note peut encore accueillir.
 *
 * Les guets remontés comptent dans le plafond. Sans ça, trois guets sans échéance
 * occuperaient le budget indéfiniment et le portail n'aurait plus de place pour un nouveau
 * sans que rien ne le dise — le plafond deviendrait une limite invisible au lieu d'une
 * contrainte lisible. Ici, la seule sortie est de clore un guet délibérément.
 */
export function budgetDisponible(remontes: Guet[]): number {
  return Math.max(0, GUETS_MAX - remontes.length);
}

/** Sépare ce qui remonte, pour le paquet de contexte et pour le portail. */
export function partitionnerRemontes(remontes: Guet[]): {
  ouverts: Guet[];
  expires: Guet[];
} {
  return {
    ouverts: remontes.filter((g) => g.statut === "ouvert"),
    expires: remontes.filter((g) => g.statut === "expire"),
  };
}
