import { getFreshnessSummary, getOverallTier } from "@/lib/freshness-summary";
import { FreshnessPanel } from "./FreshnessPanel";

/**
 * Calculé sur le serveur depuis `series_health` : la fraîcheur n'est plus déduite du seed
 * embarqué dans le bundle, elle vient de l'état réel de la collecte. Seule l'ouverture du
 * panneau reste côté client.
 */
export async function FreshnessIndicator() {
  const summary = await getFreshnessSummary();
  return <FreshnessPanel summary={summary} tier={getOverallTier(summary)} />;
}
