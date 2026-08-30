import { getActiveDriversWithBranches, getLatestNote } from "@/lib/content";
import { getPendingVeilleCount } from "@/lib/veille/queries";
import { brouillonsDisponibles } from "@/lib/redaction/portail";
import { RegimeHeader } from "./RegimeHeader";
import { NotesShelf } from "./NotesShelf";
import { EmptyState } from "@/components/states/EmptyState";

// Démonstration délibérée de l'état de chargement : aucune E/S réelle à cette étape (pas
// d'API), seulement un import direct du seed figé — le délai rend le squelette observable.
async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/** L'écran d'accueil : couche 1 (régime + drivers) puis couche 2 (l'étagère des notes). */
export async function HomeContent() {
  await simulateLoad();

  const latestNote = getLatestNote();
  const drivers = getActiveDriversWithBranches();
  const pendingVeilleCount = await getPendingVeilleCount();
  // Synchrone, disque seulement — pas d'appel Supabase pour ce compteur.
  const pendingRedactionCount = brouillonsDisponibles().length;

  if (!latestNote) {
    return (
      <div className="bg-encre px-4.5 py-7 md:px-6">
        <div className="mx-auto max-w-colonne md:max-w-content">
          <EmptyState
            title="Aucune note n'a encore été publiée"
            description="La première note hebdomadaire fera apparaître le régime en une phrase et les drivers en en-tête."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <RegimeHeader
        note={latestNote}
        drivers={drivers}
        pendingVeilleCount={pendingVeilleCount}
        pendingRedactionCount={pendingRedactionCount}
      />
      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <NotesShelf />
      </div>
    </>
  );
}
