import { describe, expect, it } from "vitest";
import { getInstruments } from "@/lib/data";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { ScenarioVersion, VeilleItem } from "@/lib/types";
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

function scenarioVersion(): ScenarioVersion {
  return {
    driverId: "rates",
    branchId: "hausse",
    version: 1,
    date: "2026-09-01",
    noteSlug: "2026-S36",
    likelihood: "central",
    likelihoodChangedFrom: null,
    why: "",
    thesis: "…",
    impacts: {
      eq: { direction: "flat", label: "—", text: "…" },
      fi: { direction: "flat", label: "—", text: "…" },
      fx: { direction: "flat", label: "—", text: "…" },
      cm: { direction: "flat", label: "—", text: "…" },
    },
    watchSignals: "…",
  };
}

function veilleItem(id: string): VeilleItem {
  return {
    id,
    title: "Titre",
    url: "https://example.org",
    source: "Fed",
    publishedAt: "2026-09-18",
    zones: ["us"],
    driverRefs: ["rates"],
    channels: ["fonction-reaction"],
    isSignal: true,
    status: "nouveau",
    attachedToBlock: null,
    draftNoteSlug: null,
  };
}

describe("construireVivier — ce que le modèle a le droit de citer", () => {
  const complet: ContextePaquet = {
    ...paquet([obs("us10y")]),
    scenariosCourants: [scenarioVersion(), { ...scenarioVersion(), branchId: "baisses" }],
    itemsVeille: [veilleItem("item-1")],
  };

  it("déduit les branches réelles de chaque driver des scénarios courants", () => {
    // Réviser un driver, c'est réémettre ses branches d'un coup : le vivier doit donc savoir
    // lesquelles existent, sans quoi l'invariant ne pourrait pas s'énoncer.
    const vivier = construireVivier(complet, ["CeQuiAChange"]);
    expect(vivier.driverIds).toEqual(["rates"]);
    expect(vivier.branchesParDriver.get("rates")).toEqual(["hausse", "baisses"]);
  });

  it("porte les blocs attendus et le budget de guets du paquet", () => {
    const vivier = construireVivier(complet, ["CeQuiAChange", "CeQueJeSurveille"]);
    expect(vivier.blocsAttendus).toEqual(["CeQuiAChange", "CeQueJeSurveille"]);
    expect(vivier.budgetGuets).toBe(3);
    expect(vivier.veilleItemIds).toEqual(["item-1"]);
  });
});

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
