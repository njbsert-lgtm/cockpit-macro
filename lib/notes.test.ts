import { describe, expect, it } from "vitest";
import {
  parseNote,
  parseSlug,
  readNoteSources,
  validateNoteChain,
  type BlockName,
  type ParsedNote,
} from "./notes";

// --- fabrique de sources synthétiques ---------------------------------------

type Fm = {
  kind?: string;
  date?: string;
  comparesTo?: string | null;
  trigger?: string;
  regimeStatement?: string;
  trendRefs?: string[];
  instrumentRefs?: string[];
  sources?: string;
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
    fm.sources ?? "sources: {}",
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
    expect(() => parseNote("2026-S33", source())).not.toThrow();
  });

  it("refuse une hebdo à laquelle il manque « ce que j'avais mal lu »", () => {
    const blocks = HEBDO_BLOCKS.filter((b) => b !== "CeQueJavaisMalLu");
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(
      /bloc obligatoire manquant « <CeQueJavaisMalLu> »/,
    );
  });

  it("refuse une hebdo à laquelle il manque « ce qui s'est confirmé »", () => {
    const blocks = HEBDO_BLOCKS.filter((b) => b !== "CeQuiSestConfirme");
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(
      /bloc obligatoire manquant « <CeQuiSestConfirme> »/,
    );
  });

  it("accepte une spéciale avec seulement ses trois blocs", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 % sur 2 séances" };
    expect(() => parseNote("2026-S33-E1", source(fm, SPECIALE_BLOCKS))).not.toThrow();
  });

  it("refuse une spéciale sans révision des scénarios", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 %" };
    const blocks = SPECIALE_BLOCKS.filter((b) => b !== "RevisionDesScenarios");
    expect(() => parseNote("2026-S33-E1", source(fm, blocks))).toThrow(
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
    expect(() => parseNote("2026-S33-E1", source(fm, blocks))).toThrow(/interdit dans une spéciale/);
  });

  it("refuse un nom de bloc inconnu plutôt que de l'ignorer en silence", () => {
    const raw = source().replace("<CeQuiAChange>", "<CeQuiAChanger>");
    expect(() => parseNote("2026-S33", raw)).toThrow(/bloc inconnu « <CeQuiAChanger> »/);
  });

  it("refuse un bloc présent deux fois", () => {
    const blocks = [...HEBDO_BLOCKS, "CeQuiAChange" as BlockName];
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(/présent deux fois/);
  });

  it("impose l'ordre canonique — « ce que j'avais mal lu » ne peut pas passer en tête", () => {
    const blocks: BlockName[] = [
      "CeQueJavaisMalLu",
      "CeQuiAChange",
      "CeQuiSestConfirme",
      "RevisionDesScenarios",
      "CeQueJeSurveille",
    ];
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(/ordre des blocs non canonique/);
  });
});

describe("LeFilDeLaSemaine — facultatif, hebdo uniquement, toujours en dernier", () => {
  it("accepte une hebdo qui l'ajoute après les cinq blocs obligatoires", () => {
    const blocks: BlockName[] = [...HEBDO_BLOCKS, "LeFilDeLaSemaine"];
    expect(() => parseNote("2026-S33", source({}, blocks))).not.toThrow();
  });

  it("accepte une hebdo qui l'ajoute après RecapDesSpeciales", () => {
    const blocks: BlockName[] = [...HEBDO_BLOCKS, "RecapDesSpeciales", "LeFilDeLaSemaine"];
    expect(() => parseNote("2026-S33", source({}, blocks))).not.toThrow();
  });

  it("refuse une hebdo qui le place avant les blocs obligatoires", () => {
    const blocks: BlockName[] = ["LeFilDeLaSemaine", ...HEBDO_BLOCKS];
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(/ordre des blocs non canonique/);
  });

  it("refuse une hebdo qui le place entre RecapDesSpeciales et le reste", () => {
    const blocks: BlockName[] = [
      ...HEBDO_BLOCKS.slice(0, 3),
      "LeFilDeLaSemaine",
      ...HEBDO_BLOCKS.slice(3),
      "RecapDesSpeciales",
    ];
    expect(() => parseNote("2026-S33", source({}, blocks))).toThrow(/ordre des blocs non canonique/);
  });

  it("reste facultatif — une hebdo sans lui reste valide", () => {
    expect(() => parseNote("2026-S33", source({}, HEBDO_BLOCKS))).not.toThrow();
  });

  it("est interdit dans une spéciale — sa structure allégée doit rester distincte", () => {
    const fm = { kind: "speciale", trigger: "Brent ±8 %" };
    const blocks: BlockName[] = [...SPECIALE_BLOCKS, "LeFilDeLaSemaine"];
    expect(() => parseNote("2026-S33-E1", source(fm, blocks))).toThrow(/interdit dans une spéciale/);
  });
});

