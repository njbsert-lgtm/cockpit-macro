import type { Zone } from "./types";

/**
 * Relie un chiffre clé d'une note (« Fed funds », « BCE — facilité de dépôt ») à l'indicateur
 * macro du même nom, pour que le chiffre ouvre sa fiche dans l'onglet Macro.
 *
 * Le libellé d'un chiffre clé est écrit à la main ou par le modèle, sans identifiant : on le lit
 * donc par mots reconnus, sur la **zone** puis sur la **métrique**. La détection est
 * volontairement étroite — un libellé qui ne nomme pas les deux, ou qui désigne un indicateur que
 * le catalogue n'a pas, ne devient pas un lien : un lien menant ailleurs que ce que dit le chiffre
 * serait pire qu'un chiffre sans lien. Un `indicatorId` explicite dans le frontmatter prévaut
 * toujours (voir `resoudreIndicateurCle`).
 */

const ZONES_PAR_MOT: Array<[RegExp, Zone]> = [
  [/\b(fed|fomc|etats-unis|états-unis|us|usa|americain|américain)\b/, "us"],
  [/\b(bce|ecb|zone euro|eurozone|ez)\b/, "ez"],
  [/\b(boj|japon)\b/, "jp"],
  [/\b(boe|royaume-uni|uk|bank rate)\b/, "uk"],
  [/\b(pboc|lpr|chine)\b/, "cn"],
  [/\b(rbi|inde)\b/, "in"],
  [/\bfrance\b/, "fr"],
  [/\ballemagne\b/, "de"],
  [/\bespagne\b/, "es"],
  [/\bitalie\b/, "it"],
];

// L'ordre compte : « sous-jacente » avant « inflation », sans quoi le total l'emporterait.
const METRIQUES_PAR_MOT: Array<[RegExp, string]> = [
  [/(sous-jacent|core)/, "cpi-core"],
  [/(inflation|ipc|ipch|cpi)/, "cpi"],
  [/(taux directeur|fed funds|facilit[eé] de d[eé]p[oô]t|taux de d[eé]p[oô]t|bank rate|repo|\blpr\b)/, "policy-rate"],
  [/(ch[oô]mage)/, "unemployment"],
  [/(\bpib\b|croissance)/, "gdp"],
];

function normaliser(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ");
}

/**
 * L'identifiant d'indicateur désigné par un libellé, ou null. `existe` confronte la candidate au
 * catalogue : aucune route n'est jamais fabriquée pour un indicateur inconnu.
 */
export function indicateurDepuisLibelle(
  label: string,
  existe: (id: string) => boolean,
): string | null {
  const texte = normaliser(label);
  const zone = ZONES_PAR_MOT.find(([re]) => re.test(texte))?.[1];
  const metrique = METRIQUES_PAR_MOT.find(([re]) => re.test(texte))?.[1];
  if (!zone || !metrique) return null;
  const id = `${zone}-${metrique}`;
  return existe(id) ? id : null;
}

/** Explicite d'abord (s'il existe au catalogue), sinon lu dans le libellé. */
export function resoudreIndicateurCle(
  chiffre: { label: string; indicatorId?: string },
  existe: (id: string) => boolean,
): string | null {
  if (chiffre.indicatorId && existe(chiffre.indicatorId)) return chiffre.indicatorId;
  return indicateurDepuisLibelle(chiffre.label, existe);
}
