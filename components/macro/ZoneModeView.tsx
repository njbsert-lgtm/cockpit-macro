import Link from "next/link";
import type { Zone } from "@/lib/types";
import { getInstruments, getMacroIndicator, getMacroIndicatorsByZone } from "@/lib/data";
import { getDrivers, getLatestNote } from "@/lib/content";
import { resoudreCible } from "@/lib/chiffres-vivants";
import { loadMacroObservations, observationsOf } from "@/lib/observations";
import { zoneAncestors, ZONE_LABELS } from "@/lib/zones";
import { EmptyState } from "@/components/states/EmptyState";
import { CetteSemaine } from "./CetteSemaine";
import { IndicatorCard } from "./IndicatorCard";
import { ListeDense } from "./ListeDense";

/** Les indicateurs macro que la dernière note reprend parmi ses chiffres clés. */
function citesParLaDerniereNote(): { ids: Set<string>; semaine: string | null } {
  const note = getLatestNote();
  if (!note) return { ids: new Set(), semaine: null };
  const catalogue = {
    indicateurExiste: (id: string) => getMacroIndicator(id) !== null,
    instruments: getInstruments(),
  };
  const ids = new Set(
    note.keyIndicators
      .map((c) => resoudreCible(c, note, catalogue))
      .filter((c) => c?.kind === "macro")
      .map((c) => c!.id),
  );
  return { ids, semaine: note.isoWeek.split("-")[1] ?? null };
}

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
  const cites = citesParLaDerniereNote();
  const ids = new Set(indicators.map((i) => i.id));
  const drivers = getDrivers().filter((d) => !d.retiredAt && d.macroRefs.some((r) => ids.has(r)));

  return (
    <div className="flex flex-col gap-8">
      <CetteSemaine indicatorIds={indicators.map((i) => i.id)} />
      {groupKeys.map((groupZone) => {
        const inGroup = indicators.filter((i) => i.zone === groupZone);
        if (inGroup.length === 0) return null;
        const inherited = groupZone !== zone;

        return (
          <section key={groupZone}>
            <h3 className="border-b-2 border-encre pb-2 text-13 font-semibold uppercase tracking-cap text-encre">
              {ZONE_LABELS[groupZone]}
              {inherited && (
                <span className="ml-2 font-normal normal-case text-tenu">
                  — hérité par la zone sélectionnée ({ZONE_LABELS[zone]})
                </span>
              )}
            </h3>
            <div className="mt-3 md:hidden">
              <ListeDense
                indicators={inGroup}
                observations={bySeries}
                citesParLaNote={cites.ids}
                semaine={cites.semaine}
              />
            </div>
            <div className="mt-3 hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
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
      {drivers.length > 0 && (
        <nav aria-label="Drivers liés" className="flex flex-col gap-2">
          {drivers.map((d) => (
            <Link
              key={d.id}
              href={`/notes/drivers/${d.id}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-rp border border-trait px-4 text-13 text-encre transition-colors hover:border-trait-f"
            >
              <span>
                Ces indicateurs répondent au driver <span className="font-semibold">{d.label}</span>
              </span>
              <span aria-hidden>›</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
