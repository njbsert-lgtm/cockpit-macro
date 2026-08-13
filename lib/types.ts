// Modèle de données — reprend tel quel le schéma du cahier des charges (CLAUDE.md).

export type Zone =
  | "us"
  | "ez"
  | "fr"
  | "de"
  | "uk"
  | "es"
  | "it"
  | "jp"
  | "cn"
  | "in"
  | "em"
  | "global";

export type AssetClass = "equity" | "rates" | "commodity" | "fx";

export type Instrument = {
  id: string; // 'spx', 'brent', 'us10y', 'eurusd'
  label: string;
  assetClass: AssetClass;
  zones: Zone[]; // pour le tri contextuel
  unit: "index" | "percent" | "usd" | "ratio";
  ytdBasis: number | null; // clôture du 31 décembre, saisie à la main
  note: string;
};

// Table générique de séries temporelles. Réutilisée telle quelle pour les instruments de
// marché, pour les indicateurs macro (par id d'indicateur) et pour les deux spreads dérivés
// ('spread-us10y-bund10y', 'spread-oat10y-bund10y'), calculés à l'insertion et stockés comme
// des observations à part entière — pas recalculés à l'affichage.
export type Observation = {
  instrumentId: string;
  date: string;
  value: number;
  source: string;
  fetchedAt: string;
};

export type MacroIndicator = {
  id: string; // 'cpi', 'gdp', 'unemployment'
  label: string;
  zone: Zone;
  unit: "percent" | "index" | "level";
  frequency: "monthly" | "quarterly";
  seriesKey: string; // identifiant chez la source, ex. FRED
  nextRelease: string | null;
};

export type TrendStatus = "renforce" | "maintient" | "affaiblit" | "invalidee";

export type Trend = {
  id: string;
  title: string;
  thesis: string;
  zones: Zone[];
  assetClasses: AssetClass[];
  status: TrendStatus;
  statusHistory: Array<{
    date: string;
    status: TrendStatus;
    editionSlug: string;
    why: string;
  }>;
  invalidatedBy: string; // ce qui la ferait tomber
};

export type EditionKind = "hebdo" | "speciale";

// Blocs analytiques obligatoires. Étape 1 : texte brut porté par le seed pour rendre l'écran
// Bulletin avec des données figées. Remplacé par le pipeline MDX à l'étape 2 — ce champ n'est
// pas dans le modèle de données du cahier des charges, qui ne précise pas le stockage des
// blocs ; c'est le minimum nécessaire pour cette étape.
export type EditionBlocks = {
  whatChanged: string;
  whatConfirmed?: string; // hebdo uniquement
  scenarioRevisions: string;
  whatIGotWrong?: string; // hebdo uniquement
  whatIWatch: string;
  specialsRecap?: string; // hebdo uniquement, si des spéciales ont paru dans la semaine
};

export type Edition = {
  slug: string; // '2026-S33' ou '2026-S33-E1'
  kind: EditionKind;
  date: string;
  isoWeek: string; // '2026-S33', identique pour l'hebdo et ses spéciales
  parentWeek: string | null; // pour une spéciale : la hebdo de rattachement
  comparesTo: string | null; // slug de l'édition de référence du bloc « ce qui a changé »
  trigger: string | null; // obligatoire pour une spéciale : le seuil franchi
  regimeStatement: string; // le régime en une phrase, à cette date
  keyIndicators: Array<{ label: string; value: string }>;
  zones: Zone[];
  blocks: EditionBlocks;
  trendRefs: string[]; // tendances de fond touchées
  instrumentRefs: string[]; // instruments cités
  sources: Array<{ label: string; url: string }>;
};

export type AlertTarget =
  | { kind: "instrument"; instrumentId: string }
  | { kind: "spread"; longLegId: string; shortLegId: string };

export type AlertRule = {
  id: string; // 'ndx-3pct', 'oat-bund-30bp'
  label: string;
  target: AlertTarget;
  measure: "percent" | "basisPoints";
  threshold: number; // 3.0 pour 3 %, 30 pour 30 bps
  windowSessions: number; // 2 ou 5
  cooldownSessions: number; // 5 par défaut
  enabled: boolean;
};

export type AlertEvent = {
  ruleId: string;
  firedAt: string;
  direction: "up" | "down"; // écartement ou resserrement, hausse ou baisse
  observed: number; // valeur mesurée, ex. 3.7 ou 42
  fromValue: number;
  toValue: number;
  fromDate: string;
  toDate: string;
  status: "nouveau" | "promu" | "ignore"; // promu = a donné lieu à une édition spéciale
  editionSlug: string | null;
};

export type ScenarioFamilyId = "rates" | "iran" | "ai";
export type ScenarioLikelihood = "central" | "moderee" | "faible";
export type ImpactDirection = "up" | "down" | "flat";

export type ScenarioVersion = {
  familyId: ScenarioFamilyId;
  branchId: string;
  version: number;
  date: string;
  editionSlug: string; // l'édition qui a produit cette révision
  likelihood: ScenarioLikelihood;
  likelihoodChangedFrom: ScenarioLikelihood | null;
  why: string; // obligatoire si la vraisemblance a changé
  thesis: string;
  impacts: Record<
    "eq" | "fi" | "fx" | "cm",
    { direction: ImpactDirection; label: string; text: string }
  >;
  watchSignals: string;
};

export type Seed = {
  instruments: Instrument[];
  observations: Observation[]; // séries des instruments de marché + spreads dérivés
  macroIndicators: MacroIndicator[];
  macroObservations: Observation[]; // séries des indicateurs macro, même forme que Observation
  trends: Trend[];
  editions: Edition[];
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  scenarioVersions: ScenarioVersion[];
};
