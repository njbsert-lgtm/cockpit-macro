import type { Cadence } from "./cadence";
import type { Zone } from "@/lib/types";

/**
 * Table de correspondance entre nos identifiants et les séries Eurostat.
 *
 * Même rôle que `config/fred-series.ts`, avec une difficulté propre à Eurostat : ses séries
 * sont **multidimensionnelles**. Un même dataset sert des dizaines de séries qui ne diffèrent
 * que par une unité, un ajustement saisonnier ou un périmètre de nomenclature. Une dimension
 * mal choisie ne produit pas une erreur : elle produit un chiffre plausible et faux.
 *
 * D'où la règle de ce fichier : **toutes les dimensions sont écrites ici, aucune dans le
 * code**. `lib/eurostat.ts` se contente de sérialiser `dimensions` dans l'URL, sans jamais
 * savoir ce qu'est un `coicop` ou un `s_adj`.
 *
 * Deuxième garde-fou, dans le client celui-là : si la réponse contient plus d'une valeur par
 * période — donc si une dimension a été oubliée et reste ouverte —, toute la réponse est
 * rejetée. Une dimension non fixée ne peut pas passer inaperçue.
 *
 * Tous les codes ci-dessous ont été confrontés à la nomenclature réelle de leur dataset avec
 * `npm run eurostat:explore`, puis les vingt séries sont sorties vertes de
 * `npm run eurostat:check`. Toute correction ultérieure passe par la même porte : on lit ce que
 * la source publie, on ne devine pas un code.
 */

export type EurostatMapping = {
  target: { kind: "macro"; id: string };
  /** Le dataset Eurostat, ex. `prc_hicp_manr`. */
  dataset: string;
  /**
   * Toutes les dimensions autres que le temps, fixées explicitement. Sérialisées telles quelles
   * dans la requête ; le client n'en interprète aucune.
   */
  dimensions: Record<string, string>;
  cadence: Cadence;
  zone: Zone;
  /**
   * Bornes de plausibilité, en unité finale. Une valeur en dehors fait rejeter **toute la
   * réponse**, pas seulement le point fautif : si l'unité n'est pas celle qu'on croit, ce
   * n'est pas une observation qui est fausse, c'est la série entière.
   */
  plausible: { min: number; max: number };
  /** Ce que `npm run eurostat:check` doit retrouver, pour confirmer qu'on lit la bonne série. */
  expect: { unitLabel?: string; frequency?: string };
  enabled: boolean;
  /** Pourquoi cette série est désactivée. Obligatoire quand `enabled` est faux. */
  disabledReason?: string;
};

/** Profondeur d'historique demandée, en nombre de périodes — Eurostat compte en périodes. */
export const LOOKBACK_PERIODS: Record<Cadence, number> = {
  "business-daily": 400,
  monthly: 60,
  quarterly: 28,
  annual: 15,
};

export const EUROSTAT_SOURCE = "Eurostat";

/**
 * Les zones couvertes. `EA` désigne la zone euro **à composition évolutive** : à chaque date,
 * le bloc tel qu'il était alors. C'est ce qui correspond au chiffre publié à l'époque, au prix
 * d'un périmètre qui change en cours de série — choix assumé plutôt qu'un agrégat figé, dont
 * la composition est fixe et les points antérieurs recalculés.
 *
 * Mais tous les datasets ne publient pas `EA`, et c'est la source qui tranche, pas nous : le
 * code de la zone euro est donc déclaré par dataset, pas une fois pour toutes. Voir
 * `EURO_AREA_GEO` plus bas. Les codes pays, eux, sont les mêmes partout.
 */
const GEO: Record<string, Zone> = { EA: "ez", FR: "fr", DE: "de", ES: "es", IT: "it" };

/**
 * Le code de la zone euro, par dataset — vérifié série par série avec
 * `npm run eurostat:explore -- <dataset> geo`.
 *
 * `une_rt_m` ne publie pas `EA` : sa seule zone euro est `EA21`, à composition figée (les 21
 * pays de 2026, historique recalculé). Le taux de chômage de la zone euro est donc sur un
 * périmètre différent de son inflation et de son PIB. C'est une entorse à l'homogénéité, mais
 * l'alternative serait de fabriquer un agrégat que la source ne publie pas.
 */