describe("sources par bloc", () => {
  const withSources = (yaml: string, blocks?: BlockName[]) =>
    source({ sources: yaml }, blocks);

  it("accepte des sources rattachées à un bloc présent", () => {
    const yaml = [
      "sources:",
      "  CeQuiAChange:",
      "    - label: Bureau of Labor Statistics",
      "      url: 'https://www.bls.gov/'",
    ].join("\n");
    expect(() => parseNote("2026-S33", withSources(yaml))).not.toThrow();
  });

  it("refuse un nom de bloc inconnu plutôt que de perdre la source en silence", () => {
    const yaml = [
      "sources:",
      "  CeQuiAChanger:",
      "    - label: BLS",
      "      url: 'https://www.bls.gov/'",
    ].join("\n");
    expect(() => parseNote("2026-S33", withSources(yaml))).toThrow(
      /sources : bloc inconnu « CeQuiAChanger »/,
    );
  });

  it("refuse une source rattachée à un bloc que la note ne porte pas", () => {
    // `RecapDesSpeciales` est un bloc valide, mais absent de cette note : sa source ne
    // s'afficherait nulle part.
    const yaml = [
      "sources:",
      "  RecapDesSpeciales:",
      "    - label: BLS",
      "      url: 'https://www.bls.gov/'",
    ].join("\n");
    expect(() => parseNote("2026-S33", withSources(yaml))).toThrow(
      /le bloc « RecapDesSpeciales » n'existe pas dans cette note/,
    );
  });

  it("refuse un bloc déclaré sans aucune source", () => {
    const yaml = ["sources:", "  CeQuiAChange: []"].join("\n");
    expect(() => parseNote("2026-S33", withSources(yaml))).toThrow(/frontmatter invalide/);
  });

  it("refuse une URL qui n'en est pas une", () => {
    const yaml = [
      "sources:",
      "  CeQuiAChange:",
      "    - label: BLS",
      "      url: 'pas-une-url'",
    ].join("\n");
    expect(() => parseNote("2026-S33", withSources(yaml))).toThrow(/frontmatter invalide/);
  });
});

describe("frontmatter", () => {
  it("refuse un type incohérent avec la forme du slug", () => {
    expect(() => parseNote("2026-S33-E1", source({ kind: "hebdo" }))).toThrow(
      /le frontmatter déclare « hebdo » mais la forme du slug implique « speciale »/,
    );
  });

  it("exige le seuil franchi sur une spéciale", () => {
    const raw = source({ kind: "speciale" }, SPECIALE_BLOCKS);
    expect(() => parseNote("2026-S33-E1", raw)).toThrow(/doit déclarer le seuil franchi/);
  });

  it("refuse un seuil sur une hebdo, qui paraît qu'il se passe quelque chose ou non", () => {
    expect(() => parseNote("2026-S33", source({ trigger: "Brent ±8 %" }))).toThrow(
      /ne doit pas déclarer de « trigger »/,
    );
  });

  it("refuse un frontmatter incomplet", () => {
    const raw = source().replace(/regimeStatement:.*\n/, "");
    expect(() => parseNote("2026-S33", raw)).toThrow(/frontmatter invalide/);
  });
});

// ---------------------------------------------------------------------------

