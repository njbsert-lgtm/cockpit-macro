import { NOTES_PURGEES } from "@/config/suivi";

/**
 * Un texte rédigé ne renvoie jamais à une note, ni à une analyse, antérieure au début du suivi
 * (config/suivi.ts) : ces notes ont été retirées à la remise à zéro du corpus, et un renvoi à
 * « la note d'août » désignerait quelque chose que personne ne peut ouvrir.
 *
 * Deux formes de renvoi sont reconnues, volontairement étroites — un faux positif envoie réécrire
 * une phrase juste, un faux négatif laisse passer un renvoi fantôme :
 *
 * - l'identifiant d'une note retirée, écrit « 2026-S32 », « S32 » ou « 2026-S28-E1 » ;
 * - « note de / d'/ du JJ » suivi d'un mois d'avant le suivi : « la note d'août », « notre note de
 *   juillet », « la note du 13 août ». Le mois doit suivre directement : « une note de Goldman
 *   Sachs publiée en août » est une source tierce, pas un renvoi à nos notes.
 *
 * Un fait de marché daté — « deuxième hausse depuis juin » — n'est pas un renvoi à une note et
 * passe. Septembre n'est pas listé : la S38 date du 19/09, ses notes sont réelles.
 */
const MOIS_AVANT_LE_SUIVI = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout";

const SEMAINES_RETIREES = [...new Set(NOTES_PURGEES.map((slug) => /-S(\d{2})/.exec(slug)?.[1]).filter(Boolean))];

const MOTIF_IDENTIFIANT = new RegExp(`(?<![\\w-])(?:\\d{4}-)?S(?:${SEMAINES_RETIREES.join("|")})(?:-E\\d+)?(?![\\w-])`);

const MOTIF_NOTE_DATEE = new RegExp(
  `\\bnotes?\\s+(?:précédente\\s+)?(?:de\\s+|d['’]\\s*|du\\s+\\d{1,2}(?:er)?\\s+)(?:${MOIS_AVANT_LE_SUIVI})\\b`,
  "i",
);

/** Le passage fautif, ou `null` si le texte ne renvoie à aucune note retirée. */
export function renvoiAUneNoteRetiree(texte: string): string | null {
  const trouve = MOTIF_IDENTIFIANT.exec(texte) ?? MOTIF_NOTE_DATEE.exec(texte);
  return trouve ? trouve[0] : null;
}
