import { describe, expect, it } from "vitest";
import { champsStructurels, construireContexte, estDegrade } from "./context";
import type { Guet, Note } from "@/lib/types";

function note(over: Partial<Note> = {}): Note {
  return {
    slug: "2026-S35",
    kind: "hebdo",
    date: "2026-08-29",
    isoWeek: "2026-S35",
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
    ...over,
  };
}

function guet(over: Partial<Guet> = {}): Guet {
  return {
    id: "g1",
    noteSlug: "2026-S35",
    driverId: "rates",
    libelle: "Réunion de la Fed",
    attendu: "Statu quo",
    confirmeSi: "Taux inchangé",
    infirmeSi: "Hausse de 25 bps",
    echeance: "2026-09-16",
    sourceAttendue: [],
    statut: "ouvert",
    resoluPar: null,
    resoluLe: null,
    ...over,
  };
}

const BASE = {
  kind: "hebdo" as const,
  dateCible: "2026-09-05",
  blocsPrecedents: {},
  observations: [],
  itemsVeille: [],
  scenariosCourants: [],
  tendancesCourantes: [],
};

describe("champsStructurels — l'assertion d'antériorité", () => {
  it("refuse une date antérieure à la dernière note : elle invaliderait son comparesTo", () => {
    const notes = [note({ slug: "2026-S35-E1", kind: "speciale", date: "2026-08-29" })];
    expect(() => champsStructurels(notes, "2026-08-25", "hebdo")).toThrow(/antérieure ou égale/);
  });

  it("refuse une date égale à celle de la dernière note", () => {
    const notes = [note({ date: "2026-08-29" })];
    expect(() => champsStructurels(notes, "2026-08-29", "hebdo")).toThrow(/antérieure ou égale/);
  });

  it("accepte une date postérieure", () => {
    const notes = [note({ date: "2026-08-29" })];
    expect(() => champsStructurels(notes, "2026-09-05", "hebdo")).not.toThrow();
  });

  it("compare à la dernière note du corpus, spéciale comprise — c'est elle qui borne le fil", () => {
    // La dernière note est une spéciale datée du 30 : une hebdo du 29 passerait avant elle.
    const notes = [
      note({ date: "2026-08-29" }),
      note({ slug: "2026-S35-E1", kind: "speciale", date: "2026-08-30", parentWeek: "2026-S35" }),
    ];
    expect(() => champsStructurels(notes, "2026-08-29", "hebdo")).toThrow(/2026-S35-E1/);
  });
});

describe("champsStructurels — comparesTo", () => {
  it("une hebdo se compare à la hebdo précédente, jamais à la dernière spéciale", () => {
    const notes = [
      note({ slug: "2026-S34", date: "2026-08-22" }),
      note({ slug: "2026-S35-E1", kind: "speciale", date: "2026-08-30", parentWeek: "2026-S35" }),
    ];
    expect(champsStructurels(notes, "2026-09-05", "hebdo").comparesTo).toBe("2026-S34");
  });

  it("une spéciale se compare à la dernière note parue, quelle qu'elle soit", () => {
    const notes = [
      note({ slug: "2026-S34", date: "2026-08-22" }),
      note({ slug: "2026-S35-E1", kind: "speciale", date: "2026-08-30", parentWeek: "2026-S35" }),
    ];
    expect(champsStructurels(notes, "2026-09-05", "speciale").comparesTo).toBe("2026-S35-E1");
  });

  it("la toute première note n'a pas de référence", () => {
    expect(champsStructurels([], "2026-09-05", "hebdo").comparesTo).toBeNull();
  });
});

describe("champsStructurels — slug et semaine", () => {
  it("une hebdo prend le slug de sa semaine ISO, calculée sur la date", () => {
    const { slug, isoWeek } = champsStructurels([], "2026-09-05", "hebdo");
    expect(slug).toBe("2026-S36");
    expect(isoWeek).toBe("2026-S36");
  });

  it("un samedi tombe dans la semaine des séances qu'il couvre", () => {
    // Vendredi 4 et samedi 5 septembre sont dans la même semaine ISO.
    expect(champsStructurels([], "2026-09-04", "hebdo").isoWeek).toBe("2026-S36");
    expect(champsStructurels([], "2026-09-05", "hebdo").isoWeek).toBe("2026-S36");
  });

  it("une spéciale se numérote après celles déjà parues dans la semaine", () => {
    const notes = [
      note({ slug: "2026-S36-E1", kind: "speciale", date: "2026-09-01", parentWeek: "2026-S36" }),
    ];
    expect(champsStructurels(notes, "2026-09-05", "speciale").slug).toBe("2026-S36-E2");
  });

  it("recense les spéciales de la semaine — RecapDesSpeciales en dépend", () => {
    const notes = [
      note({ slug: "2026-S36-E1", kind: "speciale", date: "2026-09-01", parentWeek: "2026-S36" }),
      note({ slug: "2026-S35-E1", kind: "speciale", date: "2026-08-25", parentWeek: "2026-S35" }),
    ];
    const { specialesDeLaSemaine } = champsStructurels(notes, "2026-09-05", "hebdo");
    expect(specialesDeLaSemaine.map((n) => n.slug)).toEqual(["2026-S36-E1"]);
  });
});

