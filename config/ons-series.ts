import type { Cadence } from "./cadence";
import type { Zone } from "@/lib/types";

/**
 * Table de correspondance entre nos identifiants et les séries ONS (Office for National
 * Statistics, Royaume-Uni). Même rôle que `config/fred-series.ts` et
 * `config/eurostat-series.ts` : rien ne passe en collecte sans être sorti vert de
 * `npm run ons:check`.
 *
 * **Aucun de ces identifiants n'a été confronté à un appel réseau réel depuis cet
 * environnement** — même prudence que pour `config/veille-taxonomy.ts` en son temps. Les
 * `timeseriesId` et `datasetId` ci-dessous reprennent les valeurs déjà portées par
 * `data/seed.json` (`ONS.D7G7`, `ONS.MGSX`, etc.), qui sont des identifiants ONS réels et
 * stables depuis des années — mais le regroupement dataset/série exact doit être vérifié avant
 * d'activer quoi que ce soit. `ONS_VERIFIED` reste à `false` tant que ce n'est pas fait.
 *
 * Le taux directeur (`uk-policy-rate`) n'est **pas** une série ONS — c'est la Banque
 * d'Angleterre qui le publie, sur une base de données distincte (IADB). Il reste hors de ce
 * fichier ; le brancher est un chantier séparé. Le PMI composite (`uk-pmi`) reste au seed pour
 * la même raison qu'ailleurs : indice propriétaire S&P Global, absent de l'API ONS.
 *
 * **Mise à jour — l'ancienne API a été retirée le 25/11/2024.** `api.ons.gov.uk/timeseries/
 * {id}/dataset/{ds}/data` répond « This API has been decommissioned ». Confirmé par appel
 * réel (`workflow_dispatch` de `verification-sources.yml`, sonde générique). L'API de contenu
 * du site (`api.ons.gov.uk/v1/data?uri=<chemin de la page timeseries>`) sert toujours
 * exactement le même schéma JSON (`months`/`quarters`/`years`, `description.unit`) — seule
 * l'URL change, `lib/ons.ts` n'a rien à reparser. `topic` porte ce chemin, vérifié série par
 * série par le même mécanisme.
 */

export type OnsMapping = {
  target: { kind: "macro"; id: string };
  /**
   * Le chemin thématique de la page ONS qui porte la série, ex. `economy/
   * inflationandpriceindices` — le préfixe de `uri` dans `api.ons.gov.uk/v1/data?uri=`.
   */
  topic: string;
  /** L'identifiant de la série elle-même, ex. `D7G7` (CDID, stable dans le temps chez ONS). */
  timeseriesId: string;
  /** Le jeu de données qui la porte, ex. `MM23` — nécessaire pour former l'URL. */
  datasetId: string;
  cadence: Cadence;
  zone: Zone;
  /**
   * Bornes de plausibilité, en unité finale. Une valeur en dehors fait rejeter **toute la
   * réponse**, même principe que FRED et Eurostat : si l'identifiant est le mauvais, ce n'est
   * pas un point qui est faux, c'est la série entière.
   */
  plausible: { min: number; max: number };
  /** Ce que `npm run ons:check` doit retrouver, pour confirmer qu'on lit la bonne série. */
  expect: { unitLabel?: string };
  enabled: boolean;
  /** Pourquoi cette série est désactivée. Obligatoire quand `enabled` est faux. */
  disabledReason?: string;
};

export const ONS_SOURCE = "ONS";

const INFLATION_BOUNDS = { min: -5, max: 25 };
const GDP_BOUNDS = { min: -35, max: 35 };
const UNEMPLOYMENT_BOUNDS = { min: 0, max: 30 };
const WAGE_BOUNDS = { min: -10, max: 25 };
const BUDGET_BOUNDS = { min: -25, max: 15 };

