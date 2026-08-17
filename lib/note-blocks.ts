import type { NoteKind } from "./types";

/**
 * Le vocabulaire des blocs analytiques, **sans accès disque** : `lib/notes.ts` lit le corpus
 * avec `node:fs` et ne peut donc pas être importé par un composant client. L'archive dépliante
 * a besoin des intitulés et de la liste des blocs obligatoires ; ils vivent ici.
 *
 * Les blocs sont des composants nommés dans le corps MDX, pas des titres markdown : un titre
 * mal orthographié disparaît en silence, un composant inconnu est rejeté à la validation.
 */
export const BLOCK_NAMES = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
  "CeQueJeSurveille",
  "RecapDesSpeciales",
  "LeFilDeLaSemaine",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

export const BLOCK_TITLES: Record<BlockName, string> = {
  CeQuiAChange: "Ce qui a changé",
  CeQuiSestConfirme: "Ce qui s'est confirmé",
  RevisionDesScenarios: "Révision des scénarios",
  CeQueJavaisMalLu: "Ce que j'avais mal lu",
  CeQueJeSurveille: "Ce que je surveille",
  RecapDesSpeciales: "Ce que les spéciales de la semaine ont établi",
  LeFilDeLaSemaine: "Le fil de la semaine",
};

/**
 * Les blocs de jugement : cinq pour une hebdo, trois pour une spéciale. Ni `RecapDesSpeciales`
 * ni `LeFilDeLaSemaine` n'en font partie — ce sont des compléments, pas des jugements.
 *
 * Exporté aussi pour `/triage` : « un item versé s'attache à l'un des cinq blocs analytiques ».
 */
export const REQUIRED_BLOCKS: Record<NoteKind, BlockName[]> = {
  hebdo: [
    "CeQuiAChange",
    "CeQuiSestConfirme",
    "RevisionDesScenarios",
    "CeQueJavaisMalLu",
    "CeQueJeSurveille",
  ],
  speciale: ["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"],
};
