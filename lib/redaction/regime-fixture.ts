import type { RegimeProposition } from "@/lib/types";

/** Les trois phrases de régime des tests : trois angles, trois façons de trancher. */
export const REGIMES_TEST: RegimeProposition[] = [
  { texte: "Le choc d'offre devient un choc de prix politique.", angle: "fait", justification: "Ce qui s'est passé de plus marquant." },
  { texte: "Le coût de l'énergie remonte dans l'inflation sous-jacente.", angle: "mecanisme", justification: "Le chemin vers les prix." },
  { texte: "Les marchés actions ignorent ce que les taux disent.", angle: "contradiction", justification: "Ce qui ne colle pas." },
];
