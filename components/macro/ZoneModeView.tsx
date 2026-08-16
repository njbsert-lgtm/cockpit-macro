import type { Zone } from "@/lib/types";
import { getMacroIndicatorsByZone } from "@/lib/data";
import { loadMacroObservations, observationsOf } from "@/lib/observations";
import { zoneAncestors, ZONE_LABELS } from "@/lib/zones";
import { EmptyState } from "@/components/states/EmptyState";
import { IndicatorCard } from "./IndicatorCard";

export async function ZoneModeView({ zone }: { zone: Zone }) {
  const indicators = getMacroIndicatorsByZone(zone);

  if (indicators.length === 0) {
    return (
      <EmptyState
        title={`Aucun indicateur suivi pour ${ZONE_LABELS[zone]}`}
        description="La couverture macro se construit zone par zone à l'étape 3. Pour l'instant, aucune série n'est encore associée à cette zone."
      />
    );
  }

  const order = zone === "global" ? undefined : zoneAncestors(zone);
  const groupKeys = order ?? [...new Set(indicators.map((i) => i.zone))].sort();
  // Un seul chargement pour toute la grille, avant le rendu : les cartes sont construites
  // dans le JSX, où l'on ne peut pas attendre une promesse par carte.
  const bySeries = await loadMacroObservations(indicators.map((i) => i.id));

  return (
    <div className="flex flex-col gap-8">
      {groupKeys.map((groupZone) => {
        const inGroup = indicators.filter((i) => i.zone === groupZone);
        if (inGroup.length === 0) return null;
        const inherited = groupZone !== zone;

        return (
          <section key={groupZone}>
            <h3 className="border-b-2 border-ink pb-2 font-mono text-13 font-semibold uppercase tracking-wider text-ink">
              {ZONE_LABELS[groupZone]}
              {inherited && (
                <span className="ml-2 font-normal normal-case text-mute">
                  — hérité par la zone sélectionnée ({ZONE_LABELS[zone]})
                </span>
              )}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inGroup.map((indicator) => (
                <IndicatorCard
                  key={indicator.id}
                  indicator={indicator}
                  observations={observationsOf(bySeries, indicator.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
