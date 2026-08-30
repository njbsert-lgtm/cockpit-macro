import { describe, expect, it } from "vitest";
import { construireDeltasScenarios, construireDeltasTendances } from "./deltas";
import type { Brouillon } from "./schema";
import type { ScenarioVersion } from "@/lib/types";

function impacts(dir: "up" | "down" | "flat" = "flat") {
  return {
    eq: { direction: dir, label: "—", text: "…" },
    fi: { direction: dir, label: "—", text: "…" },
    fx: { direction: dir, label: "—", text: "…" },
    cm: { direction: dir, label: "—", text: "…" },
  } satisfies ScenarioVersion["impacts"];
}

function branche(over: Partial<Brouillon["scenarioRevisions"][number]["branches"][number]> = {}) {
  return {
    branchId: "hausse",
    likelihood: "central" as const,
    why: "Le CPI dépasse le consensus.",
    thesis: "La Fed reprend son cycle.",
    impacts: impacts(),
    watchSignals: "…",
    ...over,
  };
}

function versionActuelle(over: Partial<ScenarioVersion> = {}): ScenarioVersion {
  return {
    driverId: "rates",
    branchId: "hausse",
    version: 1,
    date: "2026-08-09",
    noteSlug: "2026-S32",
    likelihood: "moderee",
    likelihoodChangedFrom: null,
    why: "",
    thesis: "La Fed reprend son cycle.",
    impacts: impacts(),
    watchSignals: "…",
    ...over,
  };
}

describe("construireDeltasScenarios — seuls les drivers acceptés produisent des versions", () => {
  it("ignore une révision non acceptée", () => {
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central" })] },
    ];
    const deltas = construireDeltasScenarios(revisions, new Set(), [], "2026-S36", "2026-09-05");
    expect(deltas).toEqual([]);
  });

  it("émet une version pour un driver accepté", () => {
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central" })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ driverId: "rates", branchId: "hausse", version: 1 });
  });
});

describe("construireDeltasScenarios — ne versionne que ce qui a changé", () => {
  it("une branche identique à sa version courante ne produit rien", () => {
    const actuelle = versionActuelle({ likelihood: "central" });
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central" })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [actuelle],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toEqual([]);
  });

  it("une thèse reformulée, même vraisemblance, produit quand même une version", () => {
    const actuelle = versionActuelle({ likelihood: "central", thesis: "Ancienne thèse." });
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central", thesis: "Nouvelle thèse." })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [actuelle],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toHaveLength(1);
    expect(deltas[0].likelihoodChangedFrom).toBeNull();
  });

  it("un impact modifié produit une version, vraisemblance et thèse inchangées", () => {
    const actuelle = versionActuelle({ likelihood: "central", impacts: impacts("flat") });
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central", impacts: impacts("up") })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [actuelle],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toHaveLength(1);
  });

  it("les trois branches sont soumises, une seule a changé : une seule version émise", () => {
    const courant = [
      versionActuelle({ branchId: "hausse", likelihood: "central" }),
      versionActuelle({ branchId: "statuquo", likelihood: "moderee" }),
      versionActuelle({ branchId: "baisses", likelihood: "faible" }),
    ];
    const revisions: Brouillon["scenarioRevisions"] = [
      {
        driverId: "rates",
        branches: [
          branche({ branchId: "hausse", likelihood: "moderee" }), // change
          branche({ branchId: "statuquo", likelihood: "moderee" }), // inchangée
          branche({ branchId: "baisses", likelihood: "faible" }), // inchangée
        ],
      },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      courant,
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toHaveLength(1);
    expect(deltas[0].branchId).toBe("hausse");
  });
});

describe("construireDeltasScenarios — les champs structurels sont calculés", () => {
  it("la première version d'une branche porte le numéro 1", () => {
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche()] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas[0].version).toBe(1);
  });

  it("incrémente depuis la version courante, jamais depuis 1", () => {
    const actuelle = versionActuelle({ version: 4, likelihood: "moderee" });
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central" })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [actuelle],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas[0].version).toBe(5);
  });

  it("pose likelihoodChangedFrom uniquement quand la vraisemblance bouge", () => {
    const actuelle = versionActuelle({ likelihood: "moderee" });
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche({ likelihood: "central" })] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [actuelle],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas[0].likelihoodChangedFrom).toBe("moderee");
  });

  it("pose date et noteSlug depuis les paramètres, jamais depuis le modèle", () => {
    const revisions: Brouillon["scenarioRevisions"] = [
      { driverId: "rates", branches: [branche()] },
    ];
    const deltas = construireDeltasScenarios(
      revisions,
      new Set(["rates"]),
      [],
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas[0]).toMatchObject({ date: "2026-09-05", noteSlug: "2026-S36" });
  });
});

describe("construireDeltasTendances", () => {
  it("ignore une tendance non acceptée", () => {
    const updates: Brouillon["trendUpdates"] = [
      { trendId: "desinflation-terminee", status: "renforce", why: "Le CPI le confirme." },
    ];
    expect(
      construireDeltasTendances(updates, new Set(), "2026-S36", "2026-09-05"),
    ).toEqual([]);
  });

  it("produit une entrée d'historique pour une tendance acceptée", () => {
    const updates: Brouillon["trendUpdates"] = [
      { trendId: "desinflation-terminee", status: "renforce", why: "Le CPI le confirme." },
    ];
    const deltas = construireDeltasTendances(
      updates,
      new Set(["desinflation-terminee"]),
      "2026-S36",
      "2026-09-05",
    );
    expect(deltas).toEqual([
      {
        trendId: "desinflation-terminee",
        status: "renforce",
        entry: {
          date: "2026-09-05",
          status: "renforce",
          noteSlug: "2026-S36",
          why: "Le CPI le confirme.",
        },
      },
    ]);
  });
});
