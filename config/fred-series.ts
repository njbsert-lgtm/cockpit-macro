/**
 * Table de correspondance entre nos identifiants et les séries FRED.
 *
 * Fichier de configuration, édité à la main, séparé du code de collecte. En TypeScript
 * plutôt qu'en JSON pour trois raisons : les identifiants sont vérifiés à la compilation,
 * un test confirme que chaque `target.id` existe dans le catalogue du seed, et les
 * commentaires expliquant *pourquoi* une série est désactivée survivent aux relectures.
 *
 * Rien ne passe en `enabled: true` sans être passé par `npm run fred:check`, qui interroge
 * les métadonnées FRED et refuse une série dont l'unité ou la fréquence ne correspond pas à
 * ce qui est déclaré ici.
 */

import { STALENESS_TOLERANCE, type Cadence } from "./cadence";

/** La cadence vit dans `config/cadence.ts` : elle ne dépend pas de la source. */
export type FredCadence = Cadence;
export { STALENESS_TOLERANCE };

/**
 * `lin` : la série telle que FRED la publie.
 * `pc1` : variation sur un an, en pourcentage, calculée par FRED. C'est ce qui transforme un
 * indice de prix (CPIAUCSL ≈ 320) en taux d'inflation (3,4 %) — sans appel supplémentaire,
 * la transformation étant un paramètre de la requête. Un appel par série et par jour, comme
 * l'exige le cahier des charges.
 */
export type FredUnits = "lin" | "pc1";

export type FredMapping = {
  target: { kind: "instrument"; id: string } | { kind: "macro"; id: string };
  seriesId: string;
  units: FredUnits;
  cadence: FredCadence;
  /**
   * Bornes de plausibilité, en unité finale. Une valeur en dehors fait rejeter **toute la
   * réponse**, pas seulement le point fautif : si l'unité n'est pas celle qu'on croit, ce
   * n'est pas une observation qui est fausse, c'est la série entière. Mieux vaut garder la
   * dernière valeur valide et journaliser que stocker un indice là où on attend un taux.
   */
  plausible: { min: number; max: number };
  /** Ce que `npm run fred:check` doit retrouver dans les métadonnées, en sous-chaîne. */
  expect: { units?: string; frequency?: string };
  enabled: boolean;
  /** Pourquoi cette série est désactivée. Obligatoire quand `enabled` est faux. */
  disabledReason?: string;
};

/** Profondeur d'historique demandée à FRED, par cadence. */
export const LOOKBACK_DAYS: Record<FredCadence, number> = {
  "business-daily": 400,
  monthly: 1200,
  quarterly: 3650,
  annual: 7300,
};

const YIELD_BOUNDS = { min: -5, max: 25 };

