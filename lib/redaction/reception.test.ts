import { describe, expect, it } from "vitest";
import { recevoir } from "./reception";
import { MARQUEUR_DEBUT, MARQUEUR_FIN, type Vivier } from "./sortie-mixte";

function vivier(over: Partial<Vivier> = {}): Vivier {
  return {
    driverIds: ["rates"],
    branchesParDriver: new Map([["rates", ["hausse", "statu-quo", "baisses"]]]),
    trendIds: [],
    instrumentIds: ["us10y"],
    veilleItemIds: ["item-1"],
    blocsAttendus: ["CeQuiAChange", "CeQueJeSurveille"],
    budgetGuets: 3,
    ...over,
  };
}

const FRONTMATTER = `regimeStatement: Le régime en une phrase.
keyIndicators:
  - label: Régime
    value: Choc d'offre
  - label: Biais
    value: Resserrement
  - label: Inflation
    value: "2,4 %"
channels: [fonction-reaction]
driverOrder: [rates]
trendRefs: []
instrumentRefs: [us10y]
veilleItemRefs: [item-1]`;

const STRUCTURE = {
  scenarioRevisions: [],
  guets: [],
  trendUpdates: [],
  sources: [{ block: "CeQuiAChange", sourceId: "item-1" }],
};

function reponse(
  corps = "<CeQuiAChange>\nCe qui a changé.\n</CeQuiAChange>\n\n<CeQueJavaisMalLu>\n</CeQueJavaisMalLu>\n\n<CeQueJeSurveille>\nTrois guets.\n</CeQueJeSurveille>",
  structure: unknown = STRUCTURE,
  frontmatter = FRONTMATTER,
) {
  return `---\n${frontmatter}\n---\n\n${corps}\n\n${MARQUEUR_DEBUT}\n${JSON.stringify(structure, null, 2)}\n${MARQUEUR_FIN}\n`;
}

describe("recevoir — de la réponse brute au brouillon", () => {
  it("reconstitue le brouillon des deux parties", () => {
    const res = recevoir(reponse(), vivier());
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const b = res.brouillon;
    expect(b.regimeStatement).toBe("Le régime en une phrase.");
    expect(b.driverOrder).toEqual(["rates"]);
    expect(b.instrumentRefs).toEqual(["us10y"]);
    expect(b.blocs).toEqual({
      CeQuiAChange: "Ce qui a changé.",
      CeQueJeSurveille: "Trois guets.",
    });
    expect(b.sources).toEqual([{ block: "CeQuiAChange", sourceId: "item-1" }]);
    expect(b.driverCandidate).toBeNull();
  });

  it("garde le markdown intérieur d'un bloc tel quel", () => {
    const corps =
      "<CeQuiAChange>\n**Gras.** Puis une liste :\n\n- un\n- deux\n</CeQuiAChange>\n\n<CeQueJeSurveille>\nTexte.\n</CeQueJeSurveille>";
    const res = recevoir(reponse(corps), vivier());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.brouillon.blocs.CeQuiAChange).toContain("- deux");
  });

  it("refuse un bloc attendu manquant", () => {
    const res = recevoir(reponse("<CeQuiAChange>\nTexte.\n</CeQuiAChange>"), vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("CeQueJeSurveille");
  });

  it("refuse un bloc attendu vide — l'écrire est la réponse attendue", () => {
    const corps = "<CeQuiAChange>\n</CeQuiAChange>\n\n<CeQueJeSurveille>\nTexte.\n</CeQueJeSurveille>";
    const res = recevoir(reponse(corps), vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("vide");
  });

  it("refuse un bloc 4 pré-rempli — une auto-critique de modèle est creuse par construction", () => {
    const corps =
      "<CeQuiAChange>\nTexte.\n</CeQuiAChange>\n\n<CeQueJavaisMalLu>\nJ'avais sous-estimé le choc.\n</CeQueJavaisMalLu>\n\n<CeQueJeSurveille>\nTexte.\n</CeQueJeSurveille>";
    const res = recevoir(reponse(corps), vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("pré-rempli");
  });

  it("accepte un bloc 4 absent : le code le pose au rendu", () => {
    const corps = "<CeQuiAChange>\nTexte.\n</CeQuiAChange>\n\n<CeQueJeSurveille>\nTexte.\n</CeQueJeSurveille>";
    expect(recevoir(reponse(corps), vivier())).toMatchObject({ ok: true });
  });

  it("remonte la raison d'une référence hors vivier", () => {
    const res = recevoir(reponse(undefined, STRUCTURE, FRONTMATTER.replace("[us10y]", "[nikkei]")), vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("nikkei");
  });

  it("remonte la raison d'une section JSON absente", () => {
    const res = recevoir(`---\n${FRONTMATTER}\n---\n\n<CeQuiAChange>\nTexte.\n</CeQuiAChange>`, vivier());
    expect(res).toMatchObject({ ok: false });
    if (res.ok) return;
    expect(res.raison).toContain("introuvable");
  });

  it("refuse une clé de frontmatter manquante", () => {
    const ampute = FRONTMATTER.split("\n").filter((l) => !l.startsWith("channels:")).join("\n");
    expect(recevoir(reponse(undefined, STRUCTURE, ampute), vivier())).toMatchObject({ ok: false });
  });
});