const EURO_AREA_GEO: Record<string, string> = {
  prc_hicp_minr: "EA",
  namq_10_gdp: "EA",
  une_rt_m: "EA21",
  teina205: "EA21",
  teina230: "EA21",
  bop_gdp6_q: "EA21",
};

/** Traduit notre code de zone en code Eurostat pour un dataset donné. */
function geoFor(geo: string, dataset: string): string {
  return geo === "EA" ? (EURO_AREA_GEO[dataset] ?? "EA") : geo;
}

const INFLATION_BOUNDS = { min: -5, max: 25 };
// Élargies après le premier contrôle à blanc : l'Espagne a fait −21,5 % au deuxième trimestre
// 2020, une valeur parfaitement réelle que des bornes à ±20 rejetaient. Les bornes servent à
// attraper une erreur d'unité, pas à censurer un choc — c'est la source qui a raison.
const GDP_BOUNDS = { min: -35, max: 35 };
const UNEMPLOYMENT_BOUNDS = { min: 0, max: 30 };

/** Suffixe d'identifiant par zone : `EA` → `ez-cpi`, `FR` → `fr-cpi`. */
function idFor(geo: string, suffix: string): string {
  return `${GEO[geo]}-${suffix}`;
}

/**
 * L'IPCH mensuel, sur le dataset **ECOICOP ver.2**.
 *
 * Le précédent, `prc_hicp_manr`, est gelé : son titre au catalogue porte « (1997-2025) » et il
 * s'arrête à décembre 2025. Le laisser branché aurait donné une inflation figée huit mois en
 * arrière — pas un chiffre faux, mais un demi-produit. La refonte a renommé la dimension de
 * nomenclature, `coicop` devenant `coicop18` : rien ne pouvait passer en silence, Eurostat
 * aurait rejeté l'ancienne.
 */
function hicp(geo: string, coicop18: string, suffix: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, suffix) },
    dataset: "prc_hicp_minr",
    // `unit=RCH_A` : taux de variation annuel, déjà en pourcentage — pas d'indice à convertir.
    // Ce dataset sert aussi des indices (`I25`, `I15`), d'où l'importance de le fixer.
    dimensions: { freq: "M", unit: "RCH_A", coicop18, geo: geoFor(geo, "prc_hicp_minr") },
    cadence: "monthly",
    zone: GEO[geo],
    plausible: INFLATION_BOUNDS,
    expect: { unitLabel: "Annual rate of change", frequency: "Monthly" },
    enabled: true,
  };
}

function gdp(geo: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, "gdp") },
    dataset: "namq_10_gdp",
    // Quatre dimensions à fixer, et chacune change le chiffre :
    //   na_item=B1GQ    le PIB aux prix du marché, et non une de ses composantes
    //   unit=CLV_PCH_SM volumes chaînés, variation sur le même trimestre de l'année précédente
    //   s_adj=SCA       corrigé des variations saisonnières et des jours ouvrables
    dimensions: { freq: "Q", unit: "CLV_PCH_SM", s_adj: "SCA", na_item: "B1GQ", geo },
    cadence: "quarterly",
    zone: GEO[geo],
    plausible: GDP_BOUNDS,
    expect: { frequency: "Quarterly" },
    enabled: true,
  };
}

function unemployment(geo: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, "unemployment") },
    dataset: "une_rt_m",
    // `age` et `sex` doivent être fixés : sans eux, Eurostat sert toutes les tranches d'âge et
    // les deux sexes, et la réponse porte plusieurs valeurs par mois.
    dimensions: {
      freq: "M",
      unit: "PC_ACT",
      s_adj: "SA",
      age: "TOTAL",
      sex: "T",
      geo: geoFor(geo, "une_rt_m"),
    },
    cadence: "monthly",
    zone: GEO[geo],
    plausible: UNEMPLOYMENT_BOUNDS,
    expect: { unitLabel: "Percentage of population in the labour force", frequency: "Monthly" },
    enabled: true,
  };
}

