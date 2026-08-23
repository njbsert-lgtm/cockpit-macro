import { describe, expect, it } from "vitest";
import { assembleContent, mergeTrendDeltas, type ContentInputs } from "./content-assembly";
import type { DriverInput, ScenarioVersion, Trend, TrendDelta } from "./types";

// Mêmes fabriques que `lib/integrity.test.ts` : un graphe minimal mais valide, cassé arête par
// arête. Dupliquées ici plutôt qu'importées — ce module teste la fusion, pas l'intégrité, et
// n'a besoin que d'un sous-ensemble des fabriques.

function driver(over: Partial<DriverInput> = {}): DriverInput {
  return {
    id: "rates",
    label: "Taux directeurs",
    question: "La Fed reprend-elle son cycle de hausse ?",
    instrumentRefs: ["us10y"],
    trendRefs: ["desinflation"],
    zones: ["us"],
    retiredAt: null,
    ...over,
  };
}

function trend(over: Partial<Trend> = {}): Trend {
  return {
    id: "desinflation",
    title: "La désinflation est terminée",
    thesis: "…",
    zones: ["us"],
    assetClasses: ["rates"],
    status: "renforce",
    statusHistory: [
      { date: "2026-07-05", status: "renforce", noteSlug: "2026-S27", why: "Parce que." },
    ],
    driverRefs: ["rates"],
    invalidatedBy: "…",
    ...over,
  };
}

function branches(driverId = "rates", over: Partial<ScenarioVersion>[] = []): ScenarioVersion[] {
  const base = (branchId: string, likelihood: ScenarioVersion["likelihood"]): ScenarioVersion => ({
    driverId,
    branchId,
    version: 1,
    date: "2026-07-05",
    noteSlug: "2026-S27",
    likelihood,
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
  });
  const list = [
    base(`${driverId}-a`, "central"),
    base(`${driverId}-b`, "moderee"),
    base(`${driverId}-c`, "faible"),
  ];
  return list.map((v, i) => ({ ...v, ...(over[i] ?? {}) }));
}

const NOTE_SOURCE = `---
kind: hebdo
date: '2026-07-05'
comparesTo: null
regimeStatement: Un régime.
keyIndicators:
  - label: Régime
    value: Choc d'offre
zones:
  - us
driverOrder:
  - rates
---

<CeQuiAChange>

Rien.

</CeQuiAChange>

<CeQuiSestConfirme>

Rien.

</CeQuiSestConfirme>

<RevisionDesScenarios>

Rien.

</RevisionDesScenarios>

<CeQueJavaisMalLu>

Rien.

</CeQueJavaisMalLu>

<CeQueJeSurveille>

Rien.

</CeQueJeSurveille>
`;

function inputs(over: Partial<ContentInputs> = {}): ContentInputs {
  return {
    noteSources: [{ slug: "2026-S27", source: NOTE_SOURCE }],
    drivers: [driver()],
    trends: [trend()],
    scenarios: branches(),
    outlooks: [],
    generated: { scenarios: [], trendDeltas: [] },
    instrumentIds: new Set(["us10y"]),
    ...over,
  };
}

describe("mergeTrendDeltas", () => {
  it("renvoie une tendance sans delta inchangée, par référence", () => {
    const trends = [trend()];
    const merged = mergeTrendDeltas(trends, []);
    expect(merged[0]).toBe(trends[0]);
  });

  it("allonge statusHistory et pose le statut depuis l'entrée la plus récente", () => {
    const delta: TrendDelta = {
      trendId: "desinflation",
      status: "affaiblit",
      entry: { date: "2026-07-12", status: "affaiblit", noteSlug: "2026-S28", why: "Nouvelle donnée." },
    };
    const [merged] = mergeTrendDeltas([trend()], [delta]);
    expect(merged.status).toBe("affaiblit");
    expect(merged.statusHistory).toHaveLength(2);
    expect(merged.statusHistory.at(-1)).toEqual(delta.entry);
  });

  it("laisse les tendances non ciblées par un delta inchangées", () => {
    const other = trend({ id: "autre-tendance" });
    const delta: TrendDelta = {
      trendId: "desinflation",
      status: "affaiblit",
      entry: { date: "2026-07-12", status: "affaiblit", noteSlug: "2026-S28", why: "Nouvelle donnée." },
    };
    const merged = mergeTrendDeltas([trend(), other], [delta]);
    expect(merged.find((t) => t.id === "autre-tendance")).toBe(other);
  });
});

describe("assembleContent — fusion du contenu généré", () => {
  it("intègre un scénario généré dans la vue courante des branches", () => {
    const generatedVersion: ScenarioVersion = {
      ...branches()[0],
      version: 2,
      date: "2026-07-12",
      noteSlug: "2026-S27",
      likelihood: "central",
      likelihoodChangedFrom: "central",
      why: "Confirmation.",
    };
    const assembled = assembleContent(
      inputs({ generated: { scenarios: [generatedVersion], trendDeltas: [] } }),
    );
    expect(assembled.scenarios).toContainEqual(generatedVersion);
  });

  it("fusionne un delta de tendance avant le contrôle d'intégrité", () => {
    const delta: TrendDelta = {
      trendId: "desinflation",
      status: "affaiblit",
      entry: { date: "2026-07-12", status: "affaiblit", noteSlug: "2026-S27", why: "Nouvelle donnée." },
    };
    const assembled = assembleContent(
      inputs({ generated: { scenarios: [], trendDeltas: [delta] } }),
    );
    expect(assembled.trends[0].status).toBe("affaiblit");
  });

  it("rejette un scénario généré à référence morte — l'intégrité s'applique au contenu généré aussi", () => {
    const orphan: ScenarioVersion = { ...branches()[0], driverId: "fantome", branchId: "fantome-a" };
    expect(() =>
      assembleContent(inputs({ generated: { scenarios: [orphan], trendDeltas: [] } })),
    ).toThrow(/driver inconnu « fantome »/);
  });

  it("dérive toujours le statut affiché de la dernière entrée d'historique, jamais du champ status du delta", () => {
    // `TrendDelta.status` sert de garde-fou en amont (validé par `lib/redaction/schema.ts`
    // avant que le delta n'existe) — la fusion elle-même ne fait confiance qu'à `entry.status`,
    // pour ne jamais dépendre de deux champs qui pourraient diverger.
    const delta: TrendDelta = {
      trendId: "desinflation",
      status: "renforce", // volontairement incohérent avec entry.status, pour le test
      entry: { date: "2026-07-12", status: "affaiblit", noteSlug: "2026-S27", why: "Nouvelle donnée." },
    };
    const assembled = assembleContent(
      inputs({ generated: { scenarios: [], trendDeltas: [delta] } }),
    );
    expect(assembled.trends[0].status).toBe("affaiblit");
  });
});
