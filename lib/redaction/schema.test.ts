import { describe, expect, it } from "vitest";
import { getInstruments } from "@/lib/data";
import type { ContextePaquet, ObservationContexte } from "./context";
import { construireVivier } from "./schema";

function obs(instrumentId: string): ObservationContexte {
  return {
    instrumentId,
    label: instrumentId,
    unit: "percent",
    valeurs: [{ date: "2026-09-17", value: 4.0 }],
    variationSemaine: null,
    variationYTD: null,
    fraicheur: "ok",
  };
}

function paquet(observations: ObservationContexte[]): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S38",
    isoWeek: "2026-S38",
    date: "2026-09-19",
    comparesTo: null,
    specialesDeLaSemaine: [],
    notePrecedente: null,
    observations,
    drivers: [],
    itemsVeille: [],
    scenariosCourants: [],
    tendancesCourantes: [],
    guetsOuverts: [],
    guetsExpires: [],
    budgetGuets: 3,
    echeancesSemaine: [],
    trigger: null,
  };
}

describe("construireVivier — le vivier d'instrumentRefs citables", () => {
  it("exclut un indicateur macro même s'il figure dans les observations", () => {
    // `Note.instrumentRefs` n'a de sens que pour un instrument de marché — c'est ce que
    // `lib/integrity.ts` valide contre le catalogue d'instruments, et ce que la fiche
    // instrument sait résoudre. Un indicateur macro (us-policy-rate) peut être cité en prose
    // et contrôlé numériquement, mais ne doit jamais pouvoir apparaître dans instrumentRefs :
    // sinon un brouillon valide selon ce schéma échouerait ensuite à l'intégrité.
    const vivier = construireVivier(paquet([obs("us10y"), obs("us-policy-rate")]), []);
    expect(vivier.instrumentIds).toContain("us10y");
    expect(vivier.instrumentIds).not.toContain("us-policy-rate");
  });

  it("le catalogue d'instruments réel ne contient aucun indicateur macro", () => {
    // Garde-fou de cohérence : si un jour un identifiant de macro était ajouté par erreur au
    // catalogue d'instruments, ce test le dirait avant que `construireVivier` ne le laisse
    // passer silencieusement.
    const ids = new Set(getInstruments().map((i) => i.id));
    expect(ids.has("us-policy-rate")).toBe(false);
  });
});
