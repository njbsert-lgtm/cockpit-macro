import type { AssetClass, Instrument } from "./types";
import { getInstrumentsByAssetClass, getObservations } from "./data";
import { oneMonthPerformance, oneYearPerformance, ytdPerformance } from "./performance";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity: "Actions",
  rates: "Obligations",
  commodity: "Matières premières",
  fx: "Devises",
};

export const ASSET_CLASS_ORDER: AssetClass[] = ["equity", "rates", "commodity", "fx"];

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
 */
export function getClassPerformance(assetClass: AssetClass): ClassPerformance {
  const instruments = getInstrumentsByAssetClass(assetClass);
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
    coverage: perInstrument.filter((p) => p.ytd !== null || p.oneMonth !== null || p.oneYear !== null).length,
    total: instruments.length,
  };
}

export function instrumentPerformances(instrument: Instrument) {
  const obs = getObservations(instrument.id);
  return {
    ytd: ytdPerformance(instrument, obs),
    oneMonth: oneMonthPerformance(obs)?.pct ?? null,
    oneYear: oneYearPerformance(obs)?.pct ?? null,
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
