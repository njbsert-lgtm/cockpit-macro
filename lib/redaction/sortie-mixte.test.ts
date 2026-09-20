import { describe, expect, it } from "vitest";
import {
  MARQUEUR_DEBUT,
  MARQUEUR_FIN,
  extraireSortieMixte,
  validerReponse,
  type Vivier,
} from "./sortie-mixte";

function vivier(over: Partial<Vivier> = {}): Vivier {
  return {
    driverIds: ["rates", "iran"],
    branchesParDriver: new Map([
      ["rates", ["hausse", "statu-quo", "baisses"]],
      ["iran", ["fin", "enlisement", "durcissement"]],
    ]),
    trendIds: ["desinflation-terminee"],
    instrumentIds: ["us10y", "brent"],
    veilleItemIds: ["item-1", "item-2"],
    sourceIds: ["item-1", "item-2", "Eurostat"],
    blocsAttendus: ["CeQuiAChange", "CeQuiSestConfirme"],
    budgetGuets: 3,
    ...over,
  };
}

function frontmatter(over: Record<string, unknown> = {}) {
  return {
    regimeStatement: "Le régime en une phrase.",
    keyIndicators: [
      { label: "Régime", value: "Choc d'offre" },
      { label: "Biais Fed", value: "Resserrement" },
      { label: "Inflation", value: "2,4 %" },
    ],
    channels: ["fonction-reaction"],
    driverOrder: ["rates", "iran"],
    trendRefs: [],
    instrumentRefs: ["us10y"],
    veilleItemRefs: ["item-1"],
    ...over,
  };
}

const IMPACTS = [
  { classe: "eq", direction: "down", label: "Actions", text: "Compression des multiples." },
  { classe: "fi", direction: "up", label: "Taux", text: "Partie courte sous tension." },
  { classe: "fx", direction: "up", label: "Change", text: "Dollar soutenu." },
  { classe: "cm", direction: "flat", label: "Matières premières", text: "Sans effet direct." },
];

function branche(branchId: string, likelihood: string) {
  return {
    branchId,
    likelihood,
    why: "La donnée d'inflation a surpris à la hausse.",
    thesis: "Thèse de la branche.",
    impacts: IMPACTS,
    watchSignals: "Le prochain communiqué du FOMC.",
  };
}

const REVISION_RATES = {
  driverId: "rates",
  branches: [
    branche("hausse", "central"),
    branche("statu-quo", "moderee"),
    branche("baisses", "faible"),
  ],
};

function structure(over: Record<string, unknown> = {}) {
  return {
    scenarioRevisions: [REVISION_RATES],
    guets: [],
    trendUpdates: [],
    sources: [],
    driverCandidate: null,
    redactionNotes: "",
    ...over,
  };
}

const GUET = {
  driverId: "rates",
  axeLibelle: null,
  libelle: "Réunion du FOMC",
  attendu: "Statu quo",
  confirmeSi: "Taux inchangé",
  infirmeSi: "Hausse de 25 bps",
  echeance: "2026-09-30",
  sourceAttendue: ["FED:communique"],
};

function valider(fm: Record<string, unknown>, st: Record<string, unknown>, v = vivier()) {
  return validerReponse(fm, JSON.stringify(st), v);
}

const MDX = "---\nregimeStatement: X\n---\n\n<CeQuiAChange>\nTexte.\n</CeQuiAChange>\n";

function reponse(json: unknown, mdx = MDX) {
  return `${mdx}\n${MARQUEUR_DEBUT}\n${JSON.stringify(json, null, 2)}\n${MARQUEUR_FIN}\n`;
}

describe("extraireSortieMixte — séparer la prose de la structure", () => {
  it("rend le MDX et le JSON séparément", () => {
    const res = extraireSortieMixte(reponse(structure()));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.mdx).toMatch(/^---\nregimeStatement/);
    expect(res.mdx).not.toContain("structure-json");
    expect(JSON.parse(res.jsonBrut).scenarioRevisions).toHaveLength(1);
  });

  it("tolère du texte après la section — le modèle bavarde parfois en fin de réponse", () => {
    const res = extraireSortieMixte(`${reponse(structure())}\nVoilà, j'ai terminé.`);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(JSON.parse(res.jsonBrut)).toHaveProperty("guets");
  });

  it("refuse une réponse sans section structurée", () => {
    const res = extraireSortieMixte(MDX);
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("introuvable");
  });

  it("refuse une section jamais refermée", () => {
    const res = extraireSortieMixte(`---\nx: 1\n---\n\n${MARQUEUR_DEBUT}\n{}\n`);
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("refermée");
  });

  it("refuse un MDX qui ne commence pas par son frontmatter", () => {
    const res = extraireSortieMixte(reponse(structure(), "Voici la note demandée.\n\n<CeQuiAChange>\n"));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("frontmatter");
  });
});

describe("validerReponse — le frontmatter", () => {
  it("accepte un frontmatter complet et cohérent", () => {
    expect(valider(frontmatter(), structure())).toMatchObject({ ok: true });
  });

  it("refuse un driverOrder qui n'est pas une permutation exacte", () => {
    const res = valider(frontmatter({ driverOrder: ["rates"] }), structure());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("permutation exacte");
  });

  it("refuse un driverOrder avec doublon", () => {
    expect(valider(frontmatter({ driverOrder: ["rates", "rates"] }), structure())).toMatchObject({
      ok: false,
    });
  });

  it("refuse un instrument absent du contexte", () => {
    const res = valider(frontmatter({ instrumentRefs: ["us10y", "nikkei"] }), structure());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("nikkei");
    expect(res.raison).toContain("frontmatter.instrumentRefs.1");
  });

  it("refuse un item de veille absent du contexte", () => {
    expect(valider(frontmatter({ veilleItemRefs: ["item-9"] }), structure())).toMatchObject({
      ok: false,
    });
  });

  it("refuse une tendance absente du contexte", () => {
    expect(valider(frontmatter({ trendRefs: ["japon-anomalie"] }), structure())).toMatchObject({
      ok: false,
    });
  });

  it("refuse moins de trois indicateurs clés", () => {
    expect(
      valider(frontmatter({ keyIndicators: [{ label: "a", value: "b" }] }), structure()),
    ).toMatchObject({ ok: false });
  });

  it("refuse un canal hors de la grille des cinq", () => {
    expect(valider(frontmatter({ channels: ["volatilite"] }), structure())).toMatchObject({
      ok: false,
    });
  });
});

