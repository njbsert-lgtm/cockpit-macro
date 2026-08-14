import { describe, expect, it } from "vitest";
import {
  parseEdition,
  parseSlug,
  readEditionSources,
  validateEditionChain,
  type BlockName,
  type ParsedEdition,
} from "./editions";

// --- fabrique de sources synthétiques ---------------------------------------

type Fm = {
  kind?: string;
  date?: string;
  comparesTo?: string | null;
  trigger?: string;
  regimeStatement?: string;
  trendRefs?: string[];
  instrumentRefs?: string[];
};

function source(fm: Fm = {}, blocks: BlockName[] = HEBDO_BLOCKS): string {
  const lines = [
    `kind: ${fm.kind ?? "hebdo"}`,
    `date: '${fm.date ?? "2026-08-09"}'`,
    `comparesTo: ${fm.comparesTo ?? "null"}`,
    ...(fm.trigger ? [`trigger: ${JSON.stringify(fm.trigger)}`] : []),
    `regimeStatement: ${JSON.stringify(fm.regimeStatement ?? "Un régime en une phrase.")}`,
    "keyIndicators:",
    "  - label: Régime",
    "    value: Choc d'offre",
    "zones:",
    "  - us",
    'driverOrder: ["rates"]',
    `trendRefs: ${JSON.stringify(fm.trendRefs ?? [])}`,
    `instrumentRefs: ${JSON.stringify(fm.instrumentRefs ?? [])}`,
    "sources: []",
  ];
  const body = blocks.map((b) => `<${b}>\n\nTexte du bloc.\n\n</${b}>`).join("\n\n");
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
}

const HEBDO_BLOCKS: BlockName[] = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
  "CeQueJeSurveille",
];
const SPECIALE_BLOCKS: BlockName[] = [
  "CeQuiAChange",
  "RevisionDesScenarios",
  "CeQueJeSurveille",
];

// ---------------------------------------------------------------------------

describe("parseSlug", () => {
  it("dérive la semaine ISO et le type depuis le nom de fichier", () => {
    expect(parseSlug("2026-S33")).toEqual({
      isoWeek: "2026-S33",
      impliedKind: "hebdo",
      parentWeek: null,
    });
  });

  it("rattache une spéciale à la semaine de son slug", () => {
    expect(parseSlug("2026-S33-E2")).toEqual({
      isoWeek: "2026-S33",
      impliedKind: "speciale",
      parentWeek: "2026-S33",
    });
  });

  it("rejette un slug malformé", () => {
    expect(() => parseSlug("aout-2026")).toThrow(/slug invalide/);
  });
});

describe("blocs obligatoires selon le type", () => {
  it("accepte une hebdo qui porte ses cinq blocs", () => {
    expect(() => parseEdition("2026-S33", source())).not.toThrow();
  });

  it("refuse une hebdo à laquelle il manque « ce que j'avais mal lu »", () => {
    const blocks = HEBDO_BLOCKS.filter((b) => b !== "CeQueJavaisMalLu");
    expect(() => parseEdition("2026-S33", source({}, blocks))).toThrow(
      /bloc obligatoire manquant « <CeQueJavaisMalLu> »/,
    );
  });

  it("refuse une hebdo à laquelle il manque « ce qui s'est confirmé »", () => {
    const blocks = HEBDO_BLOCKS.filter((b) => b !== "CeQuiSestConfirme");
    expect(() => parseEdition("2026-S33", source({}, blocks))).toThrow(
      /bloc obligatoire manquant « <CeQuiSestConfirme> »/,
    );
  });

  it("accepte une spéciale avec seulement ses trois blocs", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 % sur 2 séances" };
    expect(() => parseEdition("2026-S33-E1", source(fm, SPECIALE_BLOCKS))).not.toThrow();
  });

  it("refuse une spéciale sans révision des scénarios", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 %" };
    const blocks = SPECIALE_BLOCKS.filter((b) => b !== "RevisionDesScenarios");
    expect(() => parseEdition("2026-S33-E1", source(fm, blocks))).toThrow(
      /bloc obligatoire manquant « <RevisionDesScenarios> »/,
    );
  });

  it("refuse un bloc réservé aux hebdos dans une spéciale — la structure allégée doit rester distincte", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 %" };
    const blocks: BlockName[] = [
      "CeQuiAChange",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
      "CeQueJavaisMalLu",
    ];
    expect(() => parseEdition("2026-S33-E1", source(fm, blocks))).toThrow(/interdit dans une spéciale/);
  });

  it("refuse un nom de bloc inconnu plutôt que de l'ignorer en silence", () => {
    const raw = source().replace("<CeQuiAChange>", "<CeQuiAChanger>");
    expect(() => parseEdition("2026-S33", raw)).toThrow(/bloc inconnu « <CeQuiAChanger> »/);
  });

  it("refuse un bloc présent deux fois", () => {
    const blocks = [...HEBDO_BLOCKS, "CeQuiAChange" as BlockName];
    expect(() => parseEdition("2026-S33", source({}, blocks))).toThrow(/présent deux fois/);
  });

  it("impose l'ordre canonique — « ce que j'avais mal lu » ne peut pas passer en tête", () => {
    const blocks: BlockName[] = [
      "CeQueJavaisMalLu",
      "CeQuiAChange",
      "CeQuiSestConfirme",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
    ];
    expect(() => parseEdition("2026-S33", source({}, blocks))).toThrow(/ordre des blocs non canonique/);
  });
});

