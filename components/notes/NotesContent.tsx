import { getActiveDrivers, getLatestNote, getNotesRevising } from "@/lib/content";
import { buildArchiveWeeks } from "@/lib/archive";
import { RegimeHeader } from "./RegimeHeader";
import { NoteBlocks } from "./NoteBlocks";
import { ArchiveList } from "./ArchiveList";
import { EmptyState } from "@/components/states/EmptyState";

// Démonstration délibérée de l'état de chargement : aucune E/S réelle à cette étape (pas
// d'API), seulement un import direct du seed figé — le délai rend le squelette observable.
async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function NotesContent() {
  await simulateLoad();

  const latestNote = getLatestNote();
  const weeks = buildArchiveWeeks();
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
              title="Aucune note n'a encore été publiée"
              description="La première note hebdomadaire fera apparaître le régime en une phrase et les drivers en en-tête."
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
              drivers={drivers.map((d) => ({ id: d.id, label: d.label }))}
              revisionsBySlug={revisionsBySlug}
            />
          </div>
        </section>
      </div>
    </>
  );
}