describe("validerReponse — la section JSON", () => {
  it("accepte une semaine sans révision — une liste vide est une réponse juste", () => {
    expect(valider(frontmatter(), structure({ scenarioRevisions: [] }))).toMatchObject({ ok: true });
  });

  it("refuse un JSON syntaxiquement invalide en le disant", () => {
    const res = validerReponse(frontmatter(), '{ "guets": [ }', vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("section JSON invalide");
  });

  it("refuse un driver absent du vivier", () => {
    const res = valider(
      frontmatter(),
      structure({ scenarioRevisions: [{ ...REVISION_RATES, driverId: "inflation" }] }),
    );
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("driver inconnu");
    expect(res.raison).toContain("rates, iran");
  });

  it("refuse un ensemble de branches qui n'est pas celui du driver", () => {
    const mauvais = {
      driverId: "rates",
      branches: [branche("hausse", "central"), branche("statu-quo", "moderee"), branche("pause", "faible")],
    };
    const res = valider(frontmatter(), structure({ scenarioRevisions: [mauvais] }));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("branches attendues");
  });

  it("refuse une révision qui n'émet pas les trois branches", () => {
    const mauvais = { driverId: "rates", branches: [branche("hausse", "central")] };
    expect(valider(frontmatter(), structure({ scenarioRevisions: [mauvais] }))).toMatchObject({
      ok: false,
    });
  });

  it("refuse deux branches centrales", () => {
    const mauvais = {
      driverId: "rates",
      branches: [branche("hausse", "central"), branche("statu-quo", "central"), branche("baisses", "faible")],
    };
    const res = valider(frontmatter(), structure({ scenarioRevisions: [mauvais] }));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("central");
  });

  it("refuse une classe d'actif doublée dans les impacts", () => {
    const doublon = { ...branche("hausse", "central"), impacts: [IMPACTS[0], IMPACTS[0], IMPACTS[1], IMPACTS[2]] };
    const mauvais = {
      driverId: "rates",
      branches: [doublon, branche("statu-quo", "moderee"), branche("baisses", "faible")],
    };
    const res = valider(frontmatter(), structure({ scenarioRevisions: [mauvais] }));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("eq, fi, fx et cm");
  });

  it("accepte un guet portant l'axe sur lequel il se joue", () => {
    const bon = structure({ guets: [{ ...GUET, axeLibelle: "Fonction de réaction" }] });
    expect(valider(frontmatter(), bon)).toMatchObject({ ok: true });
  });

  it("refuse plus de guets que le budget — les remontés comptent dans les trois", () => {
    const deux = structure({ guets: [GUET, { ...GUET, libelle: "Autre" }] });
    const res = valider(frontmatter(), deux, vivier({ budgetGuets: 1 }));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("place(s)");
    expect(valider(frontmatter(), deux, vivier({ budgetGuets: 2 }))).toMatchObject({ ok: true });
  });

  it("refuse une échéance qui n'est pas une date ISO", () => {
    const res = valider(frontmatter(), structure({ guets: [{ ...GUET, echeance: "fin septembre" }] }));
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("AAAA-MM-JJ");
  });

  it("accepte une échéance nulle — « si Ormuz rouvre » n'a pas de date", () => {
    expect(valider(frontmatter(), structure({ guets: [{ ...GUET, echeance: null }] }))).toMatchObject({
      ok: true,
    });
  });

  it("refuse une tendance inconnue dans trendUpdates", () => {
    const res = valider(
      frontmatter(),
      structure({ trendUpdates: [{ trendId: "japon-anomalie", status: "renforce", why: "…" }] }),
    );
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("tendance inconnue");
  });

  it("refuse une source rattachée à un bloc que la note ne porte pas", () => {
    const res = valider(
      frontmatter(),
      structure({ sources: [{ block: "CeQueJeSurveille", sourceId: "item-1" }] }),
    );
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("ne s'afficherait nulle part");
  });

  it("refuse une source qui n'est pas un item du contexte — jamais d'URL inventée", () => {
    const res = valider(
      frontmatter(),
      structure({ sources: [{ block: "CeQuiAChange", sourceId: "https://example.org/a" }] }),
    );
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("source inconnue");
  });

  it("tolère l'absence de driverCandidate et de redactionNotes", () => {
    const minimal = {
      scenarioRevisions: [],
      guets: [],
      trendUpdates: [],
      sources: [],
    };
    const res = valider(frontmatter(), minimal);
    expect(res).toMatchObject({ ok: true });
    if (!res.ok) return;
    expect(res.structure.driverCandidate).toBeNull();
    expect(res.structure.redactionNotes).toBe("");
  });

  it("rend un seul message pour deux fautes de la même réponse", () => {
    const res = valider(
      frontmatter({ instrumentRefs: ["nikkei"] }),
      structure({ trendUpdates: [{ trendId: "inconnue", status: "renforce", why: "…" }] }),
    );
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("nikkei");
    expect(res.raison).toContain("inconnue");
  });
});
