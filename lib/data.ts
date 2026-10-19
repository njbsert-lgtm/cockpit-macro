import seedJson from "@/data/seed.json";
import type { MacroIndicator, Seed, Zone } from "./types";
import { zoneMatches } from "./zones";
import { prochainePublication } from "@/config/calendrier-publications";

/**
 * Accès aux **données** uniquement — ce qui viendra d'APIs publiques à l'étape 3.
 * L'analyse (notes, tendances, scénarios) est servie par `lib/content.ts`, qui lit des
 * fichiers versionnés : les deux natures de contenu ne se mélangent jamais dans le code.
 *
 * Import direct du JSON, pas de fetch : données figées, aucun accès réseau à cette étape.
 */
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

/**
 * La prochaine publication vient du calendrier relevé dans `config/calendrier-publications.ts`,
 * lue à chaque appel : la date retenue avance d'elle-même quand la précédente est passée.
 */
function avecProchainePublication(indicator: MacroIndicator): MacroIndicator {
  return { ...indicator, nextRelease: prochainePublication(indicator.id) };
}

export function getMacroIndicators() {
  return seed.macroIndicators.map(avecProchainePublication);
}

export function getMacroIndicatorsByZone(zone: Zone) {
  return seed.macroIndicators
    .filter((m) => zoneMatches([m.zone], zone))
    .map(avecProchainePublication);
}

export function getMacroIndicator(id: string) {
  const indicator = seed.macroIndicators.find((m) => m.id === id);
  return indicator ? avecProchainePublication(indicator) : null;
}

export function getMacroObservations(indicatorId: string) {
  return seed.macroObservations.filter((o) => o.instrumentId === indicatorId);
}

export function getAlertRules() {
  return seed.alertRules;
}

export function getAlertEvents() {
  return seed.alertEvents;
}
