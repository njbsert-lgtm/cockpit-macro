import type { ScenarioVersion } from "@/lib/types";

/**
 * Réécrit intégralement à chaque publication depuis /redaction — ne pas éditer à la main, voir
 * `content/generated/README.md`. Ce fichier ne porte que les versions de scénario produites par
 * les révisions acceptées au portail ; `content/scenarios.ts` reste la source de vérité
 * manuelle, jamais touchée par le pipeline.
 */
export const GENERATED_SCENARIO_VERSIONS: ScenarioVersion[] = [];
