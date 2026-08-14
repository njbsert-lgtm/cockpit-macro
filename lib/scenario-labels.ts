// Le libellé et la question d'un driver vivent dans `content/drivers.ts` : ce sont du
// contenu. Ne restent ici que les libellés d'affichage des branches et des vraisemblances,
// qui appartiennent au vocabulaire de l'interface.

export const BRANCH_LABELS: Record<string, string> = {
  "rates-hausse": "Hausse",
  "rates-statu-quo": "Statu quo prolongé",
  "rates-baisses": "Retour aux baisses",
  "iran-fin": "La guerre se termine",
  "iran-enlisement": "La guerre dure",
  "iran-durcissement": "La guerre se durcit",
  "ai-accelere": "Profits et capex accélèrent",
  "ai-plafonne": "Profits tiennent, capex plafonne",
  "ai-decoit": "Profits déçoivent",
};

/**
 * Ordre d'affichage des branches d'un driver, de la plus favorable aux actifs à la plus
 * adverse. Ce n'est pas l'ordre de vraisemblance : c'est un axe de lecture stable, pour que
 * la position d'une branche veuille toujours dire la même chose d'un driver à l'autre.
 */
export const BRANCH_ORDER: Record<string, string[]> = {
  rates: ["rates-baisses", "rates-statu-quo", "rates-hausse"],
  iran: ["iran-fin", "iran-enlisement", "iran-durcissement"],
  ai: ["ai-accelere", "ai-plafonne", "ai-decoit"],
};

export const LIKELIHOOD_LABELS: Record<string, string> = {
  central: "Scénario central",
  moderee: "Probabilité modérée",
  faible: "Probabilité faible",
};

/** Forme courte pour les axes, où « vraisemblance » est déjà donné par le contexte. */
export const LIKELIHOOD_SHORT: Record<string, string> = {
  central: "Centrale",
  moderee: "Modérée",
  faible: "Faible",
};

export const IMPACT_LABELS: Record<string, string> = {
  eq: "Actions",
  fi: "Obligations",
  fx: "Devises",
  cm: "Matières premières",
};
