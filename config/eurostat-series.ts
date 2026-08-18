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
 * ⚠︎ Les codes de dataset et de dimension ci-dessous sont écrits d'après la structure connue
 * du dispositif Eurostat, **sans avoir pu être confrontés à un appel réseau réel** depuis
 * l'environnement de développement — même situation que `config/fred-series.ts` à sa création.
 * D'où `EUROSTAT_VERIFIED`, plus bas : rien n'est collecté avant un `npm run eurostat:check`
 * vert.
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
 * d'un périmètre qui change en cours de série — choix assumé plutôt que `EA20`, dont la
 * composition est figée et les points antérieurs recalculés.
 */
const GEO: Record<string, Zone> = { EA: "ez", FR: "fr", DE: "de", ES: "es", IT: "it" };

const INFLATION_BOUNDS = { min: -5, max: 25 };
const GDP_BOUNDS = { min: -20, max: 20 };
const UNEMPLOYMENT_BOUNDS = { min: 0, max: 30 };

/** Suffixe d'identifiant par zone : `EA` → `ez-cpi`, `FR` → `fr-cpi`. */
function idFor(geo: string, suffix: string): string {
  return `${GEO[geo]}-${suffix}`;
}

function hicp(geo: string, coicop: string, suffix: string): EurostatMapping {
  return {
    target: { kind: "macro", id: idFor(geo, suffix) },
    dataset: "prc_hicp_manr",
    // `unit=RCH_A` : taux de variation annuel, déjà en pourcentage — pas d'indice à convertir.
    dimensions: { freq: "M", unit: "RCH_A", coicop, geo },
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
    dimensions: { freq: "M", unit: "PC_ACT", s_adj: "SA", age: "TOTAL", sex: "T", geo },
    cadence: "monthly",
    zone: GEO[geo],
    plausible: UNEMPLOYMENT_BOUNDS,
    expect: { unitLabel: "Percentage of population in the labour force", frequency: "Monthly" },
    enabled: true,
  };
}

const ZONES = ["EA", "FR", "DE", "ES", "IT"];

export const EUROSTAT_SERIES: EurostatMapping[] = [
  // --- Inflation totale (IPCH, glissement annuel) --------------------------
  ...ZONES.map((g) => hicp(g, "CP00", "cpi")),

  // --- Inflation sous-jacente ----------------------------------------------
  // `TOT_X_NRG_FOOD` : hors énergie, alimentation, alcool et tabac — la définition que la BCE
  // commente sous le nom HICPX. C'est elle qui rend le chiffre comparable au cœur américain
  // déjà collecté côté FRED, et au driver « taux directeurs » qui suit la BCE.
  ...ZONES.map((g) => hicp(g, "TOT_X_NRG_FOOD", "cpi-core")),

  // --- Croissance du PIB ---------------------------------------------------
  ...ZONES.map(gdp),

  // --- Taux de chômage -----------------------------------------------------
  ...ZONES.map(unemployment),
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
 * L'interrupteur général, à basculer **après** un `npm run eurostat:check` vert.
 *
 * Les codes de dataset et de dimension de ce fichier n'ont pas pu être confrontés à l'API
 * réelle depuis l'environnement de développement. Tant que ce drapeau est faux, l'orchestrateur
 * n'appelle aucune série : `/macro` continue de lire le seed, exactement comme avant. Le
 * contrôle à blanc, lui, interroge `EUROSTAT_SERIES` en entier sans passer par ce drapeau —
 * c'est ce qui permet de vérifier avant d'activer.
 *
 * Une fois vert, basculer ici ; le champ `enabled` de chaque série sert ensuite à écarter
 * individuellement celles qui n'auraient pas passé le contrôle.
 */
export const EUROSTAT_VERIFIED = false;

export const ENABLED_EUROSTAT_SERIES = EUROSTAT_VERIFIED
  ? EUROSTAT_SERIES.filter((m) => m.enabled)
  : [];

export function eurostatMappingFor(indicatorId: string): EurostatMapping | null {
  return ENABLED_EUROSTAT_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
