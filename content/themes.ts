import type { ThemeObserve } from "@/lib/types";

/**
 * Les thèmes sous observation — de l'analyse versionnée, comme les notes et les tendances.
 *
 * **Vide tant qu'aucun thème n'a été réellement proposé et accepté** : aucun exemple n'est inventé.
 *
 * Deux sources, jamais mélangées dans un même fichier :
 * - `generated/themes.generated.ts` reçoit les thèmes **acceptés dans `/redaction`**, réécrit à
 *   chaque publication. Le modèle les propose, il ne les crée jamais seul.
 * - ce fichier porte ce que l'humain pose à la main, et que la publication ne doit pas écraser :
 *   des thèmes entiers (`THEMES_MANUELS`) et des **ajustements** posés par-dessus un thème généré
 *   (`AJUSTEMENTS_THEMES`) — le jour où le dernier témoin est devenu collecté, ou un verdict.
 */
export const THEMES_MANUELS: ThemeObserve[] = [];

/**
 * Ce que l'humain ajoute à un thème par son identifiant : le début de l'observation, un statut
 * terminal et son verdict. Rien d'autre ne s'ajuste — la thèse, les témoins et les seuils sont ce
 * qui a été accepté.
 */
export type AjustementTheme = Partial<
  Pick<ThemeObserve, "debutObservation" | "statut" | "verdictLe" | "verdictPar">
>;

export const AJUSTEMENTS_THEMES: Record<string, AjustementTheme> = {};
