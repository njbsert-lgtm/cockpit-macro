import type { MacroIndicator } from "./types";
import { getMacroIndicators } from "./data";

// Chaque id d'indicateur suit le motif '${zone}-${metrique}' (ex. 'fr-cpi-core'), ce qui
// permet de regrouper les indicateurs par métrique pour le mode comparaison sans champ
// supplémentaire dans le modèle de données.
export const METRIC_LABELS: Record<string, string> = {
  cpi: "Inflation totale",
  "cpi-core": "Inflation sous-jacente",
  gdp: "Croissance du PIB",
  unemployment: "Taux de chômage",
  "policy-rate": "Taux directeur",
  pmi: "PMI composite",
  wages: "Salaires",
  "budget-balance": "Solde budgétaire",
  "debt-gdp": "Dette publique / PIB",
  "current-account": "Balance courante",
};

export const METRIC_ORDER = Object.keys(METRIC_LABELS);

export function metricOf(indicator: MacroIndicator): string {
  return indicator.id.slice(indicator.zone.length + 1);
}

export function getIndicatorsForMetric(metric: string): MacroIndicator[] {
  return getMacroIndicators().filter((i) => metricOf(i) === metric);
}

export function formatIndicatorValue(indicator: MacroIndicator, value: number): string {
  if (indicator.unit === "percent") {
    const sign = value > 0 && ["gdp", "budget-balance", "current-account"].includes(metricOf(indicator)) ? "+" : "";
    return `${sign}${value.toFixed(1).replace(".", ",")} %`;
  }
  return value.toFixed(1).replace(".", ",");
}
