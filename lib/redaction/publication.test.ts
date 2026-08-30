import { describe, expect, it } from "vitest";
import { parseNote } from "@/lib/notes";
import {
  appliquerDecisionGuet,
  assemblerNoteFinale,
  authorshipBloc5,
  conditionsManquantes,
  construireArtefactsPublication,
  controlerChiffresPublication,
  decisionsVides,
  relireNoteFinale,
  type Decisions,
} from "./publication";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import type { Guet, ScenarioVersion } from "@/lib/types";

function guet(over: Partial<Guet> = {}): Guet {
  return {
    id: "2026-s36-g1",
    noteSlug: "2026-S36",
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

describe("authorshipBloc5 — se déduit des guets, jamais saisi directement", () => {
  it("aucun guet : réputé relu", () => {
    expect(authorshipBloc5([], {})).toBe("ia-relue");
  });

  it("un guet jamais ouvert bloque le bloc entier", () => {
    expect(authorshipBloc5([guet()], {})).toBe("ia");
  });

  it("tous acceptés tels quels : ia-relue", () => {
    const g = [guet({ id: "g1" }), guet({ id: "g2" })];
    const decisions = { g1: { action: "accepter" as const }, g2: { action: "refuser" as const } };
    expect(authorshipBloc5(g, decisions)).toBe("ia-relue");
  });

  it("au moins un corrigé : ia-corrigee, même si les autres sont acceptés tels quels", () => {
    const g = [guet({ id: "g1" }), guet({ id: "g2" })];
    const decisions = {
      g1: { action: "accepter" as const },
      g2: { action: "corriger" as const, correction: { attendu: "Autre chose" } },
    };
    expect(authorshipBloc5(g, decisions)).toBe("ia-corrigee");
  });

  it("un seul guet non tranché bloque même si tous les autres le sont", () => {
    const g = [guet({ id: "g1" }), guet({ id: "g2" }), guet({ id: "g3" })];
    const decisions = { g1: { action: "accepter" as const }, g2: { action: "accepter" as const } };
    expect(authorshipBloc5(g, decisions)).toBe("ia");
  });
});

describe("appliquerDecisionGuet", () => {
  const SLUG = "2026-S36";

  it("un guet neuf refusé disparaît", () => {
    const g = guet({ noteSlug: SLUG });
    expect(appliquerDecisionGuet(g, { action: "refuser" }, SLUG)).toBeNull();
  });

  it("un guet remonté refusé se clôt en sans-objet, sans disparaître", () => {
    const g = guet({ noteSlug: "2026-S34" });
    const resultat = appliquerDecisionGuet(g, { action: "refuser" }, SLUG);
    expect(resultat).toMatchObject({ noteSlug: "2026-S34", statut: "sans-objet" });
  });

  it("aucune décision équivaut à un refus, jamais à une acceptation tacite", () => {
    const neuf = guet({ noteSlug: SLUG });
    const remonte = guet({ noteSlug: "2026-S34" });
    expect(appliquerDecisionGuet(neuf, undefined, SLUG)).toBeNull();
    expect(appliquerDecisionGuet(remonte, undefined, SLUG)?.statut).toBe("sans-objet");
  });

  it("une correction fusionne les champs fournis, garde le reste", () => {
    const g = guet({ noteSlug: SLUG, libelle: "Ancien libellé" });
    const resultat = appliquerDecisionGuet(
      g,
      { action: "corriger", correction: { libelle: "Nouveau libellé" } },
      SLUG,
    );
    expect(resultat).toMatchObject({ libelle: "Nouveau libellé", attendu: g.attendu });
  });

  it("accepter laisse le guet inchangé", () => {
    const g = guet({ noteSlug: SLUG });
    expect(appliquerDecisionGuet(g, { action: "accepter" }, SLUG)).toEqual(g);
  });
});

// ---------------------------------------------------------------------------

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

Le cœur d'inflation continue de décélérer.

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

function noteToutesDecisionsPrises(): Decisions {
  const d = decisionsVides();
  d.blocs.CeQuiAChange = { authorship: "ia-relue", texte: "Rien n'a modifié la thèse cette semaine." };
  d.blocs.CeQuiSestConfirme = { authorship: "ia-relue", texte: "Le cœur d'inflation continue de décélérer." };
  d.blocs.RevisionDesScenarios = { authorship: "ia-relue", texte: "Aucune révision ne s'impose." };
  d.blocs.CeQueJavaisMalLu = { authorship: "humaine", texte: "Rien de notable cette semaine." };
  d.guets["2026-s36-g1"] = { action: "accepter" };
  return d;
}

describe("conditionsManquantes", () => {
  it("liste tout ce qui manque sur un brouillon vierge", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const manquantes = conditionsManquantes(note, brouillonPropose(), decisionsVides());
    const codes = manquantes.map((m) => m.code);
    expect(codes).toContain("bloc4");
    expect(codes).toContain("bloc:CeQuiAChange");
    expect(codes).toContain("guet:2026-s36-g1");
    // CeQueJeSurveille n'est jamais vérifié directement : couvert par la condition sur les guets.
    expect(codes).not.toContain("bloc:CeQueJeSurveille");
  });

  it("ne relève rien quand tout a été tranché", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    expect(conditionsManquantes(note, brouillonPropose(), noteToutesDecisionsPrises())).toEqual([]);
  });

  it("exige une décision explicite sur chaque révision de scénario proposée", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const propose = brouillonPropose({
      scenarioRevisions: [{ driverId: "rates", branches: [] }],
    });
    const manquantes = conditionsManquantes(note, propose, noteToutesDecisionsPrises());
    expect(manquantes.map((m) => m.code)).toContain("revision:rates");
  });

  it("exige une décision explicite sur chaque changement de tendance proposé", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const propose = brouillonPropose({
      trendUpdates: [{ trendId: "desinflation-terminee", status: "renforce", why: "…" }],
    });
    const manquantes = conditionsManquantes(note, propose, noteToutesDecisionsPrises());
    expect(manquantes.map((m) => m.code)).toContain("tendance:desinflation-terminee");
  });

  it("le bloc 4 vide au sens du texte, même « décidé », reste manquant", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    decisions.blocs.CeQueJavaisMalLu = { authorship: "humaine", texte: "   " };
    const manquantes = conditionsManquantes(note, brouillonPropose(), decisions);
    expect(manquantes.map((m) => m.code)).toContain("bloc4");
  });
});

