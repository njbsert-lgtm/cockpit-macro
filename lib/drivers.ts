import type { Driver, DriverInput, Edition, ScenarioVersion } from "./types";
import { currentVersion } from "./integrity";

/**
 * Dérive les quatre champs de `Driver` qui ne sont pas saisis à la main.
 *
 * `content/drivers.ts` ne porte que du jugement irréductible. Tout ce qui existe déjà
 * ailleurs — l'ordre d'intensité (dans l'édition), la branche dominante (dans les scénarios),
 * la date de dernière révision (idem) — est recalculé ici. Publier une édition suffit donc à
 * les mettre à jour : il n'y a pas de champ à resaisir, donc rien qui puisse diverger.
 *
 * L'intégrité est supposée déjà vérifiée par `checkIntegrity` — d'où les `!` : une branche
 * centrale unique et un `driverOrder` complet sont des invariants garantis en amont.
 */
export function deriveDrivers(
  inputs: DriverInput[],
  editions: Edition[],
  scenarios: ScenarioVersion[],
): Driver[] {
  const latest = [...editions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const order = latest?.driverOrder ?? [];

  return inputs.map((input) => {
    const branches = [...new Set(scenarios.filter((s) => s.driverId === input.id).map((s) => s.branchId))];

    const dominantBranchId = branches.find(
      (b) => currentVersion(scenarios, input.id, b)?.likelihood === "central",
    )!;

    const lastRevision = scenarios
      .filter((s) => s.driverId === input.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.version - b.version)
      .at(-1)!;

    const rank = order.indexOf(input.id);

    return {
      ...input,
      dominantBranchId,
      // Un driver retiré n'apparaît plus dans le driverOrder de la dernière édition : il est
      // rangé après les actifs plutôt que de remonter en tête avec un rang de -1.
      intensityRank: rank === -1 ? Number.MAX_SAFE_INTEGER : rank,
      lastRevisedAt: lastRevision.date,
      lastRevisedIn: lastRevision.editionSlug,
    };
  });
}

/** Les drivers actifs, dans l'ordre d'intensité jugé à la dernière édition. */
export function activeDrivers(drivers: Driver[], asOf: string): Driver[] {
  return drivers
    .filter((d) => d.retiredAt === null || d.retiredAt > asOf)
    .sort((a, b) => a.intensityRank - b.intensityRank);
}
