import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ecrireBrouillon, executerRun } from "./run";
import { controlerChiffres } from "./figures";
import type { TexteCaller } from "@/lib/anthropic";
import { MARQUEUR_DEBUT, MARQUEUR_FIN } from "./sortie-mixte";
import { REDACTION_MODEL } from "@/config/ai-models";
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
    drivers: [],
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
        axeLibelle: null,
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
      macroRefs: [],
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
  macroIndicatorIds: new Set<string>(),
};

/**
 * La réponse brute qu'un modèle produirait pour ce brouillon.
 *
 * Les tests passent donc par la réception réelle — extraction, frontmatter, blocs, section JSON
 * — au lieu de la court-circuiter. C'est précisément le morceau que l'abandon de la sortie
 * structurée a introduit, et le court-circuiter reviendrait à ne pas l'éprouver.
 */
function sortieDe(b: Brouillon): string {
  const frontmatter = [
    `regimeStatement: ${JSON.stringify(b.regimeStatement)}`,
    "keyIndicators:",
    ...b.keyIndicators.flatMap((k) => [
      `  - label: ${JSON.stringify(k.label)}`,
      `    value: ${JSON.stringify(k.value)}`,
    ]),
    `channels: ${JSON.stringify(b.channels)}`,
    `driverOrder: ${JSON.stringify(b.driverOrder)}`,
    `trendRefs: ${JSON.stringify(b.trendRefs)}`,
    `instrumentRefs: ${JSON.stringify(b.instrumentRefs)}`,
    `veilleItemRefs: ${JSON.stringify(b.veilleItemRefs)}`,
  ].join("\n");

  const corps = [
    ...Object.entries(b.blocs).map(([nom, texte]) => `<${nom}>\n${texte}\n</${nom}>`),
    "<CeQueJavaisMalLu>\n</CeQueJavaisMalLu>",
  ].join("\n\n");

  const structure = {
    scenarioRevisions: b.scenarioRevisions,
    guets: b.guets,
    trendUpdates: b.trendUpdates,
    sources: b.sources,
    driverCandidate: b.driverCandidate,
    redactionNotes: b.redactionNotes,
  };

  return `---\n${frontmatter}\n---\n\n${corps}\n\n${MARQUEUR_DEBUT}\n${JSON.stringify(structure, null, 2)}\n${MARQUEUR_FIN}\n`;
}

function callerRendant(...valeurs: Brouillon[]): TexteCaller {
  let i = 0;
  return vi.fn(async () => ({
    texte: sortieDe(valeurs[Math.min(i++, valeurs.length - 1)]),
    usage: { input: 100, output: 200 },
  })) as unknown as TexteCaller;
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

  it("appelle Claude sur le modèle configuré pour la rédaction, jamais un autre", async () => {
    // Garde-fou explicite : `config/ai-models.ts` est le seul endroit où ce choix doit se lire.
    // Si ce test casse, c'est que quelque chose a réintroduit un modèle en dur ici.
    const caller = vi.fn(async () => ({
      texte: sortieDe(brouillon()),
      usage: { input: 100, output: 200 },
    })) as unknown as TexteCaller;

    await executerRun(paquet(), caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });

    expect(caller).toHaveBeenCalledWith(expect.objectContaining({ model: REDACTION_MODEL }));
  });
});