describe("controlerChiffresPublication — bloquant sur ia/ia-relue, signalant au-delà", () => {
  it("un chiffre introuvable dans un bloc ia-relue bloque", () => {
    const rapport = controlerChiffresPublication(
      { CeQuiAChange: "L'inflation atteint 4,7 %." },
      { CeQuiAChange: "ia-relue" },
      paquet(),
    );
    expect(rapport.bloque).toBe(true);
  });

  it("le même chiffre dans un bloc humaine ne bloque pas, mais reste rapporté", () => {
    const rapport = controlerChiffresPublication(
      { CeQueJavaisMalLu: "J'avais annoncé 4,7 %, c'était faux." },
      { CeQueJavaisMalLu: "humaine" },
      paquet(),
    );
    expect(rapport.bloque).toBe(false);
    expect(rapport.verdicts[0].verdict).toBe("introuvable");
  });

  it("ia-corrigee ne bloque pas non plus", () => {
    const rapport = controlerChiffresPublication(
      { CeQuiSestConfirme: "Confirmé à 4,7 %." },
      { CeQuiSestConfirme: "ia-corrigee" },
      paquet(),
    );
    expect(rapport.bloque).toBe(false);
  });

  it("un bloc sans authorship connue est traité comme bloquant, par prudence", () => {
    const rapport = controlerChiffresPublication(
      { CeQuiAChange: "Inflation à 4,7 %." },
      {},
      paquet(),
    );
    expect(rapport.bloque).toBe(true);
  });

  it("un chiffre du paquet ne bloque jamais, quelle que soit l'authorship", () => {
    const rapport = controlerChiffresPublication(
      { CeQuiAChange: "Le 10 ans à 4,18 %." },
      { CeQuiAChange: "ia-relue" },
      paquet(),
    );
    expect(rapport.bloque).toBe(false);
  });
});

describe("assemblerNoteFinale — le MDX produit est une note publiée valide", () => {
  it("passe relireNoteFinale (parseNote) sans retouche", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const { slug, mdx } = assemblerNoteFinale(note, noteToutesDecisionsPrises(), "2026-09-06");
    expect(() => relireNoteFinale(slug, mdx)).not.toThrow();
  });

  it("bascule status à publiee et fige publishedAt", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const { mdx } = assemblerNoteFinale(note, noteToutesDecisionsPrises(), "2026-09-06");
    const finale = relireNoteFinale("2026-S36", mdx);
    expect(finale.meta.status).toBe("publiee");
    expect(finale.meta.publishedAt).toBe("2026-09-06");
  });

  it("porte le texte édité, pas la prose d'origine, pour un bloc corrigé", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    decisions.blocs.CeQuiAChange = { authorship: "ia-corrigee", texte: "Texte corrigé à la main." };
    const { mdx } = assemblerNoteFinale(note, decisions, "2026-09-06");
    const finale = relireNoteFinale("2026-S36", mdx);
    expect(finale.body).toContain("Texte corrigé à la main.");
    expect(finale.body).not.toContain("Rien n'a modifié la thèse");
  });

  it("pose l'authorship de chaque bloc décidé, et le déduit pour le bloc 5", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    const { mdx } = assemblerNoteFinale(note, decisions, "2026-09-06");
    const finale = relireNoteFinale("2026-S36", mdx);
    expect(finale.meta.authorship.CeQuiAChange).toBe("ia-relue");
    expect(finale.meta.authorship.CeQueJavaisMalLu).toBe("humaine");
    expect(finale.meta.authorship.CeQueJeSurveille).toBe("ia-relue");
  });

  it("un guet refusé disparaît de la note finale", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    decisions.guets["2026-s36-g1"] = { action: "refuser" };
    const { mdx } = assemblerNoteFinale(note, decisions, "2026-09-06");
    // Zéro guet restant : la note redevient non structurée pour ce bloc, ce que le validateur
    // refuse à partir de la bascule — c'est le comportement correct, pas une erreur du test.
    expect(() => relireNoteFinale("2026-S36", mdx)).toThrow(/doit être structuré/);
  });

  it("un guet corrigé porte sa correction dans la note finale", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    decisions.guets["2026-s36-g1"] = {
      action: "corriger",
      correction: { attendu: "Un léger biais restrictif, pas un statu quo pur." },
    };
    const { mdx } = assemblerNoteFinale(note, decisions, "2026-09-06");
    const finale = relireNoteFinale("2026-S36", mdx);
    expect(finale.meta.guets[0].attendu).toBe("Un léger biais restrictif, pas un statu quo pur.");
  });

  it("conserve driverOrder, trendRefs, comparesTo depuis le brouillon", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const { mdx } = assemblerNoteFinale(note, noteToutesDecisionsPrises(), "2026-09-06");
    const finale = relireNoteFinale("2026-S36", mdx);
    expect(finale.meta.driverOrder).toEqual(["rates"]);
    expect(finale.meta.trendRefs).toEqual(["desinflation-terminee"]);
    expect(finale.meta.comparesTo).toBe("2026-S35");
  });
});

