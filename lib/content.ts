import { TRENDS } from "@/content/tendances";
import { SCENARIO_VERSIONS } from "@/content/scenarios";
import { getInstruments } from "./data";
import {
  parseEdition,
  readEditionSources,
  validateCorpus,
  type ParsedEdition,
} from "./editions";
import type { Edition, ScenarioFamilyId, Zone } from "./types";
import { zoneMatches } from "./zones";

// ---------------------------------------------------------------------------
// Éditions — chargées et validées une fois, à l'initialisation du module.
// ---------------------------------------------------------------------------

function loadEditions(): { meta: Edition[]; bodies: Map<string, string> } {
  const parsed: ParsedEdition[] = readEditionSources().map(({ slug, source }) =>
    parseEdition(slug, source),
  );

  const meta = validateCorpus(parsed, {
    trendIds: new Set(TRENDS.map((t) => t.id)),
    instrumentIds: new Set(getInstruments().map((i) => i.id)),
  });

  return {
    meta,
    bodies: new Map(parsed.map((p) => [p.meta.slug, p.body])),
  };
}

// Toute violation lève ici. `generateStaticParams` sur /bulletin/[slug] touche ce module
// pendant `next build`, ce qui fait échouer le build sur une édition invalide — le gabarit
// « refuse de compiler si un bloc manque », comme l'exige le cahier des charges.
const EDITIONS = loadEditions();

export function getEditions(): Edition[] {
  return EDITIONS.meta;
}

export function getEdition(slug: string): Edition | null {
  return EDITIONS.meta.find((e) => e.slug === slug) ?? null;
}

/** Le corps MDX brut d'une édition, à compiler par le composant qui l'affiche. */
export function getEditionBody(slug: string): string | null {
  return EDITIONS.bodies.get(slug) ?? null;
}

export function getEditionsByZone(zone: Zone): Edition[] {
  return EDITIONS.meta.filter((e) => zoneMatches(e.zones, zone));
}

/** La dernière édition en date, tous types confondus (hebdo ou spéciale). */
export function getLatestEdition(): Edition | null {
  return [...EDITIONS.meta].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function getSpecialsOf(isoWeek: string): Edition[] {
  return EDITIONS.meta.filter((e) => e.kind === "speciale" && e.parentWeek === isoWeek);
}

// ---------------------------------------------------------------------------
// Tendances
// ---------------------------------------------------------------------------

export function getTrends() {
  return TRENDS;
}

export function getTrend(id: string) {
  return TRENDS.find((t) => t.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Scénarios
// ---------------------------------------------------------------------------

/**
 * « Une révision sans justification écrite est interdite » — règle du cahier des charges que
 * le typage seul ne peut pas exprimer, donc vérifiée au chargement.
 */
function validateScenarios() {
  for (const v of SCENARIO_VERSIONS) {
    if (v.likelihoodChangedFrom && !v.why.trim()) {
      throw new Error(
        `content/scenarios.ts — ${v.familyId}/${v.branchId} v${v.version} : la vraisemblance passe de ` +
          `« ${v.likelihoodChangedFrom} » à « ${v.likelihood} » sans justification. Une révision sans « why » est interdite.`,
      );
    }
  }
}
validateScenarios();

export function getScenarioVersions() {
  return SCENARIO_VERSIONS;
}

export function getScenarioVersionsByFamily(familyId: string) {
  return SCENARIO_VERSIONS.filter((s) => s.familyId === familyId);
}

/** Dernière version de chaque branche d'une famille — l'état courant. */
export function getCurrentScenarioBranches(familyId: ScenarioFamilyId | string) {
  const versions = getScenarioVersionsByFamily(familyId);
  const byBranch = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    const current = byBranch.get(v.branchId);
    if (!current || v.version > current.version) byBranch.set(v.branchId, v);
  }
  return [...byBranch.values()];
}
