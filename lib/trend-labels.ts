import type { TrendStatus } from "./types";

/**
 * Le statut d'une tendance et sa trajectoire.
 *
 * DESIGN.md décrit la pastille — « fond à 11 % d'opacité de la couleur, texte à la couleur
 * pleine » — sans dire *quelle* couleur. Un statut de tendance est du **contenu** : le vert et
 * le rouge lui sont donc interdits, réservés aux chiffres. Ce sont des couleurs de canal,
 * seule palette admise pour qualifier un contenu.
 *
 * La maquette montre trois trajectoires là où le modèle en compte quatre : « invalidée » est
 * un état terminal, distinct de « s'affaiblit », et garde sa propre ligne.
 */
export const TREND_STATUS_LABEL: Record<TrendStatus, string> = {
  renforce: "Se renforce",
  maintient: "Se maintient",
  affaiblit: "S'affaiblit",
  invalidee: "Invalidée",
};

export const TREND_TRAJECTORY: Record<TrendStatus, string> = {
  renforce: "Se renforce \u2197\uFE0E",
  maintient: "Stable \u2192",
  affaiblit: "Sous tension \u2198\uFE0E",
  invalidee: "\u00c9cart\u00e9e \u2715",
};

/** Texte à la couleur pleine, fond à 11 % — les deux vont de pair. */
export const TREND_STATUS_CLASS: Record<TrendStatus, string> = {
  renforce: "bg-k-taux/11 text-k-taux",
  maintient: "bg-k-pos/11 text-k-pos",
  affaiblit: "bg-k-choc/11 text-k-choc",
  invalidee: "bg-tenu/11 text-tenu",
};
