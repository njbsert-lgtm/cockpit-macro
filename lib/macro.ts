import type { MacroIndicator, Observation } from "./types";
import { getMacroIndicators } from "./data";
import { observationsOf, type ObservationsBySeries } from "./observations";

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

export type RecentMacroChange = {
  indicator: MacroIndicator;
  date: string;
  value: number;
  previous: Observation | null;
  variation: number | null;
};

/**
 * Les indicateurs dont le dernier relevé date de moins de `windowDays` jours — un nouveau
 * chiffre réellement publié cette semaine, pas une reconfirmation d'une valeur inchangée (la
 * distinction fraîcheur / retard de publication du cahier des charges : ici c'est la date du
 * relevé qui compte, pas `fetchedAt`). Triés du plus récent au plus ancien.
 *
 * Toutes zones confondues, indépendamment du sélecteur de zone de l'onglet Macro : c'est un
 * résumé de ce qui a bougé cette semaine dans l'ensemble de la couverture macro, pas une vue
 * filtrée par zone.
 */
export function recentMacroChanges(
  indicators: MacroIndicator[],
  bySeries: ObservationsBySeries,
  now: Date,
  windowDays = 7,
): RecentMacroChange[] {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const changes: RecentMacroChange[] = [];
  for (const indicator of indicators) {
    const obs = [...observationsOf(bySeries, indicator.id)].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const latest = obs.at(-1);
    if (!latest || latest.date < cutoffIso) continue;
    const previous = obs.length > 1 ? obs[obs.length - 2] : null;
    changes.push({
      indicator,
      date: latest.date,
      value: latest.value,
      previous,
      variation: previous ? latest.value - previous.value : null,
    });
  }

  return changes.sort((a, b) => b.date.localeCompare(a.date) || a.indicator.id.localeCompare(b.indicator.id));
}
