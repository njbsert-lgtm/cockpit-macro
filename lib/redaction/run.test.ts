import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ecrireBrouillon, executerRun } from "./run";
import { controlerChiffres } from "./figures";
import type { StructuredCaller } from "@/lib/anthropic";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

function obs(): ObservationContexte {
  return {
    instrumentId: "us10y",
    label: "US 10 ans",
    unit: "percent",
    valeurs: [{ date: "2026-09-04", value: 4.18 }],
    variationSemaine: 0.05,
    variationYTD: null,
    fraicheur: "ok",
  };
}

function paquet(over: Partial<ContextePaquet> = {}): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S36",
    isoWeek: "2026-S36",
    date: "2026-09-05",
    comparesTo: "2026-S35",
    specialesDeLaSemaine: [],
    notePrecedente: null,
    observations: [obs()],
    itemsVeille: [],
    scenariosCourants: [
      {
        driverId: "rates",
        branchId: "hausse",
        version: 1,
        date: "2026-08-09",
        noteSlug: "2026-S32",
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
      },
    ],
    tendancesCourantes: [],
    guetsOuverts: [],
    guetsExpires: [],
    budgetGuets: 3,
    echeancesSemaine: [],
    trigger: null,
    ...over,
  };
}

function brouillon(over: Partial<Brouillon> = {}): Brouillon {
  return {
    regimeStatement: "Un régime en une phrase.",
    keyIndicators: [
      { label: "Régime", value: "Choc d'offre" },
      { label: "Biais", value: "Resserrement" },
      { label: "Ton", value: "prudent" },
    ],
    channels: ["taux-reel"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: {
      CeQuiAChange: "Rien n'a modifié la thèse cette semaine.",
      CeQuiSestConfirme: "Le régime tient.",
      RevisionDesScenarios: "Aucune révision ne s'impose.",
      CeQueJeSurveille: "Un point d'attention.",
    },
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [
      {
        driverId: "rates",
        libelle: "Réunion de la Fed",
        attendu: "Statu quo",
        confirmeSi: "Taux inchangé",
        infirmeSi: "Hausse de 25 bps",
        echeance: "2026-09-16",
        sourceAttendue: [],
      },
    ],
    driverCandidate: null,
    redactionNotes: "",
    ...over,
  };
}

/** Un corpus minimal injecté : une hebdo antérieure, à laquelle la candidate se compare. */
const CORPUS = [
  {
    slug: "2026-S35",
    source: `---
kind: hebdo
date: '2026-08-29'
comparesTo: null
regimeStatement: Le régime précédent.
keyIndicators:
  - label: Régime
    value: Choc d'offre
zones: [global]
driverOrder: [rates]
channels: [taux-reel]
sources: {}
---

<CeQuiAChange>Texte.</CeQuiAChange>

<CeQuiSestConfirme>Texte.</CeQuiSestConfirme>

<RevisionDesScenarios>Texte.</RevisionDesScenarios>

<CeQueJavaisMalLu>Texte.</CeQueJavaisMalLu>

<CeQueJeSurveille>Texte.</CeQueJeSurveille>
`,
  },
];

/** Le graphe minimal cohérent avec CORPUS : un driver, ses trois branches, aucune tendance. */
const GRAPHE = {
  drivers: [
    {
      id: "rates",
      label: "Taux directeurs",
      question: "La Fed reprend-elle son cycle ?",
      instrumentRefs: [],
      trendRefs: [],
      zones: ["us" as const],
      retiredAt: null,
    },
  ],
  trends: [],
  scenarios: (["hausse", "statuquo", "baisses"] as const).map((branchId, i) => ({
    driverId: "rates",
    branchId,
    version: 1,
    date: "2026-08-29",
    noteSlug: "2026-S35",
    likelihood: (i === 0 ? "central" : i === 1 ? "moderee" : "faible") as
      | "central"
      | "moderee"
      | "faible",
    likelihoodChangedFrom: null,
    why: "",
    thesis: "…",
    impacts: {
      eq: { direction: "flat" as const, label: "—", text: "…" },
      fi: { direction: "flat" as const, label: "—", text: "…" },
      fx: { direction: "flat" as const, label: "—", text: "…" },
      cm: { direction: "flat" as const, label: "—", text: "…" },
    },
    watchSignals: "…",
  })),
  outlooks: [],
  instrumentIds: new Set<string>(["us10y"]),
};

function callerRendant(...valeurs: Brouillon[]): StructuredCaller {
  let i = 0;
  return vi.fn(async () => ({
    value: valeurs[Math.min(i++, valeurs.length - 1)],
    usage: { input: 100, output: 200 },
  })) as unknown as StructuredCaller;
}

describe("executerRun — le dry-run n'écrit rien", () => {
  it("rend le MDX sans toucher au disque", async () => {
    const r = await executerRun(paquet(), callerRendant(brouillon()), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.ecrit).toBeNull();
    expect(r.mdx).toContain("<CeQuiAChange>");
    expect(r.slug).toBe("2026-S36");
  });

  it("cumule l'usage de tokens", async () => {
    const r = await executerRun(paquet(), callerRendant(brouillon()), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.usage).toEqual({ input: 100, output: 200 });
  });
});

describe("executerRun — le contrôle des chiffres bloque la publication", () => {
  it("un chiffre hors paquet rend le brouillon non publiable", async () => {
    const faux = brouillon({
      blocs: { ...brouillon().blocs, CeQuiAChange: "L'inflation atteint 4,7 %." },
    });
    const r = await executerRun(paquet(), callerRendant(faux), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.rapportChiffres.bloque).toBe(true);
    expect(r.publiable).toBe(false);
    expect(r.notes).toContain("Contrôle des chiffres bloquant");
  });

  it("un chiffre du paquet laisse le brouillon publiable", async () => {
    const juste = brouillon({
      blocs: { ...brouillon().blocs, CeQuiAChange: "Le 10 ans à 4,18 %." },
    });
    const r = await executerRun(paquet(), callerRendant(juste), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.rapportChiffres.bloque).toBe(false);
    expect(r.publiable).toBe(true);
  });

  it("le brouillon est produit malgré le blocage — un silence serait moins utile", async () => {
    const faux = brouillon({
      blocs: { ...brouillon().blocs, CeQuiAChange: "Inflation à 4,7 %." },
    });
    const r = await executerRun(paquet(), callerRendant(faux), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.mdx).toContain("Inflation à 4,7 %");
  });
});

describe("executerRun — la réparation, une seule fois", () => {
  it("ne rappelle pas le modèle quand la première version est valide", async () => {
    const caller = callerRendant(brouillon());
    await executerRun(paquet(), caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(caller).toHaveBeenCalledTimes(1);
  });

  it("rappelle le modèle une fois sur un rejet structurel, avec la raison", async () => {
    // driverOrder vide : refusé par le frontmatter (min 1).
    const casse = brouillon({ driverOrder: [] });
    const caller = callerRendant(casse, brouillon());
    const r = await executerRun(paquet(), caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });

    expect(caller).toHaveBeenCalledTimes(2);
    expect(r.structureValide).toBe(true);
    expect(r.notes).toContain("Première tentative rejetée");

    const secondAppel = (caller as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(secondAppel.user).toContain("Correction demandée");
  });

  it("abandonne après un second rejet, sans boucler", async () => {
    const casse = brouillon({ driverOrder: [] });
    const caller = callerRendant(casse, casse);
    const r = await executerRun(paquet(), caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });

    expect(caller).toHaveBeenCalledTimes(2);
    expect(r.structureValide).toBe(false);
    expect(r.publiable).toBe(false);
    expect(r.notes).toContain("Réparation rejetée à son tour");
  });

  it("ne tente aucune réparation quand on la refuse", async () => {
    const casse = brouillon({ driverOrder: [] });
    const caller = callerRendant(casse);
    const r = await executerRun(paquet(), caller, { dryRun: true, reparer: false, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(caller).toHaveBeenCalledTimes(1);
    expect(r.structureValide).toBe(false);
  });
});

describe("executerRun — ce que le modèle signale", () => {
  it("remonte un driver candidat sans jamais le créer", async () => {
    const avecCandidat = brouillon({ driverCandidate: "Le crédit privé américain." });
    const r = await executerRun(paquet(), callerRendant(avecCandidat), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.notes).toContain("Driver candidat signalé");
    expect(r.mdx).not.toContain("crédit privé");
  });
});

describe("ecrireBrouillon", () => {
  it("écrit la note et son rapport côte à côte", () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    const rapport = controlerChiffres(brouillon(), paquet());
    const chemin = ecrireBrouillon("2026-S36", "---\nkind: hebdo\n---\n", rapport, dossier);

    expect(existsSync(chemin)).toBe(true);
    expect(readFileSync(chemin, "utf8")).toContain("kind: hebdo");
    expect(existsSync(path.join(dossier, "2026-S36.chiffres.txt"))).toBe(true);
  });
});
