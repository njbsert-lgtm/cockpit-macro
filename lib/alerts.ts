import { getAlertEvents, getAlertRules } from "./data";
import type { AlertEvent, AlertRule } from "./types";

/**
 * L'instrument visé par une règle. Les règles de spread pointent vers les deux jambes ; c'est
 * l'instrument dérivé qui porte la série et les alertes, d'où la reconstruction de son id
 * selon la convention posée à l'étape 1 : `spread-<longue>-<courte>`.
 */
export function ruleInstrumentId(rule: AlertRule): string {
  return rule.target.kind === "instrument"
    ? rule.target.instrumentId
    : `spread-${rule.target.longLegId}-${rule.target.shortLegId}`;
}

/**
 * `nonCollecte` : aucun moteur d'alertes ne tourne encore, tous les événements viennent de
 * `data/seed.json` — écrits à la main pour éprouver l'affichage, jamais déclenchés par une
 * clôture réelle. Le jour où le moteur écrit en base, ses événements porteront `false`.
 */
export type InstrumentAlert = { rule: AlertRule; event: AlertEvent; nonCollecte: boolean };

/** Les alertes déclenchées sur un instrument, de la plus récente à la plus ancienne. */
export function getAlertsForInstrument(instrumentId: string): InstrumentAlert[] {
  const rules = new Map(
    getAlertRules()
      .filter((r) => ruleInstrumentId(r) === instrumentId)
      .map((r) => [r.id, r]),
  );

  return getAlertEvents()
    .filter((e) => rules.has(e.ruleId))
    .sort((a, b) => b.firedAt.localeCompare(a.firedAt))
    .map((event) => ({ rule: rules.get(event.ruleId)!, event, nonCollecte: true }));
}
