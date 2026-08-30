import type { TrendDelta } from "@/lib/types";

/**
 * Réécrit intégralement à chaque publication depuis /redaction — ne pas éditer à la main, voir
 * `content/generated/README.md`. Chaque entrée allonge le `statusHistory` d'une tendance déjà
 * déclarée dans `content/tendances.ts`, jamais touché par le pipeline.
 */
export const GENERATED_TREND_DELTAS: TrendDelta[] = [];
