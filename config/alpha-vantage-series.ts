/**
 * Table de correspondance entre nos identifiants et des tickers ETF Alpha Vantage.
 *
 * Quatrième source de collecte candidate, testée après l'échec technique de Stooq (défi
 * anti-robot en JavaScript, voir `STOOQ_BLOCKED` dans `config/twelve-data-series.ts`) comme
 * fournisseur de secours pour les huit instruments verrouillés ou introuvables chez Twelve
 * Data. Alpha Vantage ne distribue aucun de ces indices propriétaires bruts non plus ; le
 * principe déjà admis pour MSCI ACWI (`acwi`, Twelve Data) s'étend donc ici : un ETF réel,
 * investissable, qui réplique l'indice nommé — jamais présenté comme l'indice lui-même.
 *
 * Deux exigences, non négociables, qui ont éliminé plusieurs candidats en cours de route :
 * - **Le bon indice.** EWU, EWQ et EWH (iShares MSCI Royaume-Uni / France / Hong Kong) ont été
 *   confirmés par un vrai prix via `GLOBAL_QUOTE`, puis rejetés : ils répliquent l'indice pays
 *   MSCI, pas le FTSE 100, le CAC 40 ou le Hang Seng nommés. Un chiffre juste sous le mauvais
 *   nom est pire qu'une absence.
 * - **La devise de référence, quand une place locale le permet.** Pour le Royaume-Uni, la France
 *   et l'Euro Stoxx 50, un fonds coté localement existe (ISF.LON en livres, CAC.PAR et C50.PAR
 *   en euros). Il n'en existe pas d'équivalent pour le CSI 300 ou le Nifty 50 sur Alpha Vantage
 *   — ASHR et INDY restent des trackers new-yorkais cotés en dollars, seul candidat confirmé
 *   pour chacun. L'écart est documenté ligne par ligne plutôt que passé sous silence. Le
 *   candidat initial pour l'Euro Stoxx 50, FEZ (confirmé, mais coté à New York en dollars), a
 *   été écarté au profit de C50.PAR pour la même raison qui a déjà écarté EWU/EWQ/EWH : la
 *   devise de référence prime, même quand le premier candidat était déjà vérifié.
 *
 * **Toutes les entrées ci-dessous restent désactivées.** Les huit prix ont tous été confirmés
 * par un appel réel (`GLOBAL_QUOTE`, clôture du 25/09/2026, voir le commentaire de chaque
 * entrée), à l'exception du Hang Seng — voir `hsi` plus bas. L'activation exige encore, par
 * instrument, la clôture réelle du 31/12/2025 pour `ytdBasis` (aucune n'a été collectée —
 * `GLOBAL_QUOTE` ne donne que le dernier cours, pas l'historique) et la correction du
 * `note`/`unit` du catalogue dans `data/seed.json`, sur le modèle déjà appliqué à `acwi` et
 * `copper` : les échelles actuelles du seed sont des points d'indice (ex. `sx5e` autour de
 * 4 950), incompatibles avec un cours de part ETF (C50.PAR à 169,60 €). Activer sans cette
 * correction reproduirait exactement le bug de mise à l'échelle déjà attrapé deux fois cette
 * session (`acwi`, `copper`).
 *
 * Palier gratuit : 25 appels par jour, 5 par minute — plus contraignant que Twelve Data (8/min).
 * Sept instruments à raison d'un appel quotidien chacun tiennent largement dans ce budget une
 * fois activés ; c'est la phase de sondage, avec ses hypothèses successives, qui l'a saturé.
 */

import type { Cadence } from "./cadence";

export type AlphaVantageMapping = {
  target: { kind: "instrument"; id: string };
  /** Le ticker tel qu'Alpha Vantage l'attend, ex. `SLV`, `ISF.LON`. */
  symbol: string;
  cadence: Cadence;
  plausible: { min: number; max: number };
  enabled: boolean;
  /** Pourquoi cette série reste désactivée malgré un ticker confirmé, ou pourquoi rien ne l'est. */
  disabledReason: string;
};

const PENDING_YTD_BASIS =
  " Ticker confirmé par appel réel (GLOBAL_QUOTE), mais la clôture du 31/12/2025 n'a pas encore " +
  "été collectée pour recalibrer ytdBasis, l'unité et la note du catalogue (data/seed.json) à " +
  "l'échelle du cours de part plutôt qu'à celle de l'indice — même correction que celle déjà " +
  "faite pour acwi et copper, pas encore faite ici. Activer sans elle publierait une base YTD à " +
  "la mauvaise échelle.";

