import { describe, expect, it } from "vitest";
import { REGIMES_TEST } from "./regime-fixture";
import { validerReponse, type Vivier } from "./sortie-mixte";
import { normaliserMarches, type MarcheDriver } from "./marches";

const MARCHES = {
  instrumentsParDriver: new Map([
    ["rates", ["us10y", "eurusd"]],
    ["iran", ["brent", "gold"]],
  ]),
  // `gold` n'a pas de variation cette semaine : rien à expliquer.
  sansMesure: new Set(["iran/gold"]),
  emetteurs: ["Zonebourse", "Eurostat"],
};

function vivier(marches: Vivier["marches"] = MARCHES): Vivier {
  return {
    driverIds: ["rates", "iran"],
    branchesParDriver: new Map([
      ["rates", ["hausse", "statu-quo", "baisses"]],
      ["iran", ["fin", "enlisement", "durcissement"]],
    ]),
    trendIds: [],
    instrumentIds: ["us10y"],
    veilleItemIds: [],
    sourceIds: ["Zonebourse", "Eurostat"],
    blocsAttendus: ["CeQuiAChange"],
    budgetGuets: 3,
    catalogueInstrumentIds: ["us10y", "brent"],
    placesThemes: 5,
    themesExistantsIds: [],
    marches,
  };
}

const FM = {
  keyIndicators: [
    { label: "a", value: "1" },
    { label: "b", value: "2" },
    { label: "c", value: "3" },
  ],
  channels: ["fonction-reaction"],
  driverOrder: ["rates", "iran"],
  trendRefs: [],
  instrumentRefs: [],
  veilleItemRefs: [],
};

function ligne(over: Record<string, unknown> = {}) {
  return {
    instrumentId: "us10y",
    cause: "Les rendements montent avec la réévaluation du cycle de la Fed.",
    emetteur: "Zonebourse",
    canal: "taux-reel",
    ...over,
  };
}

function valider(marchesParDriver: unknown, v = vivier()) {
  const st = {
    regimeStatementPropositions: REGIMES_TEST,
    scenarioRevisions: [],
    guets: [],
    trendUpdates: [],
    sources: [],
    marchesParDriver,
  };
  return validerReponse(FM, JSON.stringify(st), v);
}

describe("marchesParDriver — validation contre le paquet", () => {
  it("accepte une cause attribuée, et « sans lien clair » (cause, émetteur et canal null)", () => {
    const r = valider([
      { driverId: "rates", lignes: [ligne(), ligne({ instrumentId: "eurusd", cause: null, emetteur: null, canal: null })] },
    ]);
    expect(r.ok).toBe(true);
  });

  it("rejette un driver inconnu", () => {
    const r = valider([{ driverId: "mars", lignes: [] }]);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.raison).toMatch(/driver inconnu « mars »/);
  });

  it("rejette un instrument inconnu du paquet, et un instrument que le driver ne pilote pas", () => {
    const inconnu = valider([{ driverId: "rates", lignes: [ligne({ instrumentId: "bitcoin" })] }]);
    expect(inconnu.ok).toBe(false);
    // brent existe, mais il est piloté par « iran », pas par « rates ».
    const autre = valider([{ driverId: "rates", lignes: [ligne({ instrumentId: "brent" })] }]);
    expect(autre.ok).toBe(false);
    if (!autre.ok) expect(autre.raison).toMatch(/n'est pas un instrument piloté par « rates »/);
  });

  it("rejette une cause sans émetteur", () => {
    const r = valider([{ driverId: "rates", lignes: [ligne({ emetteur: null })] }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toMatch(/n'a pas d'émetteur/);
  });

  it("rejette une cause dont l'émetteur n'est pas dans le vivier de la fiche — comme sources", () => {
    const r = valider([{ driverId: "rates", lignes: [ligne({ emetteur: "Goldman Sachs" })] }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toMatch(/absent de la fiche/);
  });

  it("rejette une cause sans canal, et un émetteur sans cause", () => {
    expect(valider([{ driverId: "rates", lignes: [ligne({ canal: null })] }]).ok).toBe(false);
    expect(valider([{ driverId: "rates", lignes: [ligne({ cause: null, canal: null })] }]).ok).toBe(false);
  });

  it("rejette une cause sur un instrument sans variation (non suivi ou donnée absente)", () => {
    const r = valider([{ driverId: "iran", lignes: [ligne({ instrumentId: "gold" })] }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toMatch(/pas de variation cette semaine/);
  });

  it("rejette un doublon d'instrument ou de driver", () => {
    expect(valider([{ driverId: "rates", lignes: [ligne(), ligne()] }]).ok).toBe(false);
    expect(
      valider([
        { driverId: "rates", lignes: [] },
        { driverId: "rates", lignes: [] },
      ]).ok,
    ).toBe(false);
  });

  it("une note sans ce bloc (avant la S45, spéciale) n'en accepte aucun", () => {
    expect(valider([], vivier(null)).ok).toBe(true);
    expect(valider([{ driverId: "rates", lignes: [ligne()] }], vivier(null)).ok).toBe(false);
  });
});

describe("normaliserMarches — le code reste maître de la liste", () => {
  const propose: MarcheDriver[] = [{ driverId: "iran", lignes: [ligne({ instrumentId: "brent", canal: "nature-choc" }) as never] }];

  it("complète d'une ligne sans cause chaque instrument que le modèle n'a pas mentionné, dans l'ordre de driverOrder", () => {
    const n = normaliserMarches(propose, MARCHES.instrumentsParDriver, ["rates", "iran"]);
    expect(n.map((m) => m.driverId)).toEqual(["rates", "iran"]);
    expect(n[0].lignes).toEqual([
      { instrumentId: "us10y", cause: null, emetteur: null, canal: null },
      { instrumentId: "eurusd", cause: null, emetteur: null, canal: null },
    ]);
    expect(n[1].lignes.map((l) => [l.instrumentId, l.cause === null])).toEqual([
      ["brent", false],
      ["gold", true],
    ]);
  });

  it("ne produit aucune entrée pour un driver sans instrument, ni pour un driver hors de driverOrder", () => {
    const parDriver = new Map([...MARCHES.instrumentsParDriver, ["vide", [] as string[]]]);
    expect(normaliserMarches([], parDriver, ["vide", "iran"]).map((m) => m.driverId)).toEqual(["iran"]);
  });
});
