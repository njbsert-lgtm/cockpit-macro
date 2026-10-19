import { describe, expect, it } from "vitest";
import { changementsDepuis, libelleDeLecture, lecturesDuBloc, sujetSansArticle } from "./depuis";
import { getLatestNote, getNoteBody, getScenarioVersions } from "./content";
import type { Guet, Note, ScenarioVersion } from "./types";

const corps = `<CeQuiAChange>

### Les taux longs

**Le débat sur les taux longs se scinde.** Suite.

### Le pétrole

**Le pétrole change de récit : de la tension sur l'offre à l'anticipation d'un excédent.** Suite.

### L'IA

Sans gras.

</CeQuiAChange>`;

describe("lectures du bloc « Ce qui a changé »", () => {
  it("retire l'article du sujet", () => {
    expect(sujetSansArticle("Le pétrole")).toBe("Pétrole");
    expect(sujetSansArticle("L'IA")).toBe("IA");
    expect(sujetSansArticle("Les taux longs")).toBe("Taux longs");
  });

  it("garde la partie après les deux-points de l'affirmation en gras", () => {
    expect(
      libelleDeLecture("**Le pétrole change de récit : de la tension sur l'offre.** Suite", "x"),
    ).toBe("De la tension sur l'offre");
  });

  it("se replie sur le sujet sans affirmation en gras", () => {
    expect(libelleDeLecture("Sans gras.", "IA")).toBe("IA");
  });

  it("ne garde que les deux premiers sous-titres", () => {
    expect(lecturesDuBloc(corps).map((l) => l.sujet)).toEqual(["Taux longs", "Pétrole"]);
  });

  it("rend une liste vide sans bloc", () => {
    expect(lecturesDuBloc("rien")).toEqual([]);
  });
});

function version(partial: Partial<ScenarioVersion>): ScenarioVersion {
  return {
    driverId: "ai",
    branchId: "ai-decoit",
    version: 2,
    date: "2026-10-17",
    noteSlug: "2026-S42",
    likelihood: "moderee",
    likelihoodChangedFrom: "faible",
    why: "x",
    thesis: "x",
    impacts: {
      eq: { direction: "down", label: "", text: "" },
      fi: { direction: "flat", label: "", text: "" },
      fx: { direction: "flat", label: "", text: "" },
      cm: { direction: "flat", label: "", text: "" },
    },
    watchSignals: "",
    ...partial,
  };
}

const guet = (partial: Partial<Guet>): Guet => ({
  id: "g",
  noteSlug: "2026-S41",
  driverId: "rates",
  axeLibelle: null,
  libelle: "Le coup d'arrêt tient-il ?",
  attendu: "",
  confirmeSi: "",
  infirmeSi: "",
  echeance: "2026-10-17",
  sourceAttendue: [],
  statut: "ouvert",
  resoluPar: null,
  resoluLe: null,
  ...partial,
});

describe("changementsDepuis", () => {
  const note = { slug: "2026-S42", guets: [guet({}), guet({ id: "h", echeance: "2026-11-01" }), guet({ id: "i", echeance: null })] } as unknown as Note;

  it("réunit révisions, guets échus et lectures, dans cet ordre", () => {
    const lignes = changementsDepuis({
      note,
      body: corps,
      versions: [version({}), version({ likelihoodChangedFrom: null, branchId: "autre" }), version({ noteSlug: "2026-S41" })],
      driverLabels: { ai: "Cycle IA", rates: "Taux" },
      branchLabels: { "ai-decoit": "Déception" },
      aujourdhui: "2026-10-19",
    });
    expect(lignes.map((l) => l.type)).toEqual(["revision", "guet", "lecture", "lecture"]);
    expect(lignes[0]).toMatchObject({ branche: "Déception", avant: "faible", apres: "moderee", semantique: "baisse" });
    expect(lignes[1]).toMatchObject({ driverLabel: "Taux", echeance: "2026-10-17" });
  });

  it("rend une liste vide quand rien n'a changé", () => {
    expect(
      changementsDepuis({
        note: { slug: "x", guets: [] } as unknown as Note,
        body: null,
        versions: [],
        driverLabels: {},
        branchLabels: {},
        aujourdhui: "2026-10-19",
      }),
    ).toEqual([]);
  });

  it("trouve au moins un changement dans la dernière note du corpus", () => {
    const derniere = getLatestNote()!;
    const lignes = changementsDepuis({
      note: derniere,
      body: getNoteBody(derniere.slug),
      versions: getScenarioVersions(),
      driverLabels: {},
      branchLabels: {},
      aujourdhui: "2026-10-19",
    });
    expect(lignes.length).toBeGreaterThan(0);
  });
});
