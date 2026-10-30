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
 * **MSCI World : absent volontairement.** Le catalogue ne porte que MSCI ACWI (ETF iShares, en
 * dollars par part), qui n'est pas le même repère : ACWI couvre les marchés développés et
 * émergents, World les seuls développés. Substituer l'un à l'autre sous le nom de l'autre
 * serait un chiffre plausible et faux. Décision à Nicolas : afficher ACWI sous son propre nom,
 * ou chercher un ETF World (Alpha Vantage / Twelve Data), signalé comme approximation.
 */
export const SOCLE_CHIFFRES_CLES: ReadonlyArray<{ label: string; cible: Cible }> = [
  { label: "BCE — taux de dépôt", cible: { kind: "macro", id: "ez-policy-rate" } },
  { label: "Inflation US", cible: { kind: "macro", id: "us-cpi" } },
];
