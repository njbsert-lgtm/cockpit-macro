import type { ScenarioVersion } from "@/lib/types";

/**
 * Réécrit intégralement à chaque passage de `scripts/rediger-hebdo.mts` — ne pas éditer à la
 * main, voir `content/generated/README.md`. Ce fichier ne porte que les versions de scénario
 * produites par la rédaction automatique de la note hebdomadaire ; `content/scenarios.ts` reste
 * la source de vérité manuelle, jamais touchée par le pipeline.
 */
export const GENERATED_SCENARIO_VERSIONS: ScenarioVersion[] = [];
