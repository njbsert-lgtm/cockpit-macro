import { describe, expect, it } from "vitest";
import { parseNote } from "@/lib/notes";
import { decisionsVides, type Decisions } from "./publication";
import { etatPublication } from "./etat-publication";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";

const BROUILLON_MDX = `---
kind: hebdo
status: brouillon
date: '2026-09-05'
comparesTo: '2026-S35'
regimeStatement: Un régime en une phrase.
keyIndicators:
  - label: Régime
    value: Choc d'offre
zones: [global]
driverOrder: [rates]
trendRefs: [desinflation-terminee]
channels: [taux-reel]
sources: {}
guets:
  - id: 2026-s36-g1
    driverId: rates
    libelle: Réunion de la Fed du 16 septembre
    attendu: Statu quo
    confirmeSi: Taux inchangé
    infirmeSi: Hausse de 25 bps
    echeance: '2026-09-16'
---

<CeQuiAChange>

Rien n'a modifié la thèse cette semaine.

</CeQuiAChange>

<CeQuiSestConfirme>

Le cœur d'inflation continue de décélérer, à 4,18 % pour le 10 ans US.

</CeQuiSestConfirme>

<RevisionDesScenarios>

Aucune révision ne s'impose.

</RevisionDesScenarios>

<CeQueJavaisMalLu>

</CeQueJavaisMalLu>

<CeQueJeSurveille>

</CeQueJeSurveille>
`;

function paquet(): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S36",
    isoWeek: "2026-S36",
    date: "2026-09-05",
    comparesTo: "2026-S35",
    specialesDeLaSemaine: [],
    notePrecedente: null,
    observations: [
      {
        instrumentId: "us10y",
        label: "US 10 ans",
        unit: "percent",
        valeurs: [{ date: "2026-09-04", value: 4.18 }],
        variationSemaine: null,
        variationYTD: null,
        fraicheur: "ok",
      },
    ],
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

function brouillonPropose(over: Partial<Brouillon> = {}): Brouillon {
  return {
    regimeStatement: "Un régime en une phrase.",
    keyIndicators: [{ label: "Régime", value: "Choc d'offre" }],
    channels: ["taux-reel"],
    driverOrder: ["rates"],
    trendRefs: ["desinflation-terminee"],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: {},
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [],
    driverCandidate: null,
    redactionNotes: "",
    ...over,
  };
}

function decisionsCompletes(): Decisions {
  const d = decisionsVides();
  d.blocs.CeQuiAChange = { authorship: "ia-relue", texte: "Rien n'a modifié la thèse cette semaine." };
  d.blocs.CeQuiSestConfirme = {
    authorship: "ia-relue",
    texte: "Le cœur d'inflation continue de décélérer, à 4,18 % pour le 10 ans US.",
  };
  d.blocs.RevisionDesScenarios = { authorship: "ia-relue", texte: "Aucune révision ne s'impose." };
  d.blocs.CeQueJavaisMalLu = { authorship: "humaine", texte: "Rien de notable cette semaine." };
  d.guets["2026-s36-g1"] = { action: "accepter" };
  return d;
}

describe("etatPublication — l'aperçu avant toute décision finale", () => {
  it("n'est pas prêt sur un brouillon vierge : conditions manquantes ET chiffre non relu", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const etat = etatPublication(note, brouillonPropose(), decisionsVides(), paquet());
    expect(etat.pret).toBe(false);
    expect(etat.manquantes.length).toBeGreaterThan(0);
    // Le 4,18 est dans le vivier, mais le bloc n'a pas encore été relu (authorship ia) : bloque.
    expect(etat.rapportChiffres.bloque).toBe(false);
  });

  it("un chiffre absent du vivier bloque tant que le bloc reste à `ia`", () => {
    const note = parseNote(
      "2026-S36",
      BROUILLON_MDX.replace("4,18 %", "4,25 %"),
    );
    const etat = etatPublication(note, brouillonPropose(), decisionsVides(), paquet());
    expect(etat.rapportChiffres.bloque).toBe(true);
    expect(etat.pret).toBe(false);
  });

  it("un chiffre inventé ne bloque plus une fois le bloc corrigé par un humain", () => {
    const note = parseNote(
      "2026-S36",
      BROUILLON_MDX.replace("4,18 %", "4,25 %"),
    );
    const decisions = decisionsCompletes();
    decisions.blocs.CeQuiSestConfirme = {
      authorship: "ia-corrigee",
      texte: "Le cœur d'inflation continue de décélérer, à 4,25 % pour le 10 ans US.",
    };
    const etat = etatPublication(note, brouillonPropose(), decisions, paquet());
    expect(etat.rapportChiffres.bloque).toBe(false);
  });

  it("prêt une fois toutes les conditions tranchées et les chiffres conformes", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const etat = etatPublication(note, brouillonPropose(), decisionsCompletes(), paquet());
    expect(etat.manquantes).toEqual([]);
    expect(etat.rapportChiffres.bloque).toBe(false);
    expect(etat.pret).toBe(true);
  });

  it("ignore CeQueJeSurveille — sa prose n'est jamais publiée, la liste de guets la remplace", () => {
    const note = parseNote(
      "2026-S36",
      BROUILLON_MDX.replace(
        "<CeQueJeSurveille>\n\n</CeQueJeSurveille>",
        "<CeQueJeSurveille>\n\nUn chiffre halluciné : 99,9 %.\n\n</CeQueJeSurveille>",
      ),
    );
    const etat = etatPublication(note, brouillonPropose(), decisionsCompletes(), paquet());
    expect(etat.rapportChiffres.verdicts.some((v) => v.bloc === "CeQueJeSurveille")).toBe(false);
  });
});
