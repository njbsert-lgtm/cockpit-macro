import type { ScenarioFamilyId } from "./types";

export const FAMILY_LABELS: Record<ScenarioFamilyId, string> = {
  rates: "Taux directeurs",
  iran: "Conflit iranien",
  ai: "Cycle IA",
};

export const FAMILY_ORDER: ScenarioFamilyId[] = ["rates", "iran", "ai"];

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

export const BRANCH_ORDER: Record<ScenarioFamilyId, string[]> = {
  rates: ["rates-hausse", "rates-statu-quo", "rates-baisses"],
  iran: ["iran-fin", "iran-enlisement", "iran-durcissement"],
  ai: ["ai-accelere", "ai-plafonne", "ai-decoit"],
};

export const LIKELIHOOD_LABELS: Record<string, string> = {
  central: "Scénario central",
  moderee: "Probabilité modérée",
  faible: "Probabilité faible",
};

export const IMPACT_LABELS: Record<string, string> = {
  eq: "Actions",
  fi: "Obligations",
  fx: "Devises",
  cm: "Matières premières",
};
