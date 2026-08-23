/**
 * Table de correspondance entre nos identifiants et les symboles Twelve Data.
 *
 * Troisième source de collecte, après FRED et Eurostat. Ne sert que des instruments — Twelve
 * Data n'a rien à apporter aux indicateurs macro, déjà couverts par les deux premières sources.
 *
 * Le palier gratuit a été sondé symbole par symbole via `.github/workflows/verification-sources.yml`
 * (mode `sonder-twelvedata`), la clé réelle en secret de dépôt — jamais depuis l'environnement de
 * développement, qui n'a pas d'accès réseau sortant. Le résultat est nettement plus étroit que les
 * onze instruments visés au départ : la plupart des indices propriétaires sont soit verrouillés au
 * palier payant (« Grow », « Pro » ou « Venture »), soit absents du catalogue sous les codes usuels
 * testés (Yahoo-style comme Bloomberg-style). Chaque série désactivée porte la réponse exacte
 * obtenue, pas une supposition.
 */

import type { Cadence } from "./cadence";

export type TwelveDataMapping = {
  target: { kind: "instrument"; id: string };
  /** Le symbole tel que Twelve Data l'attend, ex. `XAU/USD`, `ACWI`. */
  symbol: string;
  cadence: Cadence;
  /**
   * Bornes de plausibilité, en unité finale. Une valeur en dehors fait rejeter **toute la
   * réponse**, même règle que pour FRED et Eurostat : une unité qui n'est pas celle qu'on croit
   * rend toute la série fausse, pas seulement le point qui déborde.
   */
  plausible: { min: number; max: number };
  /** Ce que `npm run twelve-data:check` doit retrouver dans la réponse `/quote`, en sous-chaîne. */
  expect: { currency?: string };
  enabled: boolean;
  /** Pourquoi cette série est désactivée — la réponse réelle de Twelve Data, pas une supposition. */
  disabledReason?: string;
};

export const LOOKBACK_DAYS: Record<Cadence, number> = {
  "business-daily": 400,
  monthly: 1200,
  quarterly: 3650,
  annual: 7300,
};

const PAID_PLAN = (plan: string) =>
  `Le symbole existe chez Twelve Data mais renvoie « available starting with the ${plan} plan » ` +
  `sur le palier gratuit — confirmé par appel réel, pas par la page de tarification.`;

const NOT_FOUND =
  "Aucun des codes usuels (Yahoo-style et Bloomberg-style) n'est reconnu par Twelve Data, sous " +
  "aucun plan — confirmé par appel réel à /quote, réponse « symbol or figi parameter is missing " +
  "or invalid ».";

export const TWELVE_DATA_SERIES: TwelveDataMapping[] = [
  // --- Actives --------------------------------------------------------------
  {
    // MSCI ACWI lui-même n'est pas distribué par Twelve Data. `ACWI` est le ticker de l'ETF
    // iShares MSCI ACWI, qui réplique l'indice — investissable et réel, dans l'esprit du cahier,
    // mais à une échelle différente : en dollars par part, pas en points d'indice. `unit` et
    // `ytdBasis` de ce instrument dans le seed reflètent donc l'ETF, pas l'indice MSCI brut.
    target: { kind: "instrument", id: "acwi" },
    symbol: "ACWI",
    cadence: "business-daily",
    plausible: { min: 10, max: 2_000 },
    expect: { currency: "USD" },
    enabled: true,
  },
  {
    target: { kind: "instrument", id: "gold" },
    symbol: "XAU/USD",
    cadence: "business-daily",
    plausible: { min: 200, max: 20_000 },
    expect: { currency: "USD" },
    enabled: true,
  },

  // --- Verrouillées au palier payant -----------------------------------------
  {
    target: { kind: "instrument", id: "sx5e" },
    symbol: "SX5E",
    cadence: "business-daily",
    plausible: { min: 1_000, max: 20_000 },
    expect: {},
    enabled: false,
    disabledReason: PAID_PLAN("Pro or Venture"),
  },
  {
    target: { kind: "instrument", id: "ukx" },
    symbol: "UKX",
    cadence: "business-daily",
    plausible: { min: 1_000, max: 20_000 },
    expect: {},
    enabled: false,
    disabledReason: PAID_PLAN("Grow or Venture"),
  },
  {
    target: { kind: "instrument", id: "csi300" },
    symbol: "000300",
    cadence: "business-daily",
    plausible: { min: 500, max: 10_000 },
    expect: {},
    enabled: false,
    disabledReason: PAID_PLAN("Pro or Venture"),
  },
  {
    target: { kind: "instrument", id: "silver" },
    symbol: "XAG/USD",
    cadence: "business-daily",
    plausible: { min: 1, max: 500 },
    expect: {},
    enabled: false,
    disabledReason: PAID_PLAN("Grow or Venture"),
  },
  {
    // Le seul candidat reconnu par Twelve Data pour le cuivre est le future continu `HG1`, lui
    // aussi verrouillé — `XCU/USD` et `COPPER` ne sont pas reconnus du tout, voir plus bas.
    target: { kind: "instrument", id: "copper" },
    symbol: "HG1",
    cadence: "business-daily",
    plausible: { min: 0.5, max: 50 },
    expect: {},
    enabled: false,
    disabledReason: PAID_PLAN("Grow or Venture"),
  },

  // --- Introuvables sous aucun code testé -------------------------------------
  {
    target: { kind: "instrument", id: "cac" },
    symbol: "FCHI",
    cadence: "business-daily",
    plausible: { min: 1_000, max: 20_000 },
    expect: {},
    enabled: false,
    disabledReason: `${NOT_FOUND} Codes testés : FCHI, PX1, CAC (ce dernier existe mais désigne Camden National Corporation, un titre NASDAQ sans rapport).`,
  },
  {
    target: { kind: "instrument", id: "hsi" },
    symbol: "HSI",
    cadence: "business-daily",
    plausible: { min: 5_000, max: 60_000 },
    expect: {},
    enabled: false,
    disabledReason: `${NOT_FOUND} Codes testés : HSI, HANGSENG.`,
  },
  {
    target: { kind: "instrument", id: "nifty50" },
    symbol: "NSEI",
    cadence: "business-daily",
    plausible: { min: 5_000, max: 60_000 },
    expect: {},
    enabled: false,
    disabledReason: `${NOT_FOUND} Codes testés : NSEI, NIFTY50, NIFTY.`,
  },
  {
    target: { kind: "instrument", id: "dxy" },
    symbol: "DXY",
    cadence: "business-daily",
    plausible: { min: 50, max: 200 },
    expect: {},
    enabled: false,
    disabledReason: `${NOT_FOUND} Codes testés : DXY, USDX (ce dernier existe mais désigne SGI Enhanced Core ETF, sans rapport). FRED publie DTWEXBGS, mais c'est l'indice large de la Fed, pas le DXY d'ICE — voir config/fred-series.ts.`,
  },
];

export const ENABLED_TWELVE_DATA_SERIES = TWELVE_DATA_SERIES.filter((m) => m.enabled);

export function twelveDataMappingForInstrument(instrumentId: string): TwelveDataMapping | null {
  return ENABLED_TWELVE_DATA_SERIES.find((m) => m.target.id === instrumentId) ?? null;
}
