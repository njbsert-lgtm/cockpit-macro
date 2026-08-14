import Link from "next/link";
import type { Zone } from "@/lib/types";
import { getActiveDrivers, getNotesRevising } from "@/lib/content";
import { getLatestNoteForZone, buildArchiveWeeks } from "@/lib/archive";
import { ZONE_LABELS } from "@/lib/zones";
import { RegimeHeader } from "./RegimeHeader";
import { NoteBlocks } from "./NoteBlocks";
import { ArchiveList } from "./ArchiveList";
import { EmptyState } from "@/components/states/EmptyState";

// Démonstration délibérée de l'état de chargement : aucune E/S réelle à cette étape (pas
// d'API), seulement un import direct du seed figé — le délai rend le squelette observable.
async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function NotesContent({ zone }: { zone: Zone }) {
  await simulateLoad();

  const latestNote = getLatestNoteForZone(zone);
  const weeks = buildArchiveWeeks(zone);
  const drivers = getActiveDrivers();

  // Inverse de « quelles notes ont révisé ce driver ? », calculé une fois pour le filtre
  // d'archive — le composant est client, il ne peut pas résoudre le contenu lui-même.
  const revisionsBySlug: Record<string, string[]> = {};
  for (const driver of drivers) {
    for (const note of getNotesRevising(driver.id)) {
      (revisionsBySlug[note.slug] ??= []).push(driver.id);
    }
  }

  return (
    <>
      {latestNote ? (
        <RegimeHeader note={latestNote} drivers={drivers} />
      ) : (
        <div className="bg-deep px-4 py-8 md:px-6">
          <div className="mx-auto max-w-content">
            <EmptyState
              title={`Aucune note ne couvre ${ZONE_LABELS[zone]} pour l'instant`}
              description="Les notes se construisent zone par zone. En attendant, consultez la lecture Émergents ou Global, qui couvrent déjà cette zone dans leurs notes transversales."
              action={
                <Link
                  href="/notes?zone=global"
                  className="inline-block border border-white/40 bg-white/10 px-3 py-1.5 font-mono text-12-5 text-white hover:bg-white/20"
                >
                  Voir les notes de la zone Global
                </Link>
              }
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-content px-4 py-8 md:px-6">
        {latestNote && (
          <section>
            <p className="mb-2 font-mono text-11 uppercase tracking-wider text-mute">
              Dernière note
            </p>
            <NoteBlocks note={latestNote} />
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-22 font-extrabold text-ink">Archive</h2>
          <p className="mt-1 max-w-[64ch] text-15 text-mute">
            Les hebdos forment la colonne vertébrale ; les spéciales sont indentées sous leur
            semaine. Un trou signale une semaine sans hebdo publiée.
          </p>
          <div className="mt-4">
            <ArchiveList
              weeks={weeks}
              zone={zone}
              drivers={drivers.map((d) => ({ id: d.id, label: d.label }))}
              revisionsBySlug={revisionsBySlug}
            />
          </div>
        </section>
      </div>
    </>
  );
}
