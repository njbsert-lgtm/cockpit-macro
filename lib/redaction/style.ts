import type { BlockName } from "@/lib/note-blocks";

/**
 * Les règles de forme de la rédaction — « un sujet, un paragraphe » (CLAUDE.md, § Trois règles de
 * rédaction). Ce ne sont pas des règles de mise en page : le défaut qu'elles corrigent, un
 * enchaînement de sujets sans compréhension, se loge dans les paragraphes composites et les listes
 * qui juxtaposent sans relier.
 *
 * Deux régimes, et la différence compte :
 * - **une liste dans les blocs 1 à 4 est refusée** à la réception — le modèle est renvoyé à sa
 *   réponse, une seule fois, comme pour toute autre violation du gabarit ;
 * - **un paragraphe trop long ou sans gras d'attaque est signalé**, jamais bloquant : un
 *   avertissement qui n'arrête rien ne doit pas être confondu avec un refus.
 */

/** Les blocs où les listes sont interdites. Le bloc 5 et le fil de la semaine en gardent le droit. */
export const BLOCS_SANS_LISTE: readonly BlockName[] = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
];

/** Les blocs dont chaque paragraphe s'ouvre sur une affirmation en gras. */
export const BLOCS_GRAS_D_ATTAQUE: readonly BlockName[] = ["CeQuiAChange", "CeQuiSestConfirme"];

/**
 * Les blocs dont chaque paragraphe est précédé d'un sous-titre `### …` qui nomme son sujet : un
 * texte long ne se lit pas en un bloc, et le sous-titre permet de sauter au sujet cherché.
 */
export const BLOCS_SOUS_TITRES: readonly BlockName[] = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
];

/** Au-delà de ce nombre de phrases, un paragraphe est presque toujours deux sujets agglomérés. */
export const PHRASES_MAX_PAR_PARAGRAPHE = 6;

export type Signalement = {
  bloc: BlockName;
  code: "paragraphe-long" | "sans-gras-d-attaque" | "sans-sous-titre";
  /** Rang du paragraphe de prose dans le bloc, à partir de 1 — les sous-titres ne comptent pas. */
  paragraphe: number;
  message: string;
};

/** Les paragraphes d'un bloc : séparés par une ligne vide, jamais vides. */
export function paragraphes(texte: string): string[] {
  return texte
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// Une puce (`- `, `* `, `+ `) ou un numéro (`1. `, `2) `) en tête de ligne. `**gras**` n'en est pas
// une : l'astérisque y est suivi d'un autre astérisque, pas d'une espace. Deux chiffres au plus,
// pour ne pas prendre une année en début de ligne pour un numéro.
const LIGNE_DE_LISTE = /^[ \t]*(?:[-*+]|\d{1,2}[.)])[ \t]+\S.*$/m;

/** La première ligne de liste d'un texte, ou `null`. */
export function premiereListe(texte: string): string | null {
  const trouve = LIGNE_DE_LISTE.exec(texte);
  return trouve ? trouve[0].trim() : null;
}

/**
 * Le nombre de phrases d'un paragraphe. Une ponctuation forte suivie d'une espace ou de la fin :
 * « 3.75 % » et « 2,5 % » ne coupent pas. Une abréviation (« M. Powell ») peut sur-compter d'une
 * unité — acceptable, le seuil n'est qu'un signal.
 */
export function compterPhrases(paragraphe: string): number {
  // Les marques de fermeture (gras, guillemets, parenthèse) peuvent suivre la ponctuation :
  // « **Le Brent monte.** Texte » contient bien deux phrases, la première finissant sur `.**`.
  const coupures = paragraphe.match(/[.!?…]+(?:\*\*|__|[)»"”])*(?=\s|$)/g);
  return coupures ? coupures.length : paragraphe.trim().length > 0 ? 1 : 0;
}

/** Ouvre sur une affirmation en gras, d'un seul tenant : `**…**` en tête de paragraphe. */
function ouvreEnGras(paragraphe: string): boolean {
  return /^\*\*[^*\n]+\*\*/.test(paragraphe);
}

/** Un sous-titre de sujet : `### …`, seul niveau de titre admis dans un bloc. */
function estUnSousTitre(paragraphe: string): boolean {
  return /^###\s+\S/.test(paragraphe);
}

/** Un paragraphe qui n'est pas de la prose — composant MDX, titre — n'a pas à s'ouvrir en gras. */
function estDeLaProse(paragraphe: string): boolean {
  return !paragraphe.startsWith("<") && !paragraphe.startsWith("#");
}

/** Les signalements d'un bloc : jamais bloquants. */
export function signalementsDuBloc(bloc: BlockName, texte: string): Signalement[] {
  const signalements: Signalement[] = [];
  const gras = BLOCS_GRAS_D_ATTAQUE.includes(bloc);
  const sousTitres = BLOCS_SOUS_TITRES.includes(bloc);
  const liste = paragraphes(texte);
  let rang = 0;

  for (const [i, p] of liste.entries()) {
    if (!estDeLaProse(p)) continue;
    rang += 1;
    if (sousTitres && !(i > 0 && estUnSousTitre(liste[i - 1]))) {
      signalements.push({
        bloc,
        code: "sans-sous-titre",
        paragraphe: rang,
        message: `Le paragraphe ${rang} n'a pas de sous-titre : nommez son sujet en quelques mots (« ### Le risque souverain français »).`,
      });
    }
    const phrases = compterPhrases(p);
    if (phrases > PHRASES_MAX_PAR_PARAGRAPHE) {
      signalements.push({
        bloc,
        code: "paragraphe-long",
        paragraphe: rang,
        message: `Le paragraphe ${rang} compte ${phrases} phrases : c'est presque toujours deux sujets agglomérés.`,
      });
    }
    if (gras && !ouvreEnGras(p)) {
      signalements.push({
        bloc,
        code: "sans-gras-d-attaque",
        paragraphe: rang,
        message: `Le paragraphe ${rang} ne s'ouvre pas sur une affirmation en gras : si le sujet ne tient pas en une phrase, il y en a deux.`,
      });
    }
  }
  return signalements;
}

/** Tous les signalements d'un ensemble de blocs, dans l'ordre des blocs donnés. */
export function signalementsDesBlocs(blocs: Partial<Record<BlockName, string>>): Signalement[] {
  return (Object.entries(blocs) as Array<[BlockName, string]>).flatMap(([bloc, texte]) =>
    signalementsDuBloc(bloc, texte),
  );
}
