import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { blocsARediger, guetsDuBrouillon, rendreMdx } from "./mdx";
import { parseNote } from "@/lib/notes";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import type { Note, VeilleItem } from "@/lib/types";

function note(over: Partial<Note> = {}): Note {
  return {
    slug: "2026-S36-E1",
    kind: "speciale",
    date: "2026-09-02",
    isoWeek: "2026-S36",
    parentWeek: "2026-S36",
    comparesTo: null,
    trigger: "Brent ±8 %",
    regimeStatement: "…",
    keyIndicators: [{ label: "a", value: "b" }],
    zones: ["us"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    channels: [],
    sources: {},
    guets: [],
    status: "publiee",
    publishedAt: null,
    authorship: {},
    ...over,
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
    observations: [],
    itemsVeille: [],
    scenariosCourants: [],
    tendancesCourantes: [],
    guetsOuverts: [],
    guetsExpires: [],
    budgetGuets: 3,
    echeancesSemaine: [],
    trigger: null,
    ...over,
  };
}

const GUET = {
  driverId: "rates",
  libelle: "Réunion de la Fed",
  attendu: "Statu quo",
  confirmeSi: "Taux inchangé",
  infirmeSi: "Hausse de 25 bps",
  echeance: "2026-09-16",
  sourceAttendue: ["FED:communique"],
};

function brouillon(over: Partial<Brouillon> = {}): Brouillon {
  return {
    regimeStatement: "Un régime en une phrase.",
    keyIndicators: [
      { label: "Régime", value: "Choc d'offre" },
      { label: "Biais Fed", value: "Resserrement" },
      { label: "Inflation", value: "élevée" },
    ],
    channels: ["taux-reel"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: {
      CeQuiAChange: "Rien n'a modifié la thèse cette semaine.",
      CeQuiSestConfirme: "Le cœur d'inflation continue de décélérer.",
      RevisionDesScenarios: "Aucune révision ne s'impose.",
      CeQueJeSurveille: "Trois points d'attention.",
    },
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [GUET],
    driverCandidate: null,
    redactionNotes: "",
    ...over,
  };
}

describe("blocsARediger — le bloc 4 n'est jamais demandé au modèle", () => {
  it("une hebdo sans spéciale : quatre blocs, sans « ce que j'avais mal lu »", () => {
    expect(blocsARediger(paquet())).toEqual([
      "CeQuiAChange",
      "CeQuiSestConfirme",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
    ]);
  });

  it("ajoute RecapDesSpeciales quand la semaine en porte", () => {
    const p = paquet({ specialesDeLaSemaine: [note()] });
    expect(blocsARediger(p)).toContain("RecapDesSpeciales");
  });

  it("une spéciale n'a que ses trois blocs", () => {
    expect(blocsARediger(paquet({ noteType: "speciale" }))).toEqual([
      "CeQuiAChange",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
    ]);
  });
});

describe("rendreMdx — le fichier produit est une note valide", () => {
  it("passe parseNote sans retouche", () => {
    const { slug, mdx } = rendreMdx(brouillon(), paquet(), "2026-09-05");
    expect(() => parseNote(slug, mdx)).not.toThrow();
  });

  it("porte status: brouillon, jamais publiee", () => {
    const { mdx } = rendreMdx(brouillon(), paquet(), "2026-09-05");
    expect(matter(mdx).data.status).toBe("brouillon");
    expect(matter(mdx).data.publishedAt).toBeNull();
  });

  it("émet le bloc 4 vide — il n'est rempli qu'au portail, par un humain", () => {
    const { mdx } = rendreMdx(brouillon(), paquet(), "2026-09-05");
    expect(mdx).toContain("<CeQueJavaisMalLu>");
    expect(mdx).toMatch(/<CeQueJavaisMalLu>\s*<\/CeQueJavaisMalLu>/);
  });

  it("impose l'ordre canonique quel que soit l'ordre des clés du modèle", () => {
    const desordre = brouillon({
      blocs: {
        CeQueJeSurveille: "Quatre.",
        CeQuiAChange: "Un.",
        RevisionDesScenarios: "Trois.",
        CeQuiSestConfirme: "Deux.",
      },
    });
    const { slug, mdx } = rendreMdx(desordre, paquet(), "2026-09-05");
    expect(() => parseNote(slug, mdx)).not.toThrow();
    expect(mdx.indexOf("<CeQuiAChange>")).toBeLessThan(mdx.indexOf("<CeQuiSestConfirme>"));
    expect(mdx.indexOf("<CeQueJavaisMalLu>")).toBeLessThan(mdx.indexOf("<CeQueJeSurveille>"));
  });

  it("n'émet LeFilDeLaSemaine que si des items sont cités", () => {
    const sans = rendreMdx(brouillon(), paquet(), "2026-09-05");
    expect(sans.mdx).not.toContain("LeFilDeLaSemaine");

    const item: VeilleItem = {
      id: "i1",
      title: "Titre",
      url: "https://example.org/a",
      source: "Fed",
      publishedAt: "2026-09-03",
      zones: ["us"],
      driverRefs: [],
      channels: [],
      isSignal: true,
      status: "nouveau",
      attachedToBlock: null,
      draftNoteSlug: null,
    };
    const avec = rendreMdx(
      brouillon({ veilleItemRefs: ["i1"] }),
      paquet({ itemsVeille: [item] }),
      "2026-09-05",
    );
    expect(avec.mdx).toContain("<LeFilDeLaSemaine />");
  });

  it("échappe le YAML sans qu'on ait à y penser — apostrophes et deux-points", () => {
    const piege = brouillon({
      regimeStatement: "L'inflation : un régime d'offre, pas de demande.",
    });
    const { slug, mdx } = rendreMdx(piege, paquet(), "2026-09-05");
    expect(parseNote(slug, mdx).meta.regimeStatement).toBe(
      "L'inflation : un régime d'offre, pas de demande.",
    );
  });

  it("une spéciale garde son trigger et n'émet pas le bloc 4", () => {
    const p = paquet({ noteType: "speciale", slug: "2026-S36-E1", trigger: "Brent ±8 %" });
    const { slug, mdx } = rendreMdx(brouillon(), p, "2026-09-05");
    expect(() => parseNote(slug, mdx)).not.toThrow();
    expect(mdx).not.toContain("CeQueJavaisMalLu");
    expect(matter(mdx).data.trigger).toBe("Brent ±8 %");
  });
});

describe("guetsDuBrouillon", () => {
  it("pose un identifiant stable dérivé du slug et du rang", () => {
    const guets = guetsDuBrouillon(brouillon({ guets: [GUET, { ...GUET, libelle: "Autre" }] }), "2026-S36");
    expect(guets.map((g) => g.id)).toEqual(["2026-s36-g1", "2026-s36-g2"]);
  });

  it("ouvre chaque guet, sans résolution", () => {
    const [g] = guetsDuBrouillon(brouillon({ guets: [GUET] }), "2026-S36");
    expect(g).toMatchObject({ statut: "ouvert", resoluPar: null, resoluLe: null });
  });

  it("conserve une échéance nulle telle quelle", () => {
    const [g] = guetsDuBrouillon(
      brouillon({ guets: [{ ...GUET, echeance: null }] }),
      "2026-S36",
    );
    expect(g.echeance).toBeNull();
  });

  it("les guets rendus survivent à l'aller-retour par parseNote", () => {
    const { slug, mdx } = rendreMdx(brouillon({ guets: [GUET] }), paquet(), "2026-09-05");
    const relu = parseNote(slug, mdx);
    expect(relu.meta.guets).toHaveLength(1);
    expect(relu.meta.guets[0]).toMatchObject({
      id: "2026-s36-g1",
      noteSlug: "2026-S36",
      libelle: "Réunion de la Fed",
      echeance: "2026-09-16",
      statut: "ouvert",
    });
  });
});

describe("guets remontés — l'ancienneté survit au report", () => {
  const remonte = {
    id: "2026-s34-g1",
    noteSlug: "2026-S34",
    driverId: "iran",
    libelle: "Réouverture du détroit",
    attendu: "Le détroit reste contraint",
    confirmeSi: "Trafic rétabli",
    infirmeSi: "Fermeture totale",
    echeance: null,
    sourceAttendue: [],
    statut: "ouvert" as const,
    resoluPar: null,
    resoluLe: null,
  };

  it("un guet remonté figure dans la note qui le reprend", () => {
    const p = paquet({ guetsOuverts: [remonte], budgetGuets: 2 });
    const { guets } = rendreMdx(brouillon(), p, "2026-09-05");
    expect(guets.map((g) => g.id)).toEqual(["2026-s34-g1", "2026-s36-g1"]);
  });

  it("il garde sa note d'origine à travers l'aller-retour MDX", () => {
    const p = paquet({ guetsOuverts: [remonte], budgetGuets: 2 });
    const { slug, mdx } = rendreMdx(brouillon(), p, "2026-09-05");
    const relu = parseNote(slug, mdx);
    expect(relu.meta.guets[0].noteSlug).toBe("2026-S34");
    expect(relu.meta.guets[1].noteSlug).toBe("2026-S36");
  });

  it("un guet expiré remonte aussi, avec son statut", () => {
    const expire = {
      ...remonte,
      id: "2026-s33-g1",
      noteSlug: "2026-S33",
      echeance: "2026-08-01",
      statut: "expire" as const,
    };
    const p = paquet({ guetsExpires: [expire], budgetGuets: 2 });
    const { slug, mdx } = rendreMdx(brouillon(), p, "2026-09-05");
    expect(parseNote(slug, mdx).meta.guets[0]).toMatchObject({
      id: "2026-s33-g1",
      statut: "expire",
      noteSlug: "2026-S33",
    });
  });

  it("le plafond de trois tient, remontés compris", () => {
    const p = paquet({
      guetsOuverts: [remonte, { ...remonte, id: "2026-s34-g2" }],
      budgetGuets: 1,
    });
    const { slug, mdx } = rendreMdx(brouillon(), p, "2026-09-05");
    expect(() => parseNote(slug, mdx)).not.toThrow();
    expect(parseNote(slug, mdx).meta.guets).toHaveLength(3);
  });
});
