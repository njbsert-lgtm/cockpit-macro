import type { GuetStatut } from "./types";

/**
 * Le statut d'un guet à l'écran.
 *
 * Même règle chromatique que le statut de tendance : un statut est du **contenu**, donc le
 * vert et le rouge lui sont interdits — ils sont réservés aux chiffres. Ce sont des couleurs
 * de canal, seule palette admise pour qualifier un contenu.
 *
 * Le libellé est toujours écrit à côté de la pastille : la couleur ne porte jamais
 * l'information seule.
 */
export const GUET_STATUT_LABEL: Record<GuetStatut, string> = {
  ouvert: "Ouvert",
  confirme: "Confirmé",
  infirme: "Infirmé",
  expire: "Expiré",
  "sans-objet": "Sans objet",
};

/** Texte à la couleur pleine, fond à 11 % — les deux vont de pair. */
export const GUET_STATUT_CLASS: Record<GuetStatut, string> = {
  ouvert: "bg-k-taux/11 text-k-taux",
  confirme: "bg-k-pos/11 text-k-pos",
  // Une infirmation est un événement analytique — la branche bascule —, pas un échec.
  infirme: "bg-k-reac/11 text-k-reac",
  // Même ocre que la pastille non validée de l'archive : une discipline rompue, pas une erreur.
  expire: "bg-k-choc/11 text-k-choc",
  "sans-objet": "bg-tenu/11 text-tenu",
};