const ZONES = ["EA", "FR", "DE", "ES", "IT"];

const BUDGET_BALANCE_BOUNDS = { min: -25, max: 15 };

/**
 * Solde budgétaire, sur `teina205` (« General government deficit (-) and surplus (+) »,
 * trimestriel). Quatre dimensions à fixer : `na_item=B9` (net lending/net borrowing — le solde
 * lui-même, seule valeur que porte ce dataset), `sector=S13` (administrations publiques, seule
 * valeur aussi), `unit=PC_GDP_NSA` (pourcentage du PIB, non corrigé des variations
 * saisonnières — le dataset ne propose pas de version SCA en pourcentage du PIB avec un
 * historique complet). Seuls `ez` et `fr` ont une entrée dans le catalogue des indicateurs ;
 * `de`, `es` et `it` n'en ont pas, donc pas de fonction générique sur `ZONES` ici.
 *
 * Confirmées par `npm run eurostat:check` : France à -6,1 % du PIB au T1 2026, zone euro
 * autour de -2,6 à -2,8 % sur les trimestres précédents — dans les bornes déclarées.
 */
function budgetBalance(geo: string, suffix: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, suffix) },
    dataset: "teina205",
    dimensions: {
      freq: "Q",
      na_item: "B9",
      sector: "S13",
      unit: "PC_GDP_NSA",
      geo: geoFor(geo, "teina205"),
    },
    cadence: "quarterly",
    zone: GEO[geo],
    plausible: BUDGET_BALANCE_BOUNDS,
    expect: { frequency: "Quarterly" },
    enabled: true,
  };
}

const CURRENT_ACCOUNT_BOUNDS = { min: -20, max: 25 };

/**
 * Balance courante en pourcentage du PIB, sur `bop_gdp6_q` (balance des paiements, trimestriel).
 * Dimensions confirmées par `eurostat:explore` : `bop_item=CA` (compte courant), `stk_flow=BAL`
 * (solde), `unit=PC_GDP`, `partner=WRL_REST` (reste du monde — la balance d'un pays avec tous
 * les autres ; pour la zone euro, les partenaires « extra-zone » sont un autre périmètre),
 * `s_adj=NSA` (non corrigé, comme `teina205`). La zone euro est `EA21`, seule composition
 * servie avec `EA20`/`EA19` pour des périodes antérieures.
 *
 * Jamais collectée tant que `npm run eurostat:check` ne l'a pas vue verte : les deux séries sont
 * donc déclarées `enabled: false` dans ce commit et activées au suivant, sur le constat.
 */
function currentAccount(geo: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, "current-account") },
    dataset: "bop_gdp6_q",
    dimensions: {
      freq: "Q",
      unit: "PC_GDP",
      s_adj: "NSA",
      bop_item: "CA",
      stk_flow: "BAL",
      partner: "WRL_REST",
      geo: geoFor(geo, "bop_gdp6_q"),
    },
    cadence: "quarterly",
    zone: GEO[geo],
    plausible: CURRENT_ACCOUNT_BOUNDS,
    expect: { frequency: "Quarterly" },
    enabled: false,
    disabledReason: "En attente de npm run eurostat:check.",
  };
}

const DEBT_GDP_BOUNDS = { min: 0, max: 250 };

/**
 * Dette publique / PIB, sur `teina230` (« General government gross debt », trimestriel) — le
 * dataset jumeau de `teina205` pour le solde budgétaire, même famille « euro indicators »
 * (préfixe `tei`). Dimensions confirmées par `eurostat:explore` : `na_item=GD` (Government
 * consolidated gross debt, seule valeur), `sector=S13`, `unit=PC_GDP` — sans suffixe NSA cette
 * fois, contrairement à `teina205`. Trois zones ont une entrée au catalogue : `ez`, `fr`, `it` ;
 * `de` et `es` n'en ont pas.
 *
 * Confirmées par `npm run eurostat:check` : Italie autour de 137-138 % du PIB sur les
 * trimestres récents, cohérent avec la réalité — dans les bornes déclarées.
 */