describe("règles inter-fichiers", () => {
  const hebdo = (slug: string, date: string, comparesTo: string | null, blocks = HEBDO_BLOCKS) =>
    parseNote(slug, source({ date, comparesTo }, blocks));
  const speciale = (slug: string, date: string, comparesTo: string | null) =>
    parseNote(slug, source({ kind: "speciale", date, comparesTo, trigger: "Brent ±8 %" }, SPECIALE_BLOCKS));

  it("accepte une chaîne conforme", () => {
    const corpus: ParsedNote[] = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S27", [...HEBDO_BLOCKS, "RecapDesSpeciales"]),
    ];
    expect(() => validateNoteChain(corpus)).not.toThrow();
  });

  it("refuse une hebdo qui se compare à une spéciale — sinon le fil hebdomadaire se rompt", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S28-E1", [...HEBDO_BLOCKS, "RecapDesSpeciales"]),
    ];
    expect(() => validateNoteChain(corpus)).toThrow(
      /une hebdo se compare à la hebdo précédente \(2026-S27\)/,
    );
  });

  it("exige qu'une spéciale se compare à la dernière note parue, quelle qu'elle soit", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      // E2 devrait se comparer à E1, pas à la hebdo.
      speciale("2026-S28-E2", "2026-07-10", "2026-S27"),
    ];
    expect(() => validateNoteChain(corpus)).toThrow(
      /une spéciale se compare à la dernière note parue \(2026-S28-E1\)/,
    );
  });

  it("exige le récapitulatif quand la semaine a porté des spéciales", () => {
    const corpus = [
      hebdo("2026-S27", "2026-07-05", null),
      speciale("2026-S28-E1", "2026-07-09", "2026-S27"),
      hebdo("2026-S28", "2026-07-12", "2026-S27"), // sans RecapDesSpeciales
    ];
    expect(() => validateNoteChain(corpus)).toThrow(
      /la semaine 2026-S28 porte 1 spéciale\(s\) : le bloc « <RecapDesSpeciales> » est obligatoire/,
    );
  });

  it("refuse un récapitulatif quand aucune spéciale n'a paru cette semaine-là", () => {
    const corpus = [hebdo("2026-S27", "2026-07-05", null, [...HEBDO_BLOCKS, "RecapDesSpeciales"])];
    expect(() => validateNoteChain(corpus)).toThrow(/n'a rien à consolider/);
  });

});

// ---------------------------------------------------------------------------

describe("le corpus réel", () => {
  const corpus = () =>
    readNoteSources().map(({ slug, source: raw }) => parseNote(slug, raw));

  it("compile : toutes les notes passent les règles, dans l'ordre chronologique", () => {
    const meta = validateNoteChain(corpus());
    expect(meta.map((e) => e.slug)).toEqual([
      "2026-S24",
      "2026-S26-E1",
      "2026-S26-E2",
      "2026-S26",
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

  it("garde ses trous de semaine — une discipline rompue doit rester visible", () => {
    const weeks = new Set(corpus().map((p) => p.meta.isoWeek));
    expect(weeks.has("2026-S25")).toBe(false);
    expect(weeks.has("2026-S30")).toBe(false);
  });

  it("porte deux semaines à double spéciale", () => {
    const parsed = corpus();
    const specialsOf = (week: string) =>
      parsed.filter((p) => p.meta.kind === "speciale" && p.meta.parentWeek === week);
    expect(specialsOf("2026-S26")).toHaveLength(2);
    expect(specialsOf("2026-S32")).toHaveLength(2);
  });

  it("les notes rétrospectives couvrent les trois drivers et au moins deux tendances", () => {
    const retro = corpus().filter((p) =>
      ["2026-S24", "2026-S26-E1", "2026-S26-E2", "2026-S26"].includes(p.meta.slug),
    );
    expect(retro).toHaveLength(4);

    const drivers = new Set(retro.flatMap((p) => p.meta.driverOrder));
    expect([...drivers].sort()).toEqual(["ai", "iran", "rates"]);

    const trends = new Set(retro.flatMap((p) => p.meta.trendRefs));
    expect(trends.size).toBeGreaterThanOrEqual(2);
  });
});