const HK_NOT_FOUND =
  "Aucun des deux suffixes de place testés pour le Tracker Fund of Hong Kong (2800), qui " +
  "réplique explicitement le Hang Seng — pas 2833.HK, qui suit les H-shares, un indice " +
  "différent — n'est reconnu par Alpha Vantage : « .HKG » et « .HK » renvoient tous deux un " +
  "Global Quote vide, sans message d'erreur. Le palier gratuit ne couvre vraisemblablement pas " +
  "la place de Hong Kong ; à confirmer par appel réel avant tout autre essai plutôt que de " +
  "deviner un troisième suffixe.";

export const ALPHA_VANTAGE_SERIES: AlphaVantageMapping[] = [
  {
    // SLV (iShares Silver Trust) — devise de référence : l'argent, comme l'or déjà collecté
    // (gold, XAU/USD chez Twelve Data), se cote nativement en dollars. Confirmé à 58,14 $ le
    // 25/09/2026.
    target: { kind: "instrument", id: "silver" },
    symbol: "SLV",
    cadence: "business-daily",
    plausible: { min: 5, max: 200 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // C50 (Amundi ETF Euro Stoxx 50 UCITS DR), place de Paris — coté en euros, la devise de
    // référence de l'indice. Remplace FEZ (SPDR Euro Stoxx 50, confirmé à 68,65 $ le
    // 25/09/2026 mais coté à New York en dollars) : la devise de référence prime sur un
    // candidat déjà confirmé mais dans la mauvaise devise, même exigence que pour ukx et cac.
    // Confirmé par appel réel à 169,60 € le 25/09/2026 (clôture précédente 169,34 €).
    target: { kind: "instrument", id: "sx5e" },
    symbol: "C50.PAR",
    cadence: "business-daily",
    plausible: { min: 10, max: 300 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // ISF.LON (iShares Core FTSE 100 UCITS ETF, place de Londres) — coté en pence sterling
    // (GBX), pas en livres : 1 040,00 le 25/09/2026 se lit 10,40 £. La devise exacte (GBX plutôt
    // que GBP) reste à porter dans le catalogue au moment de l'activation.
    target: { kind: "instrument", id: "ukx" },
    symbol: "ISF.LON",
    cadence: "business-daily",
    plausible: { min: 200, max: 3_000 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // CAC.PAR (Amundi CAC 40 UCITS ETF, place de Paris) — coté en euros, la devise de
    // référence de l'indice. Confirmé à 81,87 € le 25/09/2026.
    target: { kind: "instrument", id: "cac" },
    symbol: "CAC.PAR",
    cadence: "business-daily",
    plausible: { min: 10, max: 300 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // ASHR (Xtrackers Harvest CSI 300) — coté à New York, en dollars : aucun tracker CSI 300
    // coté en yuans n'est reconnu par Alpha Vantage sous un ticker testé. Confirmé à 33,09 $ le
    // 25/09/2026.
    target: { kind: "instrument", id: "csi300" },
    symbol: "ASHR",
    cadence: "business-daily",
    plausible: { min: 5, max: 200 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // INDY (iShares India 50) — coté à New York, en dollars : aucun tracker Nifty 50 coté en
    // roupies n'est reconnu par Alpha Vantage sous un ticker testé. Confirmé à 41,92 $ le
    // 25/09/2026.
    target: { kind: "instrument", id: "nifty50" },
    symbol: "INDY",
    cadence: "business-daily",
    plausible: { min: 5, max: 200 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // UUP (Invesco DB US Dollar Index Bullish Fund) — le DXY est lui-même un indice en dollars,
    // donc la devise de référence est déjà la bonne. Confirmé à 28,62 $ le 25/09/2026.
    target: { kind: "instrument", id: "dxy" },
    symbol: "UUP",
    cadence: "business-daily",
    plausible: { min: 5, max: 100 },
    enabled: false,
    disabledReason: PENDING_YTD_BASIS,
  },
  {
    // Aucun ticker retenu — voir HK_NOT_FOUND. Le symbole reste vide plutôt que de porter un
    // code jamais confirmé.
    target: { kind: "instrument", id: "hsi" },
    symbol: "",
    cadence: "business-daily",
    plausible: { min: 5_000, max: 60_000 },
    enabled: false,
    disabledReason: HK_NOT_FOUND,
  },
];

export const ENABLED_ALPHA_VANTAGE_SERIES = ALPHA_VANTAGE_SERIES.filter((m) => m.enabled);

export function alphaVantageMappingForInstrument(instrumentId: string): AlphaVantageMapping | null {
  return ENABLED_ALPHA_VANTAGE_SERIES.find((m) => m.target.id === instrumentId) ?? null;
}
