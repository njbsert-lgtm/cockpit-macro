import { describe, expect, it } from "vitest";
import { dateErratum, erratumSchema } from "./erratum";
import { parseNote } from "./notes";
import { checkIntegrity, type ContentGraph } from "./integrity";
import { construireContexte } from "./redaction/context";
import type { Note, ScenarioVersion } from "./types";

describe("erratumSchema", () => {
  it("accepte une date et un texte", () => {
    expect(erratumSchema.safeParse({ date: "2026-10-19", texte: "Un renvoi à une note retirée." }).success).toBe(true);
  });
  it("refuse un texte vide ou une date mal formée", () => {
    expect(erratumSchema.safeParse({ date: "2026-10-19", texte: "   " }).success).toBe(false);
    expect(erratumSchema.safeParse({ date: "19/10/2026", texte: "x" }).success).toBe(false);
  });
  it("s'écrit « JJ/MM/AAAA » dans l'intitulé", () => {
    expect(dateErratum("2026-10-19")).toBe("19/10/2026");
  });
});

const BLOCS = ["CeQuiAChange", "CeQuiSestConfirme", "RevisionDesScenarios", "CeQueJavaisMalLu", "CeQueJeSurveille"];
function noteSource(extra: string): string {
  const body = BLOCS.map((b) => `<${b}>\n\nTexte du bloc.\n\n</${b}>`).join("\n\n");
  return `---\nkind: hebdo\ndate: '2026-08-09'\ncomparesTo: null\nregimeStatement: Un régime.\nkeyIndicators:\n  - label: Régime\n    value: Choc\nzones:\n  - us\ndriverOrder: ["rates"]\n${extra}---\n\n${body}\n`;
}

describe("l'erratum d'une note (frontmatter)", () => {
  it("se lit dans les métadonnées et laisse le corps intact", () => {
    const sans = parseNote("2026-S33", noteSource(""));
    const avec = parseNote("2026-S33", noteSource("erratum:\n  date: '2026-10-19'\n  texte: Un renvoi retiré.\n"));
    expect(avec.meta.erratum).toEqual({ date: "2026-10-19", texte: "Un renvoi retiré." });
    expect(sans.meta.erratum).toBeNull();
    expect(avec.body).toBe(sans.body);
  });
  it("est refusé s'il est mal formé", () => {
    expect(() => parseNote("2026-S33", noteSource("erratum:\n  date: hier\n  texte: x\n"))).toThrow(/frontmatter invalide/);
  });
});

describe("l'erratum d'une version de scénario", () => {
  const note: Note = {
    slug: "2026-S27", kind: "hebdo", date: "2026-07-05", isoWeek: "2026-S27", parentWeek: null,
    provenance: "pipeline", comparesTo: null, trigger: null, regimeStatement: "x",
    keyIndicators: [{ label: "x", value: "x" }], zones: ["us"], driverOrder: ["rates"], trendRefs: [],
    instrumentRefs: [], veilleItemRefs: [], channels: [], sources: {}, guets: [], status: "publiee",
    publishedAt: null, authorship: {},
  } as Note;
  const version = (branchId: string, likelihood: ScenarioVersion["likelihood"], erratum?: unknown): ScenarioVersion => ({
    driverId: "rates", branchId, version: 1, date: "2026-07-05", noteSlug: "2026-S27", likelihood,
    likelihoodChangedFrom: null, why: "", thesis: "t",
    impacts: {
      eq: { direction: "flat", label: "-", text: "t" }, fi: { direction: "flat", label: "-", text: "t" },
      fx: { direction: "flat", label: "-", text: "t" }, cm: { direction: "flat", label: "-", text: "t" },
    },
    watchSignals: "w", ...(erratum === undefined ? {} : { erratum: erratum as never }),
  });
  const graphe = (erratum?: unknown): ContentGraph => ({
    drivers: [{ id: "rates", label: "T", question: "q", instrumentRefs: [], macroRefs: [], trendRefs: [], zones: ["us"], retiredAt: null }],
    trends: [], notes: [note], outlooks: [], instrumentIds: new Set(), macroIndicatorIds: new Set(),
    scenarios: [version("a", "central", erratum), version("b", "moderee"), version("c", "faible")],
  });

  it("accepte un erratum valide", () => {
    expect(() => checkIntegrity(graphe({ date: "2026-10-19", texte: "Un renvoi retiré." }))).not.toThrow();
  });
  it("refuse un erratum vide", () => {
    expect(() => checkIntegrity(graphe({ date: "2026-10-19", texte: "" }))).toThrow(/erratum invalide/);
  });

  it("n'entre pas dans le paquet de contexte de rédaction — ni sur les versions ni sur les notes", () => {
    const v = version("a", "central", { date: "2026-10-19", texte: "Secret d'erratum." });
    const n = { ...note, kind: "speciale", slug: "2026-S28-E1", parentWeek: "2026-S28", date: "2026-07-09", isoWeek: "2026-S28", trigger: "t", erratum: { date: "2026-10-19", texte: "Secret d'erratum." } } as Note;
    const paquet = construireContexte({
      kind: "hebdo", dateCible: "2026-07-12", notes: [note, n], notePrecedente: note, blocsPrecedents: {},
      observations: [], itemsVeille: [], scenariosCourants: [v], tendancesCourantes: [],
    });
    expect(paquet.specialesDeLaSemaine).toHaveLength(1);
    expect(JSON.stringify(paquet)).not.toContain("Secret d'erratum");
  });
});
