/**
 * Les deux spreads du cahier — instruments dérivés, jamais collectés directement auprès d'une
 * source externe. Chacun est la différence entre deux courbes souveraines déjà collectées par
 * ailleurs (`config/fred-series.ts`), calculée à l'insertion et stockée comme une `Observation`
 * à part entière : c'est ce qui permet de la grapher et d'un jour l'alerter avec le même code
 * qu'un instrument simple.
 *
 * `longLegId - shortLegId`, dans le sens du libellé : « US 10 ans − Bund 10 ans » est
 * `us10y - de10y`, jamais l'inverse. Bund (`de10y`) est la jambe commune aux deux spreads, et la
 * plus lente des trois : les trois jambes viennent de FRED, mais `de10y` et `fr10y` sur le repli
 * mensuel OCDE quand `us10y` est quotidien — voir le commentaire sur Bund et OAT dans
 * `config/fred-series.ts` pour la raison (licence Bloomberg).
 */
export type SpreadDefinition = {
  target: { kind: "instrument"; id: string };
  longLegId: string;
  shortLegId: string;
};

export const SPREAD_DEFINITIONS: SpreadDefinition[] = [
  {
    target: { kind: "instrument", id: "spread-us10y-bund10y" },
    longLegId: "us10y",
    shortLegId: "de10y",
  },
  {
    target: { kind: "instrument", id: "spread-oat10y-bund10y" },
    longLegId: "fr10y",
    shortLegId: "de10y",
  },
];

export const SPREAD_SOURCE = "Calculé (FRED)";

export function spreadDefinitionFor(id: string): SpreadDefinition | null {
  return SPREAD_DEFINITIONS.find((d) => d.target.id === id) ?? null;
}
