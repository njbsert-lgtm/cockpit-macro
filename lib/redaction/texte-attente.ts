/**
 * Le texte d'attente : ce qu'on écrit dans un bloc, pour le rédacteur, à la place du contenu
 * qu'il reste à produire — typiquement le bloc « Ce que j'avais mal lu », que le modèle n'écrit
 * jamais. La S38 est parue avec le sien (« Bloc à compléter — il ne peut pas être rédigé pour
 * vous… ») : un message adressé au rédacteur, publié comme s'il était de la note.
 *
 * Il ne se publie jamais. Un bloc qui n'a rien à dire le dit — « Bloc non rédigé à la
 * publication. », ou « rien de notable cette semaine » pour le bloc 4 — mais ne laisse pas une
 * consigne de travail à la place du texte.
 */
const MOTIFS_ATTENTE = [/bloc à compléter/i, /ne peut pas être rédigé pour vous/i];

/** Le passage qui trahit un texte d'attente, ou `null`. */
export function texteDAttente(texte: string): string | null {
  for (const motif of MOTIFS_ATTENTE) {
    const trouve = motif.exec(texte);
    if (trouve) return trouve[0];
  }
  return null;
}
