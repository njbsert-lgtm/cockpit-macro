import { getInstruments } from "@/lib/data";
import type { ContextePaquet } from "./context";
import type { Vivier } from "./sortie-mixte";

/**
 * La forme interne du brouillon, et le vivier qui borne ce que le modèle peut citer.
 *
 * **Ce module ne construit plus de schéma pour l'API.** Il l'a fait jusqu'à ce que quatre runs
 * réels échouent à la compilation de la sortie structurée (« The compiled grammar is too
 * large ») : le contrat de sortie vit maintenant dans `sortie-mixte.ts`, et la validation
 * s'exécute chez nous, après réception. Ce qui reste ici, c'est ce que le pipeline manipule
 * une fois la réponse reçue — `Brouillon` — et ce qui décide de ce qui est citable — `Vivier`.
 *
 * Principe inchangé, et c'est le seul qui compte : toute référence sortante est confrontée à
 * ce qui existe, jamais laissée à une chaîne libre. Le modèle n'écrit jamais d'URL ; il choisit
 * un `sourceId` dans un vivier fermé, et une citation inventée n'a pas de représentation valide.
 *
 * Deux catégories de champs n'y figurent jamais :
 * - les identifiants structurels (`date`, `slug`, `comparesTo`, `version`, `noteSlug`),
 *   calculés par `context.ts` ;
 * - l'objet `Driver` complet pour un nouveau driver — seul un texte libre consultatif est
 *   permis, l'objet structuré restant une proposition à valider à la main.
 */

export type Brouillon = {
  regimeStatement: string;
  keyIndicators: Array<{ label: string; value: string }>;
  channels: string[];
  driverOrder: string[];
  trendRefs: string[];
  instrumentRefs: string[];
  veilleItemRefs: string[];
  blocs: Record<string, string>;
  sources: Array<{ block: string; sourceId: string }>;
  scenarioRevisions: Array<{
    driverId: string;
    branches: Array<{
      branchId: string;
      likelihood: "central" | "moderee" | "faible";
      why: string;
      thesis: string;
      /** Tableau de quatre entrées, une par classe d'actifs. `impactsVersRecord` le reconvertit. */
      impacts: Array<{
        classe: "eq" | "fi" | "fx" | "cm";
        direction: "up" | "down" | "flat";
        label: string;
        text: string;
      }>;
      watchSignals: string;
    }>;
  }>;
  trendUpdates: Array<{
    trendId: string;
    status: "renforce" | "maintient" | "affaiblit" | "invalidee";
    why: string;
  }>;
  guets: Array<{
    driverId: string;
    axeLibelle: string | null;
    libelle: string;
    attendu: string;
    confirmeSi: string;
    infirmeSi: string;
    echeance: string | null;
    sourceAttendue: string[];
  }>;
  driverCandidate: string | null;
  redactionNotes: string;
};

export type { Vivier };

/** Ce que le modèle a le droit de citer, par bloc — bâti sur le contexte, jamais deviné. */
export function construireVivier(paquet: ContextePaquet, blocsAttendus: string[]): Vivier {
  const branchesParDriver = new Map<string, string[]>();
  for (const version of paquet.scenariosCourants) {
    const branches = branchesParDriver.get(version.driverId) ?? [];
    if (!branches.includes(version.branchId)) branches.push(version.branchId);
    branchesParDriver.set(version.driverId, branches);
  }

  // `Note.instrumentRefs` n'a de sens que pour des instruments de marché — c'est ce que
  // `lib/integrity.ts` valide, et c'est ce que la fiche instrument sait résoudre. Un indicateur
  // macro peut figurer dans `paquet.observations` (pour être cité en prose, contrôlé comme
  // n'importe quel chiffre) sans pour autant devenir un `instrumentRefs` citable : les deux
  // catalogues ne se recoupent jamais, même ici.
  const idsInstruments = new Set(getInstruments().map((i) => i.id));

  return {
    driverIds: [...branchesParDriver.keys()].sort(),
    branchesParDriver,
    trendIds: paquet.tendancesCourantes.map((t) => t.id).sort(),
    instrumentIds: paquet.observations
      .map((o) => o.instrumentId)
      .filter((id) => idsInstruments.has(id))
      .sort(),
    veilleItemIds: paquet.itemsVeille.map((i) => i.id),
    sourceIds: [
      ...paquet.itemsVeille.map((i) => i.id),
      ...(paquet.ficheNotion?.sources ?? []),
    ],
    blocsAttendus,
    budgetGuets: paquet.budgetGuets,
  };
}
