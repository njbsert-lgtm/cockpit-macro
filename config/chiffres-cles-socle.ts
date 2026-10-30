import type { Cible } from "@/lib/chiffres-vivants";

/**
 * Le socle fixe des chiffres clés de l'accueil (J7.19) : ce qui s'affiche toujours, en plus de
 * ce que la note choisit dans son frontmatter. De la configuration, pas de la donnée : aucune
 * valeur ici, seulement ce que le chiffre désigne. La valeur, sa variation et sa date viennent
 * de la dernière observation collectée ; sans observation, la cellule dit « non suivi ».
 *
 * - Taux BCE : `ez-policy-rate`, facilité de dépôt (FRED `ECBDFR`, quotidienne, en palier).
 * - Inflation américaine : `us-cpi`, glissement annuel de l'IPC (FRED `CPIAUCSL`, `pc1`, mensuelle).
 *
 * - MSCI ACWI : `acwi`, affiché **sous son propre nom** (décision de Nicolas, 30/10). C'est l'ETF
 *   iShares collecté, en dollars par part, qui couvre marchés développés et émergents. Ce n'est pas
 *   MSCI World (développés seuls) et il ne porte jamais ce nom : substituer l'un à l'autre
 *   serait un chiffre plausible et faux.
 */
export const SOCLE_CHIFFRES_CLES: ReadonlyArray<{ label: string; cible: Cible }> = [
  { label: "BCE — taux de dépôt", cible: { kind: "macro", id: "ez-policy-rate" } },
  { label: "Inflation US", cible: { kind: "macro", id: "us-cpi" } },
  { label: "MSCI ACWI", cible: { kind: "instrument", id: "acwi" } },
];
