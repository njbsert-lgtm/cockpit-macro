import { currentVersion } from "@/lib/integrity";
import type { Brouillon } from "./schema";
import type { ScenarioVersion, TrendDelta } from "@/lib/types";

/**
 * Sortie structurée acceptée dans le portail → `ScenarioVersion[]` / `TrendDelta[]`.
 *
 * Le modèle propose ; **aucune de ces fonctions n'est appelée avant qu'un humain ait accepté**
 * la proposition, driver par driver ou tendance par tendance — jamais en bloc. Ce qui suit est
 * du calcul, pas du jugement : les champs structurels (`version`, `date`, `noteSlug`,
 * `likelihoodChangedFrom`) ne viennent jamais du modèle, qui ne les porte pas dans son schéma.
 */

function memeImpacts(
  a: ScenarioVersion["impacts"],
  b: ScenarioVersion["impacts"],
): boolean {
  return (["eq", "fi", "fx", "cm"] as const).every(
    (classe) =>
      a[classe].direction === b[classe].direction &&
      a[classe].label === b[classe].label &&
      a[classe].text === b[classe].text,
  );
}

/**
 * Le modèle propose `impacts` en tableau, pas en `Record` (`schema.ts` — la forme `Record`,
 * dépliée en quatre `$ref` distincts par la sortie structurée, a fait échouer la compilation
 * de la grammaire en conditions réelles). `ScenarioVersion.impacts` reste un `Record` : c'est
 * la forme que consomment les pages driver et la trajectoire, et elle ne change pas pour un
 * détail d'encodage côté modèle. Le refine `couvreLesClassesActifs` (`schema.ts`) garantit déjà
 * que le tableau porte exactement les quatre classes, sans doublon.
 */
function impactsVersRecord(
  impacts: Brouillon["scenarioRevisions"][number]["branches"][number]["impacts"],
): ScenarioVersion["impacts"] {
  const record = {} as ScenarioVersion["impacts"];
  for (const { classe, direction, label, text } of impacts) {
    record[classe] = { direction, label, text };
  }
  return record;
}

/**
 * Réviser un driver, c'est émettre ses trois branches d'un coup — mais on ne **versionne** que
 * celles qui ont réellement changé. Une branche identique à sa version courante ne produit
 * aucune nouvelle entrée : sinon la trajectoire s'alourdirait chaque semaine de points qui ne
 * disent rien, même pour les branches que la note ne discute pas.
 */
export function construireDeltasScenarios(
  revisions: Brouillon["scenarioRevisions"],
  driversAcceptes: ReadonlySet<string>,
  scenariosCourants: ScenarioVersion[],
  noteSlug: string,
  date: string,
): ScenarioVersion[] {
  const deltas: ScenarioVersion[] = [];

  for (const revision of revisions) {
    if (!driversAcceptes.has(revision.driverId)) continue;

    for (const branche of revision.branches) {
      const actuelle = currentVersion(scenariosCourants, revision.driverId, branche.branchId);
      const impacts = impactsVersRecord(branche.impacts);

      const inchangee =
        actuelle !== null &&
        actuelle.likelihood === branche.likelihood &&
        actuelle.thesis === branche.thesis &&
        actuelle.watchSignals === branche.watchSignals &&
        memeImpacts(actuelle.impacts, impacts);
      if (inchangee) continue;

      const likelihoodChangedFrom =
        actuelle && actuelle.likelihood !== branche.likelihood ? actuelle.likelihood : null;

      deltas.push({
        driverId: revision.driverId,
        branchId: branche.branchId,
        version: (actuelle?.version ?? 0) + 1,
        date,
        noteSlug,
        likelihood: branche.likelihood,
        likelihoodChangedFrom,
        why: branche.why,
        thesis: branche.thesis,
        impacts,
        watchSignals: branche.watchSignals,
      });
    }
  }

  return deltas;
}

/**
 * Un changement de statut de tendance accepté devient une entrée d'historique. Contrairement
 * aux scénarios, il n'y a pas de numérotation — `statusHistory` s'ordonne par date, et
 * `mergeTrendDeltas` (`lib/content-assembly.ts`) fait le reste.
 */
export function construireDeltasTendances(
  updates: Brouillon["trendUpdates"],
  tendancesAcceptees: ReadonlySet<string>,
  noteSlug: string,
  date: string,
): TrendDelta[] {
  return updates
    .filter((u) => tendancesAcceptees.has(u.trendId))
    .map((u) => ({
      trendId: u.trendId,
      status: u.status,
      entry: { date, status: u.status, noteSlug, why: u.why },
    }));
}
