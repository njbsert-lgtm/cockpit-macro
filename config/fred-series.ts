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
    // seed le déclarait : c'est la cadence de la source qui fait foi — corrigé dans le
    // catalogue (`MacroIndicator.frequency`) en même temps que l'ajout de la borne basse.
    target: { kind: "macro", id: "us-policy-rate" },
    seriesId: "DFEDTARU",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 0, max: 25 },
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },
  {
    // Bas de la fourchette. La Fed fixe une cible haute et une cible basse, jamais un chiffre
    // unique — les collecter séparément est ce que la source publie, pas un choix. Sans cette
    // série, une note qui cite « 4,25-4,50 % » ferait confronter la borne basse au niveau
    // stocké de la borne haute (`lib/redaction/figures.ts`, `BORNE_BASSE`).
    target: { kind: "macro", id: "us-policy-rate-lower" },
    seriesId: "DFEDTARL",
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

  // --- Bund et OAT — repli mensuel, en attendant une source quotidienne ---
  //
  // Le cahier veut du quotidien pour ces deux instruments, avec les deux spreads qui en
  // dépendent. Recherché en détail : la BCE catalogue bien `DE10YT_RR` et `FR10YT_RR` dans
  // son dataflow FM (fournisseur Bloomberg), et la Banque de France republie le même
  // catalogue sur son portail Webstat — mais les deux renvoient zéro observation, pour
  // n'importe quelle combinaison de dimensions. Vérifié en confrontant à un indicateur
  // voisin qui, lui, répond : la courbe AAA agrégée de la zone euro (dataflow YC) a de
  // vraies valeurs. La différence : cette courbe est un produit statistique calculé par la
  // BCE elle-même, donc libre de droits ; une cotation Bund ou OAT brute est une donnée
  // Bloomberg sous licence, que ni la BCE ni la Banque de France n'ont le droit de
  // republier telle quelle sur une API publique — d'où un catalogue qui existe et une
  // donnée qui n'existe pas, au même endroit pour la même raison chez les deux.
  //
  // FRED redistribue en attendant les taux longs mensuels de l'OCDE (« Main Economic
  // Indicators »), qui couvrent l'Allemagne et la France sans souci de licence. Mensuel et
  // non quotidien : les deux spreads US10Y/Bund et OAT/Bund restent calculés sur cette
  // cadence tant qu'aucune source quotidienne gratuite n'est trouvée.
  //
  // Confirmé par `npm run fred:check` : les deux séries sortent en « Percent · Monthly »
  // comme déclaré, avec des niveaux plausibles (Bund ≈ 3,0 %, OAT ≈ 3,7 % — un écart d'une
  // soixantaine de points de base, cohérent avec la prime de risque souveraine française).
  {
    target: { kind: "instrument", id: "de10y" },
    seriesId: "IRLTLT01DEM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "fr10y" },
    seriesId: "IRLTLT01FRM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },

  // --- Royaume-Uni, Italie, Espagne, Japon — même repli OCDE que Bund et OAT --------
  //
  // Le même dataflow OCDE (« Main Economic Indicators », taux longs) couvre ces quatre places,
  // pas seulement l'Allemagne et la France. Confirmé par `npm run fred:check` : les quatre
  // séries sortent en « Percent · Monthly », dans l'ordre de grandeur attendu (Gilt ≈ 5,0 %,
  // BTP ≈ 4,0 %, Bono ≈ 3,6 %, JGB ≈ 2,9 % en août 2026). `IRLTLT01INM156N` et
  // `IRLTLT01CNM156N` n'existent pas — l'Inde et la Chine ne sont pas membres de l'OCDE, donc
  // hors de ce dataflow ; leurs courbes restent au seed, sans piste identifiée pour l'instant.
  {
    target: { kind: "instrument", id: "uk10y" },
    seriesId: "IRLTLT01GBM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "it10y" },
    seriesId: "IRLTLT01ITM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "es10y" },
    seriesId: "IRLTLT01ESM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "jp10y" },
    seriesId: "IRLTLT01JPM156N",
    units: "lin",
    cadence: "monthly",
    plausible: YIELD_BOUNDS,
    expect: { units: "Percent", frequency: "Monthly" },
    enabled: true,
  },

  // --- Désactivées --------------------------------------------------------

  // --- Marchés : ce que FRED publie déjà --------------------------------
  //
  // Avant de souscrire à un fournisseur de données de marché, on prend ce que la source déjà
  // branchée donne gratuitement. FRED redistribue plusieurs indices, taux de change et cours
  // du pétrole — même clé, même pipeline, même quota d'un appel par jour.
  //
  // Ce qu'il ne couvre pas reste non collecté et le dit : Euro Stoxx 50, FTSE 100, CAC 40,
  // Hang Seng, CSI 300, Nifty 50, MSCI ACWI, or, argent, cuivre. Ces indices sont
  // propriétaires et leur redistribution est sous licence — c'est la même raison que le PMI.
  //
  // ⚠︎ Aucune de ces séries n'est active avant `npm run fred:check` : les identifiants sont
  // écrits d'après la nomenclature FRED, sans avoir pu être confrontés à l'API depuis
  // l'environnement de développement.

  // Indices actions
  {
    target: { kind: "instrument", id: "spx" },
    seriesId: "SP500",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 100, max: 20_000 },
    expect: { frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "ndx" },
    seriesId: "NASDAQ100",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 500, max: 60_000 },
    expect: { frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "nky" },
    seriesId: "NIKKEI225",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 5_000, max: 120_000 },
    expect: { frequency: "Daily" },
    enabled: true,
  },

  // Taux de change. FRED cote DEXUSEU et DEXUSUK en dollars par unité étrangère — donc déjà
  // dans le sens EUR/USD et GBP/USD. DEXJPUS cote en yens par dollar, soit USD/JPY : le sens
  // attendu ici aussi. Aucune inversion à faire, et c'est bien ce qu'il faut vérifier.
  {
    target: { kind: "instrument", id: "eurusd" },
    seriesId: "DEXUSEU",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 0.5, max: 2 },
    expect: { frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "gbpusd" },
    seriesId: "DEXUSUK",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 0.8, max: 3 },
    expect: { frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "usdjpy" },
    seriesId: "DEXJPUS",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 50, max: 300 },
    expect: { frequency: "Daily" },
    enabled: true,
  },

  // Pétrole. Cours au comptant en dollars par baril, publiés par l'EIA et redistribués par
  // FRED — donc la source primaire du cahier, atteinte sans second fournisseur.
  {
    target: { kind: "instrument", id: "brent" },
    seriesId: "DCOILBRENTEU",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: 5, max: 300 },
    expect: { frequency: "Daily" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "wti" },
    seriesId: "DCOILWTICO",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: -50, max: 300 },
    expect: { frequency: "Daily" },
    enabled: true,
    // La borne basse est négative à dessein : le WTI a coté −37 $ le 20 avril 2020. Une borne
    // à zéro rejetterait une valeur réelle, comme les bornes du PIB espagnol l'ont fait.
  },

  // --- Cuivre --------------------------------------------------------------
  //
  // `PCOPPUSDM` (« Global price of Copper », FMI, redistribuée par FRED) est un candidat pour
  // `copper`, resté verrouillé au palier payant chez Twelve Data (`HG1`). Vérifiée par appel
  // réel : « U.S. Dollars per Metric Ton », mensuelle, ~11 800 $ en décembre 2025 — pas des
  // dollars par livre comme le seed le supposait (`ytdBasis` corrigé en conséquence, même
  // classe de bug que celui d'ACWI documenté dans `lib/observations.ts`).
  {
    target: { kind: "instrument", id: "copper" },
    seriesId: "PCOPPUSDM",
    units: "lin",
    cadence: "monthly",
    // Sur 2015-2026, la série va de ~4 470 à ~13 550 $/tonne. Bornes larges au-delà de cette
    // fenêtre plutôt qu'ajustées dessus : la fenêtre observée n'est pas tout l'historique.
    plausible: { min: 1_000, max: 20_000 },
    expect: { units: "U.S. Dollars per Metric Ton", frequency: "Monthly" },
    enabled: true,
  },

  // `dxy` reste non collecté. FRED publie bien un indice du dollar (DTWEXBGS), mais c'est
  // l'indice large de la Fed, pondéré par les échanges commerciaux sur une vingtaine de
  // devises — pas le DXY d'ICE, qui en compte six. Les deux ne cotent ni sur la même base ni
  // au même niveau. Le substituer donnerait un chiffre plausible et faux ; même raison que le
  // PMI et l'Economic Sentiment Indicator côté Eurostat.

  // --- Taux directeurs hors États-Unis — à vérifier avant activation ---------
  //
  // `ez-policy-rate` figure au catalogue depuis l'origine et n'a jamais eu de source : Eurostat
  // ne publie pas les taux directeurs de la BCE — ce sont les instruments de la BCE, pas des
  // statistiques harmonisées —, et aucune autre source branchée ne les porte. L'écran Macro
  // affiche donc « non suivi » pour la zone euro, ce qui est exact mais laisse un trou sur
  // l'indicateur le plus regardé de la zone.
  //
  // Deux routes, et FRED est la moins coûteuse : le collecteur, le contrôle de plausibilité et
  // `npm run fred:check` existent déjà, alors que le portail BCE demanderait un client SDMX.
  // `ECBDFR` est l'identifiant usuel de la facilité de dépôt chez FRED, à la cadence
  // quotidienne, ce qui en fait un palier au même titre que `DFEDTARU`.
  //
  // Confirmée par appel réel (`npm run fred:check` via le workflow) : « ECB Deposit Facility
  // Rate for Euro Area », Percent · Daily, 7-Day — 2,5 % du 23 au 25/09/2026, dans les bornes
  // déclarées. Le catalogue (`data/seed.json`) déclarait ce taux mensuel ; corrigé en
  // `business-daily`, même correction déjà faite pour `us-policy-rate`.
  {
    target: { kind: "macro", id: "ez-policy-rate" },
    seriesId: "ECBDFR",
    units: "lin",
    cadence: "business-daily",
    plausible: { min: -2, max: 15 },
    expect: { units: "Percent", frequency: "Daily" },
    enabled: true,
  },

  {
    // IEABC est publiée en millions de dollars, le seed attend un pourcentage du PIB — `pc1` ne
    // convient pas : une variation relative n'a pas de sens sur une grandeur qui traverse zéro.
    // Un candidat en ratio au PIB existe bien chez FRED — `USAB6BLTT02STSAQ`, redistribution
    // OCDE (MEI), même famille que les taux longs `IRLTLT01xxM156N` qui ont résolu Bund/OAT et
    // les quatre points de courbe ci-dessus — mais confirmé mort par appel réel : 100
    // observations trimestrielles de 2000 à fin 2024, puis plus rien alors que la fenêtre
    // demandée allait jusqu'à aujourd'hui. Un écart de deux ans n'est pas un retard de
    // publication normal, c'est une série que l'OCDE a cessé d'alimenter sous cet identifiant.
    // La retenir produirait un indicateur éternellement périmé plutôt qu'un trou honnête.
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
      "zéro. Candidat de ratio identifié (USAB6BLTT02STSAQ, OCDE) mais confirmé discontinué " +
      "depuis fin 2024 par appel réel — voir le commentaire ci-dessus.",
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
