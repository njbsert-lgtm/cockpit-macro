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

/**
 * La frontière du régime des guets, en semaine ISO.
 *
 * Avant : le bloc 5 est de la prose, et le reste indéfiniment. Les notes du corpus de
 * développement ne sont pas rétro-remplies — reconstituer aujourd'hui les paris prospectifs
 * de juin reviendrait à les écrire avec le résultat sous les yeux, et leur `statut` serait
 * de la rétrospection déguisée en suivi. C'est exactement la donnée fabriquée que le cahier
 * interdit.
 *
 * À partir d'ici : `guets` est obligatoire, et une note qui l'omet ne compile pas. Sans cette
 * borne, `guets` serait facultatif pour toujours et le dispositif pourrait s'éteindre en
 * silence — une note partirait sans guets, la validation passerait sans broncher.
 *
 * Même forme que la bascule seed → collecte : une frontière écrite plutôt que devinée.
 *
 * Échafaudage temporaire. À la remise à zéro du corpus (étape 6 du cahier), les notes de
 * développement disparaissent, il n'y a plus de prose héritée, et cette constante s'en va
 * avec elles : `guets` devient simplement obligatoire, sans exception.
 */
export const GUETS_REQUIS_A_PARTIR_DE = "2026-S36";