function debtGdp(geo: string, suffix: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, suffix) },
    dataset: "teina230",
    dimensions: {
      freq: "Q",
      na_item: "GD",
      sector: "S13",
      unit: "PC_GDP",
      geo: geoFor(geo, "teina230"),
    },
    cadence: "quarterly",
    zone: GEO[geo],
    plausible: DEBT_GDP_BOUNDS,
    expect: { frequency: "Quarterly" },
    enabled: true,
  };
}

const WAGES_BOUNDS = { min: -15, max: 25 };

/**
 * Salaires, sur `lc_lci_r2_q` (« Labour cost index », trimestriel) — dataset déjà visé par le
 * catalogue initial (`seriesKey: "LCI_LCI_R2_Q"` sur `ez-wages`, jamais branché jusqu'ici).
 * Cinq dimensions à fixer, confirmées par `eurostat:explore` : `s_adj=NSA` (les trois codes
 * disponibles sont non corrigé, corrigé du calendrier, corrigé des variations saisonnières —
 * NSA pour rester cohérent avec un `unit` en glissement annuel, qui absorbe déjà la
 * saisonnalité) ; `unit=PCH_SM` (glissement annuel — même convention que `us-wages` chez FRED
 * et `uk-wages` chez ONS, contrairement à `PCH_PRE` qui serait un glissement trimestriel) ;
 * `nace_r2=B-S` (l'ensemble de l'économie, hors ménages employeurs et extraterritorial — le
 * plus proche d'un « tous secteurs ») ; `lcstruct=D11` (salaires et traitements, par
 * opposition à `D1_D4_MD5`, le coût du travail complet charges comprises, une notion
 * différente de ce que le cahier suit sous « Salaires » ailleurs).
 *
 * Confirmé par `npm run eurostat:check` : France à 2,1 % au T1 2026, Allemagne à 2,9 %, toutes
 * deux en glissement annuel — dans les bornes déclarées.
 */
function wages(geo: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, "wages") },
    dataset: "lc_lci_r2_q",
    dimensions: {
      freq: "Q",
      s_adj: "NSA",
      unit: "PCH_SM",
      nace_r2: "B-S",
      lcstruct: "D11",
      geo: geoFor(geo, "lc_lci_r2_q"),
    },
    cadence: "quarterly",
    zone: GEO[geo],
    plausible: WAGES_BOUNDS,
    expect: { frequency: "Quarterly" },
    enabled: true,
  };
}

/**
 * `ez-wages` reste désactivée : contrairement à `une_rt_m`, `teina205` et `teina230`, aucune
 * composition de zone euro ne porte de valeur sur `lc_lci_r2_q` pour ces dimensions — ni `EA`,
 * ni `EA21`, ni `EA20`, ni `EA19`, ni même `EU`/`EU27_2020`. Confirmé en retirant le filtre
 * `geo` de la requête (`lastTimePeriod=1`, sonder-brut) : la réponse ne porte de valeur que
 * pour des codes pays individuels (AT, BE, DE, FR, IT…), aucun agrégat. Ce n'est pas un code
 * mal deviné à corriger, mais une donnée qu'Eurostat ne calcule tout simplement pas pour le
 * sous-composant « salaires et traitements » (`D11`) du coût du travail, à la différence du
 * coût du travail complet (`D1_D4_MD5`), qui pourrait porter un agrégat sous une autre
 * combinaison — non exploré, l'objectif du cahier étant les salaires, pas le coût du travail.
 */
const EZ_WAGES_NO_AGGREGATE =
  "Aucune composition de zone euro (EA, EA21, EA20, EA19) ni européenne (EU, EU27_2020) ne " +
  "porte de valeur sur lc_lci_r2_q pour le sous-composant « salaires et traitements » (D11) — " +
  "confirmé en retirant le filtre geo et en observant la réponse complète : seuls des codes " +
  "pays individuels ont une valeur. Pas un code à deviner autrement, une donnée non publiée.";

