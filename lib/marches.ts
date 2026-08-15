import type { AssetClass, Instrument, Zone } from "./types";
import { getInstrumentsByAssetClass, getObservations } from "./data";
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

function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

export type ClassPerformance = {
  ytd: number | null;
  oneMonth: number | null;
  oneYear: number | null;
  coverage: number; // combien d'instruments contribuent au moins une des trois mesures
  total: number;
};

/**
 * Performance agrégée d'une classe d'actifs : moyenne simple, non pondérée, des instruments
 * suivis. Ce n'est pas un indice représentatif — c'est assumé, pas caché.
 *
 * La zone est le même contexte que partout ailleurs : l'agrégat porte sur les instruments que
 * la liste va effectivement afficher, sinon le chiffre du bouton ne décrirait pas ce qu'il
 * ouvre. Les instruments sans base YTD saisie — les deux spreads — sortent de la moyenne au
 * lieu d'y entrer pour zéro.
 */
export function getClassPerformance(assetClass: AssetClass, zone?: Zone): ClassPerformance {
  const instruments = getInstrumentsByAssetClass(assetClass, zone);
  const perInstrument = instruments.map((i) => {
    const obs = getObservations(i.id);
    return {
      ytd: ytdPerformance(i, obs),
      oneMonth: oneMonthPerformance(obs)?.pct ?? null,
      oneYear: oneYearPerformance(obs)?.pct ?? null,
    };
  });

  return {
    ytd: average(perInstrument.map((p) => p.ytd)),
    oneMonth: average(perInstrument.map((p) => p.oneMonth)),
    oneYear: average(perInstrument.map((p) => p.oneYear)),
    coverage: perInstrument.filter(
      (p) => p.ytd !== null || p.oneMonth !== null || p.oneYear !== null,
    ).length,
    total: instruments.length,
  };
}

export function instrumentPerformances(instrument: Instrument) {
  const obs = getObservations(instrument.id);
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
