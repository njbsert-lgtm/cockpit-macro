import { describe, expect, it } from "vitest";
import { blockStates, groupByMonth, type ArchiveEntry } from "./notes-archive";
import type { Note } from "./types";

function note(over: Partial<Note> = {}): Note {
  return {
    slug: "2026-S32",
    kind: "hebdo",
    date: "2026-08-09",
    isoWeek: "2026-S32",
    parentWeek: null,
    comparesTo: null,
    trigger: null,
    regimeStatement: "Un régime.",
    keyIndicators: [{ label: "Régime", value: "…" }],
    zones: ["us"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    channels: [],
    sources: {},
    guets: [],
    status: "publiee",
    publishedAt: null,
    authorship: {},
    ...over,
  };
}

const entry = (n: Note): ArchiveEntry => ({ kind: "note", note: n, excerpt: null, blocks: [] });

describe("groupByMonth", () => {
  it("groupe les notes par mois de publication, dans l'ordre reçu", () => {
    const months = groupByMonth([
      entry(note({ slug: "a", date: "2026-08-09" })),
      entry(note({ slug: "b", date: "2026-08-02" })),
      entry(note({ slug: "c", date: "2026-07-12" })),
    ]);
    expect(months.map((m) => m.key)).toEqual(["2026-08", "2026-07"]);
    expect(months[0].entries).toHaveLength(2);
    expect(months[1].entries).toHaveLength(1);
  });

  it("libelle le mois en français", () => {
    const months = groupByMonth([entry(note({ date: "2026-08-09" }))]);
    expect(months[0].label).toBe("août 2026");
  });

  it("range une semaine sans hebdo dans le mois de la note qui la précède", () => {
    const months = groupByMonth([
      entry(note({ date: "2026-08-09" })),
      { kind: "gap", isoWeek: "2026-S31" },
      entry(note({ date: "2026-07-12" })),
    ]);
    expect(months).toHaveLength(2);
    expect(months[0].entries.map((e) => e.kind)).toEqual(["note", "gap"]);
  });

  it("renvoie un tableau vide pour une archive vide", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("blockStates", () => {
  it("attend cinq blocs pour une hebdo", () => {
    const states = blockStates(note({ kind: "hebdo" }), ["CeQuiAChange", "CeQueJeSurveille"]);
    expect(states).toHaveLength(5);
    expect(states.filter((s) => s.present)).toHaveLength(2);
  });

  it("n'en attend que trois pour une spéciale — la structure allégée du cahier", () => {
    const states = blockStates(note({ kind: "speciale" }), [
      "CeQuiAChange",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
    ]);
    expect(states).toHaveLength(3);
    expect(states.every((s) => s.present)).toBe(true);
  });

  it("ne compte ni RecapDesSpeciales ni LeFilDeLaSemaine, qui ne sont pas des blocs de jugement", () => {
    const states = blockStates(note({ kind: "hebdo" }), ["RecapDesSpeciales", "LeFilDeLaSemaine"]);
    expect(states.some((s) => s.name === "RecapDesSpeciales")).toBe(false);
    expect(states.every((s) => !s.present)).toBe(true);
  });
});
