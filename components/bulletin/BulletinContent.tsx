import Link from "next/link";
import type { Zone } from "@/lib/types";
import { getCurrentScenarioBranches } from "@/lib/data";
import { getLatestEditionForZone, buildArchiveWeeks } from "@/lib/bulletin";
import { BRANCH_ORDER, FAMILY_LABELS, FAMILY_ORDER } from "@/lib/scenario-labels";
import { ZONE_LABELS } from "@/lib/zones";
import { RegimeHeader } from "./RegimeHeader";
import { EditionBlocks } from "./EditionBlocks";
import { ScenarioFamilyTabs } from "./ScenarioFamilyTabs";
import { ArchiveList } from "./ArchiveList";
import { EmptyState } from "@/components/states/EmptyState";

// Démonstration délibérée de l'état de chargement : aucune E/S réelle à cette étape (pas
// d'API), seulement un import direct du seed figé — le délai rend le squelette observable.
async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function BulletinContent({ zone }: { zone: Zone }) {
  await simulateLoad();

  const latestEdition = getLatestEditionForZone(zone);
  const weeks = buildArchiveWeeks(zone);

  return (
    <>
      {latestEdition ? (
        <RegimeHeader edition={latestEdition} />
      ) : (
        <div className="bg-deep px-4 py-8 md:px-6">
          <div className="mx-auto max-w-content">
            <EmptyState
              title={`Aucune édition ne couvre ${ZONE_LABELS[zone]} pour l'instant`}
              description="Le bulletin se construit zone par zone. En attendant, consultez la lecture Émergents ou Global, qui couvrent déjà cette zone dans leurs éditions transversales."
              action={
                <Link
                  href="/bulletin?zone=global"
                  className="inline-block border border-white/40 bg-white/10 px-3 py-1.5 font-mono text-12-5 text-white hover:bg-white/20"
                >
                  Voir le bulletin Global
                </Link>
              }
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-content px-4 py-8 md:px-6">
        {latestEdition && (
          <section>
            <p className="mb-2 font-mono text-11 uppercase tracking-wider text-mute">
              Dernière édition
            </p>
            <EditionBlocks edition={latestEdition} />
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-22 font-extrabold text-ink">Scénarios</h2>
          <p className="mt-1 max-w-[64ch] text-15 text-mute">
            État courant de chaque famille. Cliquez une branche pour voir sa thèse et ses
            impacts par classe d&rsquo;actifs.
          </p>
          {FAMILY_ORDER.map((familyId) => {
            const current = getCurrentScenarioBranches(familyId);
            const ordered = BRANCH_ORDER[familyId]
              .map((id) => current.find((b) => b.branchId === id))
              .filter((b): b is NonNullable<typeof b> => Boolean(b));
            const central = ordered.find((b) => b.likelihood === "central");
            return (
              <ScenarioFamilyTabs
                key={familyId}
                title={FAMILY_LABELS[familyId]}
                branches={ordered}
                centralBranchId={central?.branchId ?? null}
              />
            );
          })}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-22 font-extrabold text-ink">Archive</h2>
          <p className="mt-1 max-w-[64ch] text-15 text-mute">
            Les hebdos forment la colonne vertébrale ; les spéciales sont indentées sous leur
            semaine. Un trou signale une semaine sans hebdo publiée.
          </p>
          <div className="mt-4">
            <ArchiveList weeks={weeks} zone={zone} />
          </div>
        </section>
      </div>
    </>
  );
}
