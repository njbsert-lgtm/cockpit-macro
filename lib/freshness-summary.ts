import type { Zone } from "./types";
import { zoneMatches } from "./zones";
import { freshnessTier, type FreshnessTier, worstTier } from "./freshness";
import {
  getInstrumentsByZone,
  getMacroIndicatorsByZone,
  getObservations,
  getMacroObservations,
} from "./data";

export type SourceFreshness = {
  source: string;
  fetchedAt: string;
  tier: FreshnessTier;
};

/**
 * Point de fraîcheur par source pour une zone : le relevé le plus ancien de chaque source
 * (le pire cas), pas le plus récent — c'est ce qui doit piloter l'alerte visuelle.
 */
export function getFreshnessSummaryForZone(
  zone: Zone,
  now: Date = new Date(),
): SourceFreshness[] {
  const oldestBySource = new Map<string, string>();

  const record = (source: string, fetchedAt: string) => {
    const current = oldestBySource.get(source);
    if (!current || fetchedAt < current) oldestBySource.set(source, fetchedAt);
  };

  for (const instrument of getInstrumentsByZone(zone)) {
    const obs = getObservations(instrument.id);
    const latest = [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    if (latest) record(latest.source, latest.fetchedAt);
  }

  for (const indicator of getMacroIndicatorsByZone(zone)) {
    if (!zoneMatches([indicator.zone], zone)) continue;
    const obs = getMacroObservations(indicator.id);
    const latest = [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    if (latest) record(latest.source, latest.fetchedAt);
  }

  return [...oldestBySource.entries()]
    .map(([source, fetchedAt]) => ({ source, fetchedAt, tier: freshnessTier(fetchedAt, now) }))
    .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
}

export function getOverallTier(summary: SourceFreshness[]): FreshnessTier {
  return worstTier(summary.map((s) => s.tier));
}