function impacts(dir: "up" | "down" | "flat" = "flat") {
  return {
    eq: { direction: dir, label: "—", text: "…" },
    fi: { direction: dir, label: "—", text: "…" },
    fx: { direction: dir, label: "—", text: "…" },
    cm: { direction: dir, label: "—", text: "…" },
  } satisfies ScenarioVersion["impacts"];
}

describe("construireArtefactsPublication — le calcul complet, sans disque", () => {
  it("ne produit aucun delta quand aucune révision n'a été acceptée", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const propose = brouillonPropose({
      scenarioRevisions: [
        {
          driverId: "rates",
          branches: [{ branchId: "hausse", likelihood: "central", why: "…", thesis: "…", impacts: impacts(), watchSignals: "…" }],
        },
      ],
    });
    const decisions = noteToutesDecisionsPrises();
    decisions.revisions.rates = { action: "refuser" };
    const artefacts = construireArtefactsPublication(note, propose, paquet(), decisions, "2026-09-06");
    expect(artefacts.scenariosGeneres).toEqual([]);
  });

  it("verse un delta de scénario par branche changée, pour un driver accepté", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const propose = brouillonPropose({
      scenarioRevisions: [
        {
          driverId: "rates",
          branches: [
            { branchId: "hausse", likelihood: "moderee", why: "Le CPI surprend à la hausse.", thesis: "…", impacts: impacts("up"), watchSignals: "…" },
          ],
        },
      ],
    });
    const decisions = noteToutesDecisionsPrises();
    decisions.revisions.rates = { action: "accepter" };
    const artefacts = construireArtefactsPublication(note, propose, paquet(), decisions, "2026-09-06");
    expect(artefacts.scenariosGeneres).toHaveLength(1);
    expect(artefacts.scenariosGeneres[0]).toMatchObject({
      driverId: "rates",
      branchId: "hausse",
      noteSlug: "2026-S36",
      date: "2026-09-06",
      version: 1,
    });
  });

  it("verse un delta de tendance seulement pour une tendance acceptée", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const propose = brouillonPropose({
      trendUpdates: [
        { trendId: "desinflation-terminee", status: "renforce", why: "L'IPC sous-jacent décélère encore." },
      ],
    });
    const decisions = noteToutesDecisionsPrises();
    decisions.tendances["desinflation-terminee"] = { action: "refuser" };
    const sansAcceptation = construireArtefactsPublication(note, propose, paquet(), decisions, "2026-09-06");
    expect(sansAcceptation.tendancesGenerees).toEqual([]);

    decisions.tendances["desinflation-terminee"] = { action: "accepter" };
    const avecAcceptation = construireArtefactsPublication(note, propose, paquet(), decisions, "2026-09-06");
    expect(avecAcceptation.tendancesGenerees).toEqual([
      {
        trendId: "desinflation-terminee",
        status: "renforce",
        entry: {
          date: "2026-09-06",
          status: "renforce",
          noteSlug: "2026-S36",
          why: "L'IPC sous-jacent décélère encore.",
        },
      },
    ]);
  });

  it("lève si le MDX assemblé est structurellement invalide, avant tout calcul de delta", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    decisions.guets["2026-s36-g1"] = { action: "refuser" };
    expect(() =>
      construireArtefactsPublication(note, brouillonPropose(), paquet(), decisions, "2026-09-06"),
    ).toThrow(/doit être structuré/);
  });

  it("porte la note finale assemblée, identique à assemblerNoteFinale", () => {
    const note = parseNote("2026-S36", BROUILLON_MDX);
    const decisions = noteToutesDecisionsPrises();
    const artefacts = construireArtefactsPublication(
      note,
      brouillonPropose(),
      paquet(),
      decisions,
      "2026-09-06",
    );
    const attendu = assemblerNoteFinale(note, decisions, "2026-09-06");
    expect(artefacts.note).toEqual(attendu);
  });
});