describe("construireContexte — les guets remontent", () => {
  it("remonte les guets ouverts de la note précédente", () => {
    const precedente = note({ guets: [guet({ echeance: "2026-12-01" })] });
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.guetsOuverts.map((g) => g.id)).toEqual(["g1"]);
    expect(paquet.guetsExpires).toEqual([]);
  });

  it("fait expirer un guet dont l'échéance est passée, et le remonte quand même", () => {
    const precedente = note({ guets: [guet({ echeance: "2026-09-01" })] });
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.guetsExpires.map((g) => g.id)).toEqual(["g1"]);
    expect(paquet.guetsOuverts).toEqual([]);
  });

  it("n'expire jamais un guet sans échéance, quelle que soit son ancienneté", () => {
    const precedente = note({ guets: [guet({ echeance: null })] });
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.guetsOuverts).toHaveLength(1);
    expect(paquet.guetsExpires).toEqual([]);
  });

  it("décompte les guets remontés du budget de trois", () => {
    const precedente = note({
      guets: [guet({ id: "a" }), guet({ id: "b", echeance: null })],
    });
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.budgetGuets).toBe(1);
  });

  it("laisse trois places quand la note précédente n'a pas de guets", () => {
    const precedente = note();
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.budgetGuets).toBe(3);
  });

  it("ne remonte pas un guet résolu", () => {
    const precedente = note({
      guets: [guet({ statut: "confirme", resoluLe: "2026-09-01" })],
    });
    const paquet = construireContexte({ ...BASE, notes: [precedente], notePrecedente: precedente });
    expect(paquet.guetsOuverts).toEqual([]);
    expect(paquet.guetsExpires).toEqual([]);
    expect(paquet.budgetGuets).toBe(3);
  });
});

describe("construireContexte — la note précédente", () => {
  it("transmet le texte intégral de ses blocs, pas un résumé", () => {
    const precedente = note({ regimeStatement: "Le régime précédent." });
    const blocs = { CeQuiAChange: "Le texte complet du bloc." };
    const paquet = construireContexte({
      ...BASE,
      notes: [precedente],
      notePrecedente: precedente,
      blocsPrecedents: blocs,
    });
    expect(paquet.notePrecedente).toMatchObject({
      slug: "2026-S35",
      regimeStatement: "Le régime précédent.",
      blocs,
    });
  });

  it("vaut null pour la toute première note", () => {
    const paquet = construireContexte({ ...BASE, notes: [], notePrecedente: null });
    expect(paquet.notePrecedente).toBeNull();
  });
});

describe("estDegrade — la règle de suffisance", () => {
  const paquet = (over: Partial<Parameters<typeof construireContexte>[0]> = {}) =>
    construireContexte({ ...BASE, notes: [], notePrecedente: null, ...over });

  it("un paquet sans veille ni observation fraîche est dégradé", () => {
    expect(estDegrade(paquet())).toBe(true);
  });

  it("une observation fraîche suffit à ne plus l'être", () => {
    const avecObs = paquet({
      observations: [
        {
          instrumentId: "spx",
          label: "S&P 500",
          unit: "index",
          valeurs: [{ date: "2026-09-04", value: 7000 }],
          variationSemaine: 1.2,
          variationYTD: 2.3,
          fraicheur: "ok",
        },
      ],
    });
    expect(estDegrade(avecObs)).toBe(false);
  });

  it("des observations toutes en retard ne suffisent pas", () => {
    const enRetard = paquet({
      observations: [
        {
          instrumentId: "spx",
          label: "S&P 500",
          unit: "index",
          valeurs: [],
          variationSemaine: null,
          variationYTD: null,
          fraicheur: "retard",
        },
      ],
    });
    expect(estDegrade(enRetard)).toBe(true);
  });
});