export const ONS_SERIES: OnsMapping[] = [
  // --- Inflation ------------------------------------------------------------
  {
    target: { kind: "macro", id: "uk-cpi" },
    topic: "economy/inflationandpriceindices",
    timeseriesId: "D7G7",
    datasetId: "MM23",
    cadence: "monthly",
    zone: "uk",
    plausible: INFLATION_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "uk-cpi-core" },
    topic: "economy/inflationandpriceindices",
    timeseriesId: "D7G8",
    datasetId: "MM23",
    cadence: "monthly",
    zone: "uk",
    plausible: INFLATION_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Croissance du PIB ------------------------------------------------------
  // ABMI (le CDID initialement retenu) s'est révélé être le niveau du PIB en volumes chaînés,
  // en millions de livres — un niveau, pas un taux de croissance : vérifié par appel réel, la
  // réponse portait 145 457 pour 1955 T1, bien au-delà de toute borne de plausibilité en points
  // de pourcentage. IHYQ est la croissance elle-même (0,6 % au T1 2026, confirmé par appel réel).
  // Elle est trimestre sur trimestre précédent, alors qu'Eurostat (`namq_10_gdp`, `CLV_PCH_SM`)
  // publie trimestre sur même trimestre de l'année précédente — les deux bases ne sont donc pas
  // directement comparables chiffre à chiffre en mode comparaison. Signalé ici plutôt que
  // silencieux : mieux vaut une vraie série sur une base différente qu'un niveau confondu avec
  // un taux, et aucune autre série ONS trimestre-sur-année-précédente n'a été localisée à date.
  {
    target: { kind: "macro", id: "uk-gdp" },
    topic: "economy/grossdomesticproductgdp",
    timeseriesId: "IHYQ",
    datasetId: "QNA",
    cadence: "quarterly",
    zone: "uk",
    plausible: GDP_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Taux de chômage ---------------------------------------------------------
  {
    target: { kind: "macro", id: "uk-unemployment" },
    topic: "employmentandlabourmarket/peoplenotinwork/unemployment",
    timeseriesId: "MGSX",
    datasetId: "LMS",
    cadence: "monthly",
    zone: "uk",
    plausible: UNEMPLOYMENT_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Salaires -----------------------------------------------------------------
  // Rémunération totale (avec primes), variation annuelle — série la plus proche de ce que le
  // cahier suit ailleurs sous le libellé « Salaires ».
  {
    target: { kind: "macro", id: "uk-wages" },
    topic: "employmentandlabourmarket/peopleinwork/earningsandworkinghours",
    timeseriesId: "KAC3",
    datasetId: "LMS",
    cadence: "monthly",
    zone: "uk",
    plausible: WAGE_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Solde budgétaire --------------------------------------------------------
  // Désactivée : `PSAB/PSA` répondait sur l'ancienne API, mais son équivalent sur la nouvelle
  // (api.ons.gov.uk/v1/data?uri=...) n'a pas été localisé — ni sous
  // governmentpublicsectorandtaxes/publicsectorfinance, ni sous .../publicspending, avec le
  // dataset PSA ou son remplaçant présumé PUSF. Plutôt que de deviner un chemin de plus,
  // désactivée jusqu'à confirmation par appel réel (même discipline que `us-pmi` : on documente
  // l'incertitude plutôt que d'activer une série non vérifiée).
  {
    target: { kind: "macro", id: "uk-budget-balance" },
    topic: "economy/governmentpublicsectorandtaxes/publicsectorfinance",
    timeseriesId: "PSAB",
    datasetId: "PSA",
    cadence: "quarterly",
    zone: "uk",
    plausible: BUDGET_BOUNDS,
    expect: {},
    enabled: false,
    disabledReason:
      "chemin de la nouvelle API non confirmé — l'ancien point de terminaison " +
      "(api.ons.gov.uk/timeseries/psab/dataset/psa/data) a été retiré le 25/11/2024, et ni " +
      "governmentpublicsectorandtaxes/publicsectorfinance ni .../publicspending, avec PSA ou " +
      "PUSF comme dataset, ne répondent sur api.ons.gov.uk/v1/data?uri=. À relocaliser avant " +
      "d'activer.",
  },
];

/**
 * L'interrupteur général, sur le modèle d'`EUROSTAT_VERIFIED`. Reste à `false` tant qu'un
 * `npm run ons:check` n'est pas sorti vert série par série — voir la note en tête de fichier
 * sur l'absence de vérification réseau depuis cet environnement.
 */
export const ONS_VERIFIED = true;

export const ENABLED_ONS_SERIES = ONS_VERIFIED ? ONS_SERIES.filter((m) => m.enabled) : [];

export function onsMappingFor(indicatorId: string): OnsMapping | null {
  return ENABLED_ONS_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