export const FRED_SERIES: FredMapping[] = [
  // --- Courbe des taux souverains US -------------------------------------
  // Taux constants du Trésor, quotidiens en jours ouvrés, déjà en pourcentage.
  // Il n'y a pas de point à 15 ans : le Trésor ne cote pas cette maturité.
  {
    target: { kind: "instrument", id: "us6m" },
    seriesId: "DGS6MO",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "us1y" },
    seriesId: "DGS1",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "us3y" },
    seriesId: "DGS3",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "us5y" },
    seriesId: "DGS5",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "us10y" },
    seriesId: "DGS10",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "us20y" },
    seriesId: "DGS20",
    units: "lin",
    cadence: "business-daily",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },

  // --- Inflation ----------------------------------------------------------
  // FRED publie un indice base 1982-84 ; `pc1` en fait le glissement annuel.
  {
    target: { kind: "macro", id: "us-cpi" },
    seriesId: "CPIAUCSL",
    units: "pc1",
    cadence: "monthly",
    plausible: { min: -20, max: 50 },
    expect: { units: "Index 1982-1984=100", frequency: "Monthly" },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "us-cpi-core" },
    seriesId: "CPILFESL",
    units: "pc1",
    cadence: "monthly",
    plausible: { min: -20, max: 50 },
    expect: { units: "Index 1982-1984=100", frequency: "Monthly" },
    enabled: true,
  },

  // --- Emploi et salaires -------------------------------------------------
  {
    target: { kind: "macro", id: "us-unemployment" },
    seriesId: "UNRATE",
    units: "lin",
    cadence: "monthly",
    plausible: { min: 0, max: 40 },
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },
  {
    // Salaire horaire moyen du privé, publié en dollars par heure ; `pc1` en fait la
    // progression annuelle en pourcentage, ce que le seed déclare.
    target: { kind: "macro", id: "us-wages" },
    seriesId: "CES0500000003",
    units: "pc1",
    cadence: "monthly",
    plausible: { min: -30, max: 50 },
    expect: { units: "Dollars per Hour", frequency: "Monthly" },
    enabled: true,
  },

  // --- Politique monétaire ------------------------------------------------
  {
    // Haut de la fourchette des Fed funds. Quotidienne chez FRED, pas mensuelle comme le
    // seed le déclarait : c'est la cadence de la source qui fait foi.
    target: { kind: "macro", id: "us-policy-rate" },
    seriesId: "DFEDTARU",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 0, max: 25 },
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },

  // --- Comptes publics et activité ----------------------------------------
  {
    target: { kind: "macro", id: "us-gdp" },
    seriesId: "A191RL1Q225SBEA",
    units: "lin",
    cadence: "quarterly",
    // Le deuxième trimestre 2020 est sorti à −31 % et le troisième à +33 % : des bornes
    // serrées rejetteraient un choc réel.
    plausible: { min: -50, max: 50 },
    expect: { units: "Percent Change", frequency: "Quarterly" },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "us-debt-gdp" },
    seriesId: "GFDEGDQ188S",
    units: "lin",
    cadence: "quarterly",
    plausible: { min: 0, max: 400 },
    expect: { units: "Percent of GDP", frequency: "Quarterly" },
    enabled: true,
  },
  {
    // Annuelle chez FRED, pas trimestrielle comme le seed le déclarait.
    target: { kind: "macro", id: "us-budget-balance" },
    seriesId: "FYFSGDA188S",
    units: "lin",
    cadence: "annual",
    plausible: { min: -50, max: 20 },
    expect: { units: "Percent of GDP", frequency: "Annual" },
    enabled: true,
  },

  // --- Désactivées --------------------------------------------------------
  {
    target: { kind: "macro", id: "us-current-account" },
    seriesId: "IEABC",
    units: "lin",
    cadence: "quarterly",
    plausible: { min: -100, max: 100 },
    expect: { frequency: "Quarterly" },
    enabled: false,
    disabledReason:
      "Publiée en millions de dollars, le seed attend un pourcentage du PIB. `pc1` ne " +
      "convient pas : une variation relative n'a pas de sens sur une grandeur qui traverse " +
      "zéro. Il faudrait une série de ratio au PIB, à identifier.",
  },
  {
    target: { kind: "macro", id: "us-pmi" },
    seriesId: "USPMI",
    units: "lin",
    cadence: "monthly",
    plausible: { min: 0, max: 100 },
    expect: { frequency: "Monthly" },
    enabled: false,
    disabledReason:
      "L'ISM a fait retirer ses indices de FRED pour des raisons de licence. L'existence " +
      "de ce code n'est pas confirmée — `npm run fred:check` tranchera.",
  },
];

export const ENABLED_SERIES = FRED_SERIES.filter((s) => s.enabled);

/** Le mapping qui alimente cet instrument, s'il est actif. */
export function mappingForInstrument(instrumentId: string): FredMapping | null {
  return (
    ENABLED_SERIES.find(
      (s) => s.target.kind === "instrument" && s.target.id === instrumentId,
    ) ?? null
  );
}

/** Le mapping qui alimente cet indicateur macro, s'il est actif. */
export function mappingForMacro(indicatorId: string): FredMapping | null {
  return (
    ENABLED_SERIES.find((s) => s.target.kind === "macro" && s.target.id === indicatorId) ?? null
  );
}