describe("executerRun — le contrôle des chiffres bloque la publication", () => {
  it("un chiffre hors paquet rend le brouillon non publiable", async () => {
    const faux = brouillon({
      blocs: { ...brouillon().blocs, CeQuiAChange: "L'inflation atteint 4,7 %." },
    });
    const r = await executerRun(paquet(), callerRendant(faux), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.rapportChiffres?.bloque).toBe(true);
    expect(r.publiable).toBe(false);
    expect(r.notes).toContain("Contrôle des chiffres bloquant");
  });

  it("un chiffre du paquet laisse le brouillon publiable", async () => {
    const juste = brouillon({
      blocs: { ...brouillon().blocs, CeQuiAChange: "Le 10 ans à 4,18 %." },
    });
    const r = await executerRun(paquet(), callerRendant(juste), { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });
    expect(r.rapportChiffres?.bloque).toBe(false);
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

  it("rappelle le modèle une fois sur un rejet de réception, en lui renvoyant sa sortie", async () => {
    // driverOrder amputé : le vivier porte « rates », la permutation n'est pas exacte.
    const casse = brouillon({ driverOrder: [] });
    const caller = callerRendant(casse, brouillon());
    const r = await executerRun(paquet(), caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });

    expect(caller).toHaveBeenCalledTimes(2);
    expect(r.structureValide).toBe(true);
    expect(r.notes).toContain("Première tentative rejetée");

    // Le tour de réparation renvoie la sortie précédente puis la raison — c'est ce qui permet
    // au modèle de corriger un point plutôt que de tout réécrire au jugé.
    const second = (caller as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(second.messages).toHaveLength(3);
    expect(second.messages[1].role).toBe("assistant");
    expect(second.messages[2].content).toContain("permutation exacte");
  });

  it("répare aussi un rejet de validation, survenu après la réception", async () => {
    // Le brouillon est lisible, mais la note se compare à une note absente du corpus : c'est
    // `validateNoteChain` qui refuse, pas le contrat de sortie.
    const p = paquet({ comparesTo: "2026-S99" });
    const caller = callerRendant(brouillon());
    const r = await executerRun(p, caller, { dryRun: true, sourcesExistantes: CORPUS, graphe: GRAPHE });

    expect(caller).toHaveBeenCalledTimes(2);
    expect(r.structureValide).toBe(false);
    // Le brouillon existe malgré le rejet : il est fautif, mais lisible.
    expect(r.mdx).toContain("<CeQuiAChange>");
    expect(r.notes).toContain("Réparation rejetée à son tour");
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

  it("une réponse jamais lisible s'archive brute, avec sa raison", async () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    const illisible = vi.fn(async () => ({
      texte: "Je ne peux pas produire cette note.",
      usage: { input: 10, output: 5 },
    })) as unknown as TexteCaller;

    const r = await executerRun(paquet(), illisible, {
      sourcesExistantes: CORPUS,
      graphe: GRAPHE,
      dossierBrouillons: dossier,
      persisterEtat: async () => ({ ok: true }),
    });

    expect(r.mdx).toBeNull();
    expect(r.rapportChiffres).toBeNull();
    expect(r.ecrit).toBe(path.join(dossier, "2026-S36.echec.txt"));
    const contenu = readFileSync(r.ecrit as string, "utf8");
    expect(contenu).toContain("section structurée introuvable");
    expect(contenu).toContain("Je ne peux pas produire cette note.");
    // Pas de `.mdx` : le portail ne doit pas trouver une note là où il n'y en a pas.
    expect(existsSync(path.join(dossier, "2026-S36.mdx"))).toBe(false);
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

describe("executerRun — persistance du paquet de contexte", () => {
  it("ne persiste rien en dry-run", async () => {
    const persister = vi.fn(async () => ({ ok: true }));
    await executerRun(paquet(), callerRendant(brouillon()), {
      dryRun: true,
      sourcesExistantes: CORPUS,
      graphe: GRAPHE,
      persisterEtat: persister,
    });
    expect(persister).not.toHaveBeenCalled();
  });

  it("persiste le paquet et le brouillon proposé exacts quand le brouillon est écrit", async () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    const p = paquet();
    const b = brouillon();
    const persister = vi.fn(async () => ({ ok: true }));
    const r = await executerRun(p, callerRendant(b), {
      dryRun: false,
      sourcesExistantes: CORPUS,
      graphe: GRAPHE,
      persisterEtat: persister,
      dossierBrouillons: dossier,
    });
    expect(persister).toHaveBeenCalledWith(r.slug, p, b);
  });

  it("un échec de persistance n'empêche pas le run, et se lit dans les notes", async () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    const persister = vi.fn(async () => ({ ok: false, erreur: "injoignable" }));
    const r = await executerRun(paquet(), callerRendant(brouillon()), {
      dryRun: false,
      sourcesExistantes: CORPUS,
      graphe: GRAPHE,
      persisterEtat: persister,
      dossierBrouillons: dossier,
    });
    expect(r.ecrit).not.toBeNull();
    expect(r.notes).toContain("non persisté");
  });
});
