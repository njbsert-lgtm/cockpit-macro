import type { ThemeObserve } from "@/lib/types";
import { AJUSTEMENTS_THEMES, THEMES_MANUELS, type AjustementTheme } from "@/content/themes";
import { GENERATED_THEMES } from "@/content/generated/themes.generated";

/**
 * Les thèmes tels que l'application les lit : les thèmes manuels, puis les thèmes générés, chacun
 * recevant son ajustement éventuel. Aucune validation ici — elle vit dans `lib/themes.ts` et se
 * rejoue dans les tests : un thème fautif ne doit jamais faire lever le chargement du module et
 * mettre le site entier à terre, exactement le risque que court un brouillon déposé dans le corpus.
 */
export function assemblerThemes(
  manuels: readonly ThemeObserve[],
  generes: readonly ThemeObserve[],
  ajustements: Readonly<Record<string, AjustementTheme>>,
): ThemeObserve[] {
  // Un identifiant déjà présent côté manuel l'emporte : un thème écrit à la main ne se fait pas
  // doubler par un thème généré du même nom.
  const connus = new Set(manuels.map((t) => t.id));
  const tous = [...manuels, ...generes.filter((t) => !connus.has(t.id))];
  return tous.map((t) => ({ ...t, ...(ajustements[t.id] ?? {}) }));
}

export function getThemes(): ThemeObserve[] {
  return assemblerThemes(THEMES_MANUELS, GENERATED_THEMES, AJUSTEMENTS_THEMES);
}
