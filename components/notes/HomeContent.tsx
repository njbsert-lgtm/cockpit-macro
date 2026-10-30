import {
  getActiveDriversWithBranches,
  getDrivers,
  getLatestNote,
  getNoteBody,
  getScenarioVersions,
} from "@/lib/content";
import { chargerChiffresAccueil } from "@/lib/chiffres-vivants-load";
import { changementsDepuis } from "@/lib/depuis";
import { BRANCH_LABELS } from "@/lib/scenario-labels";
import { getReadClient } from "@/lib/supabase";
import { lireAnglesMorts, vueAccueil } from "@/lib/angles-morts";
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
  // `null` quand la table est illisible : la page affiche « Non mesuré », jamais un zéro.
  const anglesMorts = vueAccueil(
    await lireAnglesMorts(getReadClient()),
    new Date(),
    Object.fromEntries(drivers.map(({ driver }) => [driver.id, driver.label])),
  );

  if (!latestNote) {
    return (
      <div className="px-4.5 py-7 md:px-6">
        <div className="mx-auto max-w-colonne md:max-w-content">
          <EmptyState
            title="Aucune note n'a encore été publiée"
            description="La première note hebdomadaire fera apparaître le régime en une phrase et les drivers en en-tête."
          />
        </div>
      </div>
    );
  }

  const chiffres = await chargerChiffresAccueil(latestNote);
  const depuis = changementsDepuis({
    note: latestNote,
    body: getNoteBody(latestNote.slug),
    versions: getScenarioVersions(),
    driverLabels: Object.fromEntries(getDrivers().map((d) => [d.id, d.label])),
    branchLabels: BRANCH_LABELS,
    aujourdhui: new Date().toISOString().slice(0, 10),
  });

  return (
    <>
      <RegimeHeader
        note={latestNote}
        chiffres={chiffres}
        depuis={depuis}
        drivers={drivers}
        anglesMorts={anglesMorts}
      />
      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <NotesShelf />
      </div>
    </>
  );
}
