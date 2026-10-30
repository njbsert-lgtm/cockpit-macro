import { describe, expect, it } from "vitest";
import { parseNote, type BlockName } from "./notes";
import { requiredBlocks } from "./note-blocks";
import { MARCHES_PAR_DRIVER_A_PARTIR_DE, structureMarchesParDriver } from "@/config/suivi";

/**
 * La structure d'une hebdo dépend de sa semaine ISO : « Ce que j'avais mal lu » avant
 * `MARCHES_PAR_DRIVER_A_PARTIR_DE`, « Les marchés par driver » à partir de cette semaine. Les
 * tests tiennent à la constante, jamais à une semaine écrite en dur : la bascule peut être recalée.
 */

function semaine(delta: number): string {
  const n = Number(MARCHES_PAR_DRIVER_A_PARTIR_DE.slice(-2)) + delta;
  return `2026-S${String(n).padStart(2, "0")}`;
}

function source(blocs: BlockName[]): string {
  const fm = [
    "kind: hebdo",
    "date: '2026-11-07'",
    "comparesTo: null",
    'regimeStatement: "Un régime."',
    "keyIndicators:",
    "  - label: Régime",
    "    value: Choc",
    "zones:",
    "  - us",
    'driverOrder: ["rates"]',
    "guets:",
    "  - id: g1",
    "    driverId: rates",
    "    libelle: Un guet",
    "    attendu: Statu quo",
    "    confirmeSi: A",
    "    infirmeSi: B",
    "    echeance: '2026-11-20'",
  ];
  const corps = blocs.map((b) => `<${b}>\n\nTexte.\n\n</${b}>`).join("\n\n");
  return `---\n${fm.join("\n")}\n---\n\n${corps}\n`;
}

const AVANT: BlockName[] = ["CeQuiAChange", "CeQuiSestConfirme", "RevisionDesScenarios", "CeQueJavaisMalLu", "CeQueJeSurveille"];
const APRES: BlockName[] = ["CeQuiAChange", "CeQuiSestConfirme", "RevisionDesScenarios", "LesMarchesParDriver", "CeQueJeSurveille"];

describe("la structure d'une hebdo selon sa semaine", () => {
  it("la bascule est une comparaison de semaines ISO sur une seule constante", () => {
    expect(structureMarchesParDriver(semaine(-1))).toBe(false);
    expect(structureMarchesParDriver(semaine(0))).toBe(true);
    expect(structureMarchesParDriver(semaine(3))).toBe(true);
  });

  it("avant la bascule : « ce que j'avais mal lu » est exigé, « les marchés par driver » refusé", () => {
    expect(requiredBlocks("hebdo", semaine(-1))).toContain("CeQueJavaisMalLu");
    expect(() => parseNote(semaine(-1), source(AVANT))).not.toThrow();
    expect(() => parseNote(semaine(-1), source(APRES))).toThrow(/bloc obligatoire manquant « <CeQueJavaisMalLu>/);
  });

  it("à partir de la bascule : « les marchés par driver » remplace le bloc 4, au même rang", () => {
    expect(requiredBlocks("hebdo", semaine(0))).toEqual(APRES);
    const note = parseNote(semaine(0), source(APRES));
    expect(note.blocks).toEqual(APRES);
    expect(() => parseNote(semaine(0), source(AVANT))).toThrow(/bloc obligatoire manquant « <LesMarchesParDriver>/);
  });

  it("une note ne porte jamais les deux blocs", () => {
    const les2: BlockName[] = ["CeQuiAChange", "CeQuiSestConfirme", "RevisionDesScenarios", "CeQueJavaisMalLu", "LesMarchesParDriver", "CeQueJeSurveille"];
    expect(() => parseNote(semaine(0), source(les2))).toThrow(/interdit/);
    expect(() => parseNote(semaine(-1), source(les2))).toThrow(/interdit/);
  });

  it("une spéciale n'est pas concernée", () => {
    expect(requiredBlocks("speciale", semaine(2))).toEqual(["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"]);
  });
});
