import type { DriverInput } from "@/lib/types";

/**
 * Les drivers — les incertitudes actives qui font bouger le marché en ce moment. Un driver
 * pose une question, bifurque en trois branches, et pilote des instruments. À ne pas
 * confondre avec une tendance de fond, qui est une direction déjà établie sur des années.
 *
 * On ne saisit ici que ce qui est irréductiblement un jugement. `dominantBranchId`,
 * `intensityRank`, `lastRevisedAt` et `lastRevisedIn` sont dérivés des éditions et des
 * scénarios par `lib/drivers.ts` : les redemander ici, c'est garantir qu'ils divergeront.
 *
 * Un driver retiré n'est jamais supprimé — sa page reste accessible, seule sa carte
 * disparaît de l'en-tête. L'archive n'a de valeur que si elle est continue.
 */
export const DRIVERS: DriverInput[] = [
  {
    id: "rates",
    label: "Taux directeurs",
    question: "La Fed reprend-elle son cycle de hausse ?",
    // Le 10 ans US porte la fonction de réaction ; le spread transatlantique et l'EUR/USD en
    // sont la traduction directe en devises et en flux de capitaux.
    instrumentRefs: ["us10y", "spread-us10y-bund10y", "eurusd", "dxy"],
    trendRefs: ["desinflation-terminee", "japon-anomalie", "capex-ia-benefices"],
    zones: ["us", "ez", "global"],
    retiredAt: null,
  },
  {
    id: "iran",
    label: "Conflit iranien",
    question: "Ormuz rouvre-t-il ?",
    // La variable maîtresse : elle entre dans le modèle avant toutes les autres.
    instrumentRefs: ["brent", "wti", "gold"],
    trendRefs: ["prime-risque-permanente", "desinflation-terminee"],
    zones: ["global", "ez", "jp", "in"],
    retiredAt: null,
  },
  {
    id: "ai",
    label: "Cycle IA",
    question: "Les profits justifient-ils le capex ?",
    // Le cuivre plutôt que la puce : le goulet d'étranglement de l'IA est le mégawatt.
    instrumentRefs: ["ndx", "spx", "copper"],
    trendRefs: ["capex-ia-benefices", "recomposition-flux-hors-chine"],
    zones: ["us", "global"],
    retiredAt: null,
  },
];
