import seedJson from "@/data/seed.json";
import type { Seed, Zone } from "./types";
import { zoneMatches } from "./zones";

// Import direct du JSON, pas de fetch : données figées, aucun accès réseau à cette étape.
const seed = seedJson as unknown as Seed;

export function getInstruments() {
  return seed.instruments;
}

export function getInstrument(id: string) {
  return seed.instruments.find((i) => i.id === id) ?? null;
}

export function getInstrumentsByZone(zone: Zone) {
  return seed.instruments.filter((i) => zoneMatches(i.zones, zone));
}

export function getInstrumentsByAssetClass(assetClass: string, zone?: Zone) {
  const inClass = seed.instruments.filter((i) => i.assetClass === assetClass);
  return zone ? inClass.filter((i) => zoneMatches(i.zones, zone)) : inClass;
}

export function getObservations(instrumentId: string) {
  return seed.observations.filter((o) => o.instrumentId === instrumentId);
}

export function getMacroIndicators() {
  return seed.macroIndicators;
}

export function getMacroIndicatorsByZone(zone: Zone) {
  return seed.macroIndicators.filter((m) => zoneMatches([m.zone], zone));
}

export function getMacroIndicator(id: string) {
  return seed.macroIndicators.find((m) => m.id === id) ?? null;
}

export function getMacroObservations(indicatorId: string) {
  return seed.macroObservations.filter((o) => o.instrumentId === indicatorId);
}

export function getTrends() {
  return seed.trends;
}

export function getTrend(id: string) {
  return seed.trends.find((t) => t.id === id) ?? null;
}

export function getEditions() {
  return seed.editions;
}

export function getEdition(slug: string) {
  return seed.editions.find((e) => e.slug === slug) ?? null;
}

export function getEditionsByZone(zone: Zone) {
  return seed.editions.filter((e) => zoneMatches(e.zones, zone));
}

/** La dernière édition en date, tous types confondus (hebdo ou spéciale). */
export function getLatestEdition() {
  return [...seed.editions].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function getSpecialsOf(isoWeek: string) {
  return seed.editions.filter((e) => e.kind === "speciale" && e.parentWeek === isoWeek);
}

export function getAlertRules() {
  return seed.alertRules;
}

export function getAlertEvents() {
  return seed.alertEvents;
}

export function getScenarioVersions() {
  return seed.scenarioVersions;
}

export function getScenarioVersionsByFamily(familyId: string) {
  return seed.scenarioVersions.filter((s) => s.familyId === familyId);
}

/** Dernière version de chaque branche d'une famille — l'état courant. */
export function getCurrentScenarioBranches(familyId: string) {
  const versions = getScenarioVersionsByFamily(familyId);
  const byBranch = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    const current = byBranch.get(v.branchId);
    if (!current || v.version > current.version) byBranch.set(v.branchId, v);
  }
  return [...byBranch.values()];
}
