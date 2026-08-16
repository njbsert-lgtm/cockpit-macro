import type { AssetClass, Instrument, Observation, Zone } from "./types";
import { getInstrumentsByAssetClass } from "./data";
import { zoneMatches } from "./zones";
import {
  dailyChange,
  oneMonthPerformance,
  oneYearPerformance,
  ytdPerformance,
  type DailyChange,
} from "./performance";
import { formatSignedBps, formatSignedPct } from "./format";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity: "Actions",
  rates: "Obligations",
  commodity: "Matières premières",
  fx: "Devises",
};

export const ASSET_CLASS_ORDER: AssetClass[] = ["equity", "rates", "commodity", "fx"];

/**
 * La classe d'actifs est un filtre dans l'URL, au même titre que la zone : `?classe=rates`.
 * Il n'y a pas d'état « vue d'ensemble » — une classe est toujours sélectionnée, la première
 * par défaut. Une valeur inconnue retombe sur ce défaut plutôt que de faire un 404 : un
 * paramètre d'URL est saisi à la main, il ne doit pas casser la page.
 */
export const ASSET_CLASS_PARAM = "classe";
export const DEFAULT_ASSET_CLASS: AssetClass = "equity";

export function parseAssetClass(value: string | string[] | undefined | null): AssetClass {
  const v = Array.isArray(value) ? value[0] : value;
  return (ASSET_CLASS_ORDER as string[]).includes(v ?? "")
    ? (v as AssetClass)
    : DEFAULT_ASSET_CLASS;
}

/**
 * Les maturités obligataires disponibles, de la plus courte à la plus longue. L'identifiant
 * d'un point de courbe suit le motif `${paysDeuxLettres}${maturité}` (ex. `fr5y`), ce qui
 * évite un champ de plus dans `Instrument` : la maturité et le pays émetteur se lisent dans
 * l'id, pas dans une donnée saisie à part qui pourrait diverger de lui.
 */
export const MATURITY_ORDER = ["6m", "1y", "3y", "5y", "10y", "15y", "20y"] as const;
export type Maturity = (typeof MATURITY_ORDER)[number];
export const MATURITY_LABELS: Record<Maturity, string> = {
  "6m": "6 mois",
  "1y": "1 an",
  "3y": "3 ans",
  "5y": "5 ans",
  "10y": "10 ans",
  "15y": "15 ans",
  "20y": "20 ans",
};

/**
 * Les zones qui portent leur propre courbe souveraine, dans l'ordre où le cahier des charges
 * énumère les zones. `ez` et `em` sont des agrégats, pas des émetteurs : ils n'ont pas de
 * courbe qui leur soit propre, seulement les courbes de leurs pays membres.
 */
const RATE_COUNTRY_ORDER: Zone[] = ["us", "fr", "de", "es", "it", "uk", "jp", "cn", "in"];
const RATE_COUNTRY_ZONES = new Set<Zone>(RATE_COUNTRY_ORDER);

/** La zone choisie a-t-elle sa propre courbe souveraine ? Pilote l'affichage du détail. */
export function isRateCountryZone(zone: Zone): boolean {
  return RATE_COUNTRY_ZONES.has(zone);
}

function parseRateInstrumentId(id: string): { country: Zone; maturity: Maturity } | null {
  const country = id.slice(0, 2) as Zone;
  const maturity = id.slice(2) as Maturity;
  if (!RATE_COUNTRY_ZONES.has(country)) return null;
  if (!(MATURITY_ORDER as readonly string[]).includes(maturity)) return null;
  return { country, maturity };
}

/**
 * Les instruments à taux affichés pour une zone donnée : quand un pays émetteur est choisi,
 * toute sa courbe, du 6 mois au 20 ans ; sinon — Toutes, Zone euro, Émergents — un seul point
 * de repère par pays, le 10 ans, pour rester une liste et non un mur de 63 lignes. Les deux
 * spreads suivent la même zone qu'avant, dans les deux cas : ce ne sont pas des points de
 * courbe, `parseRateInstrumentId` les ignore.
 */
export function getRatesInstruments(zone: Zone): Instrument[] {
  const all = getInstrumentsByAssetClass("rates");
  const spreads = all.filter((i) => !parseRateInstrumentId(i.id) && zoneMatches(i.zones, zone));

  if (RATE_COUNTRY_ZONES.has(zone)) {
    const curve = all
      .filter((i) => parseRateInstrumentId(i.id)?.country === zone)
      .sort(
        (a, b) =>
          MATURITY_ORDER.indexOf(parseRateInstrumentId(a.id)!.maturity) -
          MATURITY_ORDER.indexOf(parseRateInstrumentId(b.id)!.maturity),
      );
    return [...curve, ...spreads];
  }

  const benchmarks = RATE_COUNTRY_ORDER.map((country) =>
    all.find((i) => i.id === `${country}10y`),
  ).filter((i): i is Instrument => i !== undefined && zoneMatches(i.zones, zone));
  return [...benchmarks, ...spreads];
}

export function instrumentPerformances(instrument: Instrument, obs: Observation[]) {
  return {
    ytd: ytdPerformance(instrument, obs),
    oneMonth: oneMonthPerformance(obs)?.pct ?? null,
    oneYear: oneYearPerformance(obs)?.pct ?? null,
    daily: dailyChange(obs),
  };
}

export function formatInstrumentValue(instrument: Instrument, value: number): string {
  switch (instrument.unit) {
    case "percent":
      return `${value.toFixed(2).replace(".", ",")} %`;
    case "usd":
      return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} $`;
    case "ratio":
      return value.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    case "index":
    default:
      return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
}

/**
 * Un taux et un spread se lisent en points de base, pas en variation relative : « le 10 ans
 * perd 0,5 % » ne veut rien dire pour personne, « le 10 ans perd 2 bps » se lit tout de suite.
 * C'est aussi l'unité dans laquelle le cahier des charges exprime les seuils d'alerte.
 */
export function formatDailyChange(instrument: Instrument, change: DailyChange): string {
  if (instrument.unit === "percent") return formatSignedBps(change.absolute * 100);
  return formatSignedPct(change.pct, 2);
}
