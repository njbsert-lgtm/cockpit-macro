import type { RegimeAngle, RegimeProposition, RegimeRetenu } from "@/lib/types";

/**
 * La phrase de régime : trois propositions, une retenue (CLAUDE.md, « Trois règles de
 * rédaction »). Le modèle ne l'écrit jamais ; il en propose trois, d'angles différents.
 */

export const ANGLES_REGIME = ["fait", "mecanisme", "contradiction"] as const satisfies readonly RegimeAngle[];

export const RETENUS_REGIME = [...ANGLES_REGIME, "propre"] as const satisfies readonly RegimeRetenu[];

export const ANGLE_LIBELLE: Record<RegimeAngle, string> = {
  fait: "Le fait dominant",
  mecanisme: "Le mécanisme sous-jacent",
  contradiction: "La contradiction de la semaine",
};

export const RETENU_LIBELLE: Record<RegimeRetenu, string> = {
  ...ANGLE_LIBELLE,
  propre: "Écrite à la main",
};

/**
 * Ce que porte un brouillon tant qu'aucune phrase n'est retenue. Explicite plutôt qu'une des
 * trois propositions mise par défaut : « aucune n'est sélectionnée », et le titre de la carte dans
 * la liste de `/redaction` dit ce qu'il y a à faire. `parseNote` le refuse dans une note publiée.
 */
export const REGIME_A_CHOISIR = "Phrase de régime à choisir — trois propositions dans le portail.";

/** La proposition d'un angle donné, ou `undefined`. */
export function propositionDe(
  propositions: readonly RegimeProposition[] | null | undefined,
  angle: RegimeAngle,
): RegimeProposition | undefined {
  return propositions?.find((p) => p.angle === angle);
}

/** Les trois angles sont-ils tous présents, une fois chacun ? */
export function anglesDistincts(propositions: readonly RegimeProposition[]): boolean {
  return (
    propositions.length === ANGLES_REGIME.length &&
    ANGLES_REGIME.every((a) => propositions.filter((p) => p.angle === a).length === 1)
  );
}