export const EUROSTAT_SERIES: EurostatMapping[] = [
  // --- Inflation totale (IPCH, glissement annuel) --------------------------
  // `TOTAL` : l'ensemble des postes. En ECOICOP v2 il remplace `CP00`, qui n'existe plus —
  // les codes `CP…` ne désignent plus que des postes, jamais l'agrégat.
  ...ZONES.map((g) => hicp(g, "TOTAL", "cpi")),

  // --- Inflation sous-jacente ----------------------------------------------
  // `TOT_X_NRG_FOOD` : hors énergie, alimentation, alcool et tabac — la définition que la BCE
  // commente sous le nom HICPX. C'est elle qui rend le chiffre comparable au cœur américain
  // déjà collecté côté FRED, et au driver « taux directeurs » qui suit la BCE.
  ...ZONES.map((g) => hicp(g, "TOT_X_NRG_FOOD", "cpi-core")),

  // --- Croissance du PIB ---------------------------------------------------
  ...ZONES.map(gdp),

  // --- Taux de chômage -----------------------------------------------------
  ...ZONES.map(unemployment),

  // --- Solde budgétaire (zone euro et France uniquement) --------------------
  budgetBalance("EA", "budget-balance"),
  budgetBalance("FR", "budget-balance"),

  // --- Balance courante (zone euro et Allemagne) ------------------------------
  currentAccount("EA"),
  currentAccount("DE"),

  // --- Dette publique / PIB (zone euro, France, Italie) ----------------------
  debtGdp("EA", "debt-gdp"),
  debtGdp("FR", "debt-gdp"),
  debtGdp("IT", "debt-gdp"),

  // --- Salaires (France et Allemagne — pas de zone euro, voir EZ_WAGES_NO_AGGREGATE) ----
  { ...wages("EA"), enabled: false, disabledReason: EZ_WAGES_NO_AGGREGATE },
  wages("FR"),
  wages("DE"),
];

/**
 * Le PMI composite reste au seed, et n'a donc aucune entrée ici.
 *
 * Ce n'est pas un oubli : le PMI est un indice propriétaire de S&P Global (marque HCOB pour la
 * zone euro), diffusé sous licence et **absent de l'API de dissémination d'Eurostat**. Le plus
 * proche qu'Eurostat publie est l'Economic Sentiment Indicator de DG ECFIN — un autre
 * indicateur, sur une autre échelle (base 100 contre seuil de diffusion à 50). Le substituer
 * donnerait exactement ce que ce fichier existe pour empêcher : un chiffre plausible et faux.
 *
 * Même situation que `us-pmi` côté FRED, désactivé pour une raison voisine.
 */
export const PMI_NOT_ON_EUROSTAT =
  "Indice propriétaire S&P Global / HCOB, sous licence, absent de l'API Eurostat.";

/**
 * L'interrupteur général, basculé après un `npm run eurostat:check` vert.
 *
 * Les vingt séries sont sorties conformes le 18 août 2026 : dimensions confrontées à la
 * nomenclature réelle de chaque dataset, unités identiques à celles attendues, dernières
 * valeurs relevées et lues à la main. Quatre défauts ont été corrigés à cette occasion —
 * bornes du PIB trop serrées, `geo=EA` absent de `une_rt_m`, `prc_hicp_manr` gelé fin 2025, et
 * `coicop` renommé `coicop18` dans son successeur.
 *
 * Le champ `enabled` de chaque série sert à écarter individuellement celles qu'un contrôle
 * ultérieur ferait tomber, sans tout désactiver.
 */
export const EUROSTAT_VERIFIED = true;

export const ENABLED_EUROSTAT_SERIES = EUROSTAT_VERIFIED
  ? EUROSTAT_SERIES.filter((m) => m.enabled)
  : [];

export function eurostatMappingFor(indicatorId: string): EurostatMapping | null {
  return ENABLED_EUROSTAT_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
