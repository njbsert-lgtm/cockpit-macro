import { describe, expect, it } from "vitest";
import { getInstruments } from "@/lib/data";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { ScenarioVersion, VeilleItem } from "@/lib/types";
import { construireSchema, construireVivier } from "./schema";

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

/** Un Brouillon minimal, valide contre le vivier — chaque test n'en casse qu'un seul champ. */
function brouillonValide() {
  return {
    regimeStatement: "Un régime.",
    keyIndicators: [
      { label: "a", value: "1" },
      { label: "b", value: "2" },
      { label: "c", value: "3" },
    ],
    channels: ["fonction-reaction"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: ["us10y"],
    veilleItemRefs: ["item-1"],
    blocs: { CeQuiAChange: "Texte." },
    sources: [{ block: "CeQuiAChange", sourceId: "item-1" }],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [],
    driverCandidate: null,
    redactionNotes: "",
  };
}

describe("construireSchema — appartenance au vivier sans z.enum à forte cardinalité", () => {
  const base = paquet([obs("us10y")]);
  const withDriver: ContextePaquet = {
    ...base,
    scenariosCourants: [scenarioVersion()],
    itemsVeille: [veilleItem("item-1")],
  };
  const vivier = construireVivier(withDriver, ["CeQuiAChange"]);
  const schema = construireSchema(withDriver, vivier);

  it("accepte un brouillon dont toutes les références existent dans le vivier", () => {
    expect(schema.safeParse(brouillonValide()).success).toBe(true);
  });

  it("rejette un instrumentRefs qui cite un instrument hors du paquet", () => {
    const r = schema.safeParse({ ...brouillonValide(), instrumentRefs: ["spx-invente"] });
    expect(r.success).toBe(false);
  });

  it("rejette un veilleItemRefs qui cite un item de veille inexistant", () => {
    const r = schema.safeParse({ ...brouillonValide(), veilleItemRefs: ["item-fantome"] });
    expect(r.success).toBe(false);
  });

  it("rejette une source dont le sourceId ne correspond à aucun item de veille", () => {
    const r = schema.safeParse({
      ...brouillonValide(),
      sources: [{ block: "CeQuiAChange", sourceId: "item-fantome" }],
    });
    expect(r.success).toBe(false);
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
