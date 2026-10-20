import { describe, expect, it } from "vitest";
import { PREMIERE_VERSION_SUIVIE, repereDeRevision, semaineDeNote, versionPrecedente } from "./revision";
import type { ScenarioVersion } from "./types";

function v(over: Partial<ScenarioVersion>): ScenarioVersion {
  return {
    driverId: "ai",
    branchId: "ai-accelere",
    version: 2,
    date: "2026-10-18",
    noteSlug: "2026-S42",
    likelihood: "faible",
    likelihoodChangedFrom: "moderee",
    why: "x",
    thesis: "x",
    impacts: {
      eq: { direction: "up", label: "", text: "" },
      fi: { direction: "flat", label: "", text: "" },
      fx: { direction: "flat", label: "", text: "" },
      cm: { direction: "flat", label: "", text: "" },
    },
    watchSignals: "",
    ...over,
  };
}

describe("semaineDeNote", () => {
  it("garde la semaine et le rang de spéciale", () => {
    expect(semaineDeNote("2026-S39")).toBe("S39");
    expect(semaineDeNote("2026-S39-E1")).toBe("S39·E1");
  });
});

describe("repereDeRevision — une version n'est datée que de la note qui l'a produite", () => {
  it("nomme la semaine de la version précédente, pas celle de la note comparée", () => {
    // La branche n'a pas bougé en S41 : sa version précédente date de la S39.
    const precedente = v({ version: 1, noteSlug: "2026-S39", likelihood: "moderee", likelihoodChangedFrom: null });
    const courante = v({ version: 2, noteSlug: "2026-S42", likelihoodChangedFrom: "moderee" });
    expect(repereDeRevision([precedente, courante], courante)).toEqual({
      type: "revision",
      avant: "moderee",
      semaine: "S39",
    });
  });

  it("dit « Première version suivie », jamais « était … en SXX », quand la version précédente n'existe plus", () => {
    // Le cas du driver IA : version 2 en S42, version 1 retirée à la remise à zéro du corpus.
    const courante = v({ version: 2, noteSlug: "2026-S42", likelihoodChangedFrom: "moderee" });
    expect(repereDeRevision([courante], courante)).toEqual({ type: "premiere" });
    expect(PREMIERE_VERSION_SUIVIE).toBe("Première version suivie");
  });

  it("traite une version précédente antérieure au début du suivi comme absente", () => {
    const fictive = v({ version: 1, noteSlug: "2026-S32", date: "2026-08-09", likelihoodChangedFrom: null });
    const courante = v({ version: 2, noteSlug: "2026-S42", likelihoodChangedFrom: "moderee" });
    expect(versionPrecedente([fictive, courante], courante)).toBeNull();
    expect(repereDeRevision([fictive, courante], courante)).toEqual({ type: "premiere" });
  });

  it("ne signale rien quand la branche n'a pas bougé et que sa précédente est suivie", () => {
    const precedente = v({ version: 1, noteSlug: "2026-S39", likelihoodChangedFrom: null });
    const courante = v({ version: 2, noteSlug: "2026-S40", likelihoodChangedFrom: null });
    expect(repereDeRevision([precedente, courante], courante)).toBeNull();
  });

  it("ne confond pas deux branches ni deux drivers", () => {
    const autreBranche = v({ version: 1, noteSlug: "2026-S39", branchId: "ai-decoit", likelihoodChangedFrom: null });
    const autreDriver = v({ version: 1, noteSlug: "2026-S39", driverId: "rates", likelihoodChangedFrom: null });
    const courante = v({ version: 2 });
    expect(repereDeRevision([autreBranche, autreDriver, courante], courante)).toEqual({ type: "premiere" });
  });
});
