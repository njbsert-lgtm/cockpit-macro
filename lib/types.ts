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

/**
 * Ce qu'on saisit à la main pour un driver. Les quatre champs restants du type `Driver`
 * (`intensityRank`, `dominantBranchId`, `lastRevisedAt`, `lastRevisedIn`) existent déjà
 * ailleurs dans le contenu : les redemander à l'auteur, c'est garantir qu'ils divergeront à
 * la première note publiée sans mise à jour. Ils sont donc dérivés — voir `lib/drivers.ts`.
 */
export type DriverInput = {
  id: string; // 'rates' | 'iran' | 'ai' — extensible : de nouveaux drivers apparaîtront
  label: string; // 'Taux directeurs'
  question: string; // 'La Fed reprend-elle son cycle de hausse ?'
  instrumentRefs: string[]; // les instruments qu'il pilote
  trendRefs: string[]; // les tendances qu'il alimente OU pourrait invalider
  zones: Zone[];
  retiredAt: string | null; // un driver peut cesser d'en être un ; on ne le supprime pas
};

/**
 * Un driver est une **incertitude active** qui bifurque en trois branches — à ne pas
 * confondre avec une tendance de fond, qui est une direction déjà établie. C'est le point
 * d'entrée de la navigation des Notes.
 */
export type Driver = DriverInput & {
  dominantBranchId: string; // dérivé : la branche dont la version courante est 'central'
  intensityRank: number; // dérivé : position dans le driverOrder de la dernière note
  lastRevisedAt: string; // dérivé : date de sa ScenarioVersion la plus récente
  lastRevisedIn: string; // dérivé : slug de la note qui a produit cette révision
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
    noteSlug: string;
    why: string;
  }>;
  driverRefs: string[]; // les drivers qui pourraient la faire tomber
  invalidatedBy: string; // ce qui la ferait tomber, en clair
};

export type NoteKind = "hebdo" | "speciale";

/**
 * Métadonnées d'une note — le frontmatter de son fichier MDX. Les blocs analytiques ne
 * figurent pas ici : ils vivent dans le corps du MDX (`content/notes/<slug>.mdx`) sous
 * forme de composants nommés, et leur présence est validée par `lib/notes.ts` selon le
 * type de note. `isoWeek` et `parentWeek` sont dérivés du slug, pas saisis à la main.
 */
export type Note = {
  slug: string; // '2026-S33' ou '2026-S33-E1'
  kind: NoteKind;
  date: string;
  isoWeek: string; // '2026-S33', identique pour l'hebdo et ses spéciales
  parentWeek: string | null; // pour une spéciale : la hebdo de rattachement
  comparesTo: string | null; // slug de la note de référence du bloc « ce qui a changé »
  trigger: string | null; // obligatoire pour une spéciale : le seuil franchi
  regimeStatement: string; // le régime en une phrase, à cette date
  keyIndicators: Array<{ label: string; value: string }>;
  zones: Zone[];
  driverOrder: string[]; // ordre d'intensité des drivers à cette date, jugement manuel
  trendRefs: string[]; // tendances de fond touchées
  instrumentRefs: string[]; // instruments cités
  veilleItemRefs: string[]; // items de veille cités comme pièces à conviction, ou dans « Le fil de la semaine »
  sources: Array<{ label: string; url: string }>;
};

/**
 * La grille des cinq canaux de transmission (cahier des charges, § Veille) : la clé qui rend
 * un item exploitable même sans jugement humain — un mot-clé de canal peut suffire à le faire
 * survivre à la passe 1, au même titre qu'un mot-clé de driver.
 */
export type VeilleChannel =
  | "taux-reel"
  | "nature-choc"
  | "fonction-reaction"
  | "dollar"
  | "positionnement";

export type VeilleStatus = "nouveau" | "verse" | "archive" | "ignore";

/**
 * Un item de veille — lien et métadonnées, jamais le texte intégral (droit d'auteur, cahier
 * des charges). Vit en base : c'est de la donnée automatique, quotidienne, pas de l'analyse
 * versionnée. `driverRefs`/`channels` sont posés par la passe 1, déterministe — un mot-clé
 * reconnu, pas un jugement. `isSignal` vaut `true` pour tout item qui a survécu à la passe 1 ;
 * c'est un point d'extension pour la passe 2 (classification par l'API Claude), pas encore
 * construite.
 */
export type VeilleItem = {
  id: string; // hash stable de (source + url) — l'upsert le rend idempotent
  title: string;
  url: string;
  source: string; // 'GDELT' | 'Fed' | 'SEC EDGAR' | ...
  publishedAt: string;
  zones: Zone[];
  driverRefs: string[];
  channels: VeilleChannel[];
  isSignal: boolean;
  status: VeilleStatus;
  attachedToBlock: string | null; // BlockName de lib/notes.ts — pas importé ici pour éviter un cycle
  draftNoteSlug: string | null; // la note en préparation à laquelle l'item est promis
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
  status: "nouveau" | "promu" | "ignore"; // promu = a donné lieu à une note spéciale
  noteSlug: string | null;
};

export type ScenarioLikelihood = "central" | "moderee" | "faible";
export type ImpactDirection = "up" | "down" | "flat";

/**
 * Un scénario n'existe jamais seul : il est toujours la réponse à la question d'un driver.
 * D'où `driverId`, qui « référence un Driver, jamais une chaîne libre ».
 */
export type ScenarioVersion = {
  driverId: string;
  branchId: string;
  version: number;
  date: string;
  noteSlug: string; // la note qui a produit cette révision
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

/**
 * `seed.json` ne porte que des **données** : ce qui viendra d'APIs publiques à l'étape 3.
 * L'analyse — notes, tendances, scénarios — vit dans `content/`, versionnée dans le repo,
 * pour rester lisible même si l'automatisation des données casse.
 *
 * `alertRules` restera ici jusqu'à l'étape 4, qui les sortira dans un fichier de configuration
 * éditable comme le prévoit le cahier des charges.
 */
export type Seed = {
  instruments: Instrument[];
  observations: Observation[]; // séries des instruments de marché + spreads dérivés
  macroIndicators: MacroIndicator[];
  macroObservations: Observation[]; // séries des indicateurs macro, même forme que Observation
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
};
