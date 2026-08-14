import { DRIVERS } from "@/content/drivers";
import { TRENDS } from "@/content/tendances";
import { SCENARIO_VERSIONS } from "@/content/scenarios";
import { getInstruments } from "./data";
import { checkIntegrity, currentVersion } from "./integrity";
import { activeDrivers, deriveDrivers } from "./drivers";
import {
  parseEdition,
  readEditionSources,
  validateEditionChain,
  type ParsedEdition,
} from "./editions";
import type { Driver, Edition, Trend, Zone } from "./types";
import { zoneMatches } from "./zones";

// ---------------------------------------------------------------------------
// Chargement + contrôle d'intégrité, une fois, à l'initialisation du module.
// ---------------------------------------------------------------------------

function loadContent() {
  const parsed: ParsedEdition[] = readEditionSources().map(({ slug, source }) =>
    parseEdition(slug, source),
  );

  // Règles propres à la chaîne des éditions (comparesTo, récapitulatif des spéciales).
  const editions = validateEditionChain(parsed);

  // Puis l'intégrité de tout le graphe, d'un seul tenant. Toute référence morte lève ici :
  // rien ne peut produire un lien mort à l'écran, le build échoue avant.
  checkIntegrity({
    drivers: DRIVERS,
    trends: TRENDS,
    editions,
    scenarios: SCENARIO_VERSIONS,
    instrumentIds: new Set(getInstruments().map((i) => i.id)),
  });

  return {
    editions,
    bodies: new Map(parsed.map((p) => [p.meta.slug, p.body])),
    drivers: deriveDrivers(DRIVERS, editions, SCENARIO_VERSIONS),
  };
}

const CONTENT = loadContent();

// ---------------------------------------------------------------------------
// Éditions
// ---------------------------------------------------------------------------

export function getEditions(): Edition[] {
  return CONTENT.editions;
}

export function getEdition(slug: string): Edition | null {
  return CONTENT.editions.find((e) => e.slug === slug) ?? null;
}

/** Le corps MDX brut d'une édition, à compiler par le composant qui l'affiche. */
export function getEditionBody(slug: string): string | null {
  return CONTENT.bodies.get(slug) ?? null;
}

export function getEditionsByZone(zone: Zone): Edition[] {
  return CONTENT.editions.filter((e) => zoneMatches(e.zones, zone));
}

/** La dernière édition en date, tous types confondus (hebdo ou spéciale). */
export function getLatestEdition(): Edition | null {
  return [...CONTENT.editions].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function getSpecialsOf(isoWeek: string): Edition[] {
  return CONTENT.editions.filter((e) => e.kind === "speciale" && e.parentWeek === isoWeek);
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export function getDrivers(): Driver[] {
  return CONTENT.drivers;
}

export function getDriver(id: string): Driver | null {
  return CONTENT.drivers.find((d) => d.id === id) ?? null;
}

/** Les drivers à afficher en carte, dans l'ordre d'intensité de la dernière édition. */
export function getActiveDrivers(): Driver[] {
  const latest = getLatestEdition();
  return activeDrivers(CONTENT.drivers, latest?.date ?? "9999-12-31");
}

/** Inverse de `Driver.instrumentRefs` — calculé, jamais stocké. */
export function getDriversForInstrument(instrumentId: string): Driver[] {
  return CONTENT.drivers.filter((d) => d.instrumentRefs.includes(instrumentId));
}

/** Les éditions qui ont révisé ce driver, du plus récent au plus ancien. */
export function getEditionsRevising(driverId: string): Edition[] {
  const slugs = new Set(
    SCENARIO_VERSIONS.filter((s) => s.driverId === driverId).map((s) => s.editionSlug),
  );
  return CONTENT.editions
    .filter((e) => slugs.has(e.slug))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// Tendances
// ---------------------------------------------------------------------------

export function getTrends(): Trend[] {
  return TRENDS;
}

export function getTrend(id: string): Trend | null {
  return TRENDS.find((t) => t.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Scénarios
// ---------------------------------------------------------------------------

export function getScenarioVersions() {
  return SCENARIO_VERSIONS;
}

export function getScenarioVersionsByDriver(driverId: string) {
  return SCENARIO_VERSIONS.filter((s) => s.driverId === driverId);
}

/** Dernière version de chaque branche d'un driver — l'état courant. */
export function getCurrentBranches(driverId: string) {
  const branches = [
    ...new Set(getScenarioVersionsByDriver(driverId).map((s) => s.branchId)),
  ];
  return branches
    .map((b) => currentVersion(SCENARIO_VERSIONS, driverId, b))
    .filter((v): v is NonNullable<typeof v> => v !== null);
}
