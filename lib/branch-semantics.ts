import type { ScenarioLikelihood, ScenarioVersion } from "./types";

/**
 * La couleur sémantique d'une branche (DESIGN.md : « positionnement, hausse, baisse »).
 *
 * Elle est **dérivée** de l'impact déjà déclaré sur les actions dans `content/scenarios.ts`,
 * jamais saisie une seconde fois : une branche dont les actions montent est une branche
 * haussière. C'est le seul endroit du produit où `--hausse` et `--baisse` touchent autre chose
 * qu'un chiffre, et DESIGN.md l'autorise explicitement — la jauge qualifie une vraisemblance,
 * qui est « un chiffre éditorial ».
 */
export type BranchSemantic = "hausse" | "baisse" | "neutre";

export function branchSemantic(branch: ScenarioVersion): BranchSemantic {
  const direction = branch.impacts.eq.direction;
  if (direction === "up") return "hausse";
  if (direction === "down") return "baisse";
  return "neutre";
}

export const SEMANTIC_FILL: Record<BranchSemantic, string> = {
  hausse: "bg-hausse",
  baisse: "bg-baisse",
  neutre: "bg-k-pos",
};

/**
 * La jauge est **ordinale**, pas probabiliste : `likelihood` est une catégorie dans le modèle
 * de données, pas un pourcentage. Trois crans, donc trois tiers — et le libellé écrit à droite
 * plutôt qu'un pourcentage, qu'il faudrait inventer.
 */
export const LIKELIHOOD_FILL: Record<ScenarioLikelihood, string> = {
  central: "w-full",
  moderee: "w-2/3",
  faible: "w-1/3",
};