describe("frontmatter", () => {
  it("refuse un type incohérent avec la forme du slug", () => {
    expect(() => parseEdition("2026-S33-E1", source({ kind: "hebdo" }))).toThrow(
      /le frontmatter déclare « hebdo » mais la forme du slug implique « speciale »/,
    );
  });

  it("exige le seuil franchi sur une spéciale", () => {
    const raw = source({ kind: "speciale" }, SPECIALE_BLOCKS);
    expect(() => parseEdition("2026-S33-E1", raw)).toThrow(/doit déclarer le seuil franchi/);
  });

  it("refuse un seuil sur une hebdo, qui paraît qu'il se passe quelque chose ou non", () => {
    expect(() => parseEdition("2026-S33", source({ trigger: "Brent ±8 %" }))).toThrow(
      /ne doit pas déclarer de « trigger »/,
    );
  });

  it("refuse un frontmatter incomplet", () => {
    const raw = source().replace(/regimeStatement:.*\n/, "");
    expect(() => parseEdition("2026-S33", raw)).toThrow(/frontmatter invalide/);
  });
});

// ---------------------------------------------------------------------------

describe("règles inter-fichiers", () => {
  const hebdo = (slug: string, date: string, comparesTo: string | null, blocks = HEBDO_BLOCKS) =>
    parseEdition(slug, source({ date, comparesTo }, blocks));
  const speciale = (slug: string, date: string, comparesTo: string | null) =>
    parseEdition(slug, source({ kind: "speciale", date, comparesTo, trigger: "Brent ±8 %" }, SPECIALE_BLOCKS));

  it("accepte une chaîne conforme", () => {
    const corpus: ParsedEdition[] = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S27", [...HEBDO_BLOCKS, "RecapDesSpeciales"]),
    ];
    expect(() => validateEditionChain(corpus)).not.toThrow();
  });

  it("refuse une hebdo qui se compare à une spéciale — sinon le fil hebdomadaire se rompt", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S28-E1", [...HEBDO_BLOCKS, "RecapDesSpeciales"]),
    ];
    expect(() => validateEditionChain(corpus)).toThrow(
      /une hebdo se compare à la hebdo précédente \(2026-S27\)/,
    );
  });

  it("exige qu'une spéciale se compare à la dernière édition parue, quelle qu'elle soit", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      // E2 devrait se comparer à E1, pas à la hebdo.
      speciale("2026-S28-E2", "2026-07-10", "2026-S27"),
    ];
    expect(() => validateEditionChain(corpus)).toThrow(
      /une spéciale se compare à la dernière édition parue \(2026-S28-E1\)/,
    );
  });

  it("exige le récapitulatif quand la semaine a porté des spéciales", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S27"), // sans RecapDesSpeciales
    ];
    expect(() => validateEditionChain(corpus)).toThrow(
      /la semaine 2026-S28 porte 1 spéciale\(s\) : le bloc « <RecapDesSpeciales> » est obligatoire/,
    );
  });

  it("refuse un récapitulatif quand aucune spéciale n'a paru cette semaine-là", () => {
    const corpus = [hebdo("2026-S27", "2026-07-05", null, [...HEBDO_BLOCKS, "RecapDesSpeciales"])];
    expect(() => validateEditionChain(corpus)).toThrow(/n'a rien à consolider/);
  });

});

// ---------------------------------------------------------------------------

describe("le corpus réel", () => {
  it("compile : les 9 éditions passent toutes les règles", () => {
    const parsed = readEditionSources().map(({ slug, source: raw }) => parseEdition(slug, raw));
    expect(parsed).toHaveLength(9);
    const meta = validateEditionChain(parsed);
    expect(meta.map((e) => e.slug)).toEqual([
      "2026-S27",
      "2026-S28-E1",
      "2026-S28",
      "2026-S29",
      "2026-S31",
      "2026-S32-E1",
      "2026-S32-E2",
      "2026-S32",
      "2026-S33-E1",
    ]);
  });

  it("garde les cas dégradés de l'archive : un trou de semaine et une semaine à deux spéciales", () => {
    const parsed = readEditionSources().map(({ slug, source: raw }) => parseEdition(slug, raw));
    const weeks = new Set(parsed.map((p) => p.meta.isoWeek));
    expect(weeks.has("2026-S30")).toBe(false); // le trou

    const s32 = parsed.filter((p) => p.meta.kind === "speciale" && p.meta.parentWeek === "2026-S32");
    expect(s32).toHaveLength(2);
  });
});
