import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkIntegrity, type ContentGraph } from "./integrity";
import { parseNote, readNoteSources } from "./notes";
import { DRIVERS } from "@/content/drivers";
import { TRENDS } from "@/content/tendances";
import { SCENARIO_VERSIONS } from "@/content/scenarios";
import { OUTLOOKS } from "@/content/outlooks";
import { getInstruments } from "./data";
import { deriveDrivers, activeDrivers } from "./drivers";
import type {
  DriverInput,
  Note,
  Outlook,
  ScenarioVersion,
  Trend,
} from "./types";

// --- fabrique de graphes synthétiques ---------------------------------------
// Un graphe minimal mais valide, qu'on casse arête par arête. Chaque test ne modifie qu'une
// seule chose : c'est ce qui permet d'affirmer que c'est bien cette arête qui lève.

function driver(over: Partial<DriverInput> = {}): DriverInput {
  return {
    id: "rates",
    label: "Taux directeurs",
    question: "La Fed reprend-elle son cycle de hausse ?",
    instrumentRefs: ["us10y"],
    trendRefs: ["desinflation"],
    zones: ["us"],
    retiredAt: null,
    ...over,
  };
}

function note(over: Partial<Note> = {}): Note {
  return {
    slug: "2026-S27",
    kind: "hebdo",
    date: "2026-07-05",
    isoWeek: "2026-S27",
    parentWeek: null,
    comparesTo: null,
    trigger: null,
    regimeStatement: "Un régime.",
    keyIndicators: [{ label: "Régime", value: "Choc d'offre" }],
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
    ...over,
  };
}

function trend(over: Partial<Trend> = {}): Trend {
  return {
    id: "desinflation",
    title: "La désinflation est terminée",
    thesis: "…",
    zones: ["us"],
    assetClasses: ["rates"],
    status: "renforce",
    statusHistory: [
      { date: "2026-07-05", status: "renforce", noteSlug: "2026-S27", why: "Parce que." },
    ],
    driverRefs: ["rates"],
    invalidatedBy: "…",
    ...over,
  };
}

/** Les trois branches d'un driver, dont exactement une centrale. */
function branches(driverId = "rates", over: Partial<ScenarioVersion>[] = []): ScenarioVersion[] {
  const base = (branchId: string, likelihood: ScenarioVersion["likelihood"]): ScenarioVersion => ({
    driverId,
    branchId,
    version: 1,
    date: "2026-07-05",
    noteSlug: "2026-S27",
    likelihood,
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
  });
  const list = [
    base(`${driverId}-a`, "central"),
    base(`${driverId}-b`, "moderee"),
    base(`${driverId}-c`, "faible"),
  ];
  return list.map((v, i) => ({ ...v, ...(over[i] ?? {}) }));
}

function outlook(over: Partial<Outlook> = {}): Outlook {
  return {
    id: "jpmorgan-mid-2026",
    bank: "J.P. Morgan",
    bankMonogram: "JPM",
    title: "Mid-Year Outlook 2026",
    periodCovered: "Mid-year 2026",
    publishedAt: "2026-07-01",
    summary: "…",
    highlights: ["…"],
    driverRefs: [],
    trendRefs: [],
    sourceUrl: "https://example.org/outlook.pdf",
    ...over,
  };
}

function graph(over: Partial<ContentGraph> = {}): ContentGraph {
  return {
    drivers: [driver()],
    trends: [trend()],
    notes: [note()],
    scenarios: branches(),
    outlooks: [],
    instrumentIds: new Set(["us10y"]),
    ...over,
  };
}

// ---------------------------------------------------------------------------

describe("graphe conforme", () => {
  it("passe sans lever", () => {
    expect(() => checkIntegrity(graph())).not.toThrow();
  });
});

describe("références mortes — driver", () => {
  it("refuse un instrument inexistant", () => {
    const g = graph({ drivers: [driver({ instrumentRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/instrument inconnu « fantome »/);
  });

  it("refuse une tendance inexistante", () => {
    const g = graph({ drivers: [driver({ trendRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/tendance inconnue « fantome »/);
  });

  it("refuse un driver qui n'a pas exactement trois branches", () => {
    const g = graph({ scenarios: branches().slice(0, 2) });
    expect(() => checkIntegrity(g)).toThrow(/2 branche\(s\).*3 attendues/);
  });

  it("refuse un driver sans branche centrale : la dominante serait indéterminée", () => {
    const g = graph({
      scenarios: branches("rates", [{ likelihood: "moderee" }]),
    });
    expect(() => checkIntegrity(g)).toThrow(/aucune branche n'est le scénario central/);
  });

  it("refuse deux branches centrales : la dominante serait ambiguë", () => {
    const g = graph({
      scenarios: branches("rates", [{}, { likelihood: "central" }]),
    });
    expect(() => checkIntegrity(g)).toThrow(/2 branches se déclarent scénario central/);
  });

  it("refuse un retiredAt qui n'est pas une date", () => {
    const g = graph({ drivers: [driver({ retiredAt: "bientôt" })] });
    expect(() => checkIntegrity(g)).toThrow(/retiredAt doit être null ou une date/);
  });
});

describe("références mortes — tendance", () => {
  it("refuse un driver inexistant dans driverRefs", () => {
    const g = graph({ trends: [trend({ driverRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/driver inconnu « fantome »/);
  });

  it("refuse une note inexistante dans l'historique de statut", () => {
    const g = graph({
      trends: [
        trend({
          statusHistory: [
            { date: "2026-07-05", status: "renforce", noteSlug: "2026-S99", why: "Parce que." },
          ],
        }),
      ],
    });
    expect(() => checkIntegrity(g)).toThrow(/l'historique de statut cite la note « 2026-S99 »/);
  });

  it("refuse un changement de statut sans justification", () => {
    const g = graph({
      trends: [
        trend({
          statusHistory: [
            { date: "2026-07-05", status: "renforce", noteSlug: "2026-S27", why: "  " },
          ],
        }),
      ],
    });
    expect(() => checkIntegrity(g)).toThrow(/sans justification/);
  });
});

describe("statut d'une tendance cohérent avec son historique", () => {
  it("refuse un statut affiché qui diverge de la dernière entrée de statusHistory", () => {
    const g = graph({
      trends: [
        trend({
          status: "renforce",
          statusHistory: [
            { date: "2026-07-05", status: "affaiblit", noteSlug: "2026-S27", why: "Parce que." },
          ],
        }),
      ],
    });
    expect(() => checkIntegrity(g)).toThrow(
      /statut affiché « renforce ».*déclare « affaiblit »/,
    );
  });

  it("accepte un statut qui égale la dernière entrée, même quand l'historique en compte plusieurs", () => {
    const g = graph({
      trends: [
        trend({
          status: "affaiblit",
          statusHistory: [
            { date: "2026-06-01", status: "renforce", noteSlug: "2026-S27", why: "D'abord." },
            { date: "2026-07-05", status: "affaiblit", noteSlug: "2026-S27", why: "Ensuite." },
          ],
        }),
      ],
    });
    expect(() => checkIntegrity(g)).not.toThrow();
  });

  it("tolère un historique vide — rien à comparer", () => {
    const g = graph({ trends: [trend({ statusHistory: [] })] });
    expect(() => checkIntegrity(g)).not.toThrow();
  });
});

describe("lien driver ↔ tendance : inclusion, pas symétrie", () => {
  it("refuse une tendance qui désigne un driver ne la listant pas en retour", () => {
    const g = graph({
      drivers: [driver({ trendRefs: [] })],
      trends: [trend({ driverRefs: ["rates"] })],
    });
    expect(() => checkIntegrity(g)).toThrow(/ce driver ne la liste pas dans ses trendRefs/);
  });

  it("accepte un driver qui alimente une tendance sans pouvoir l'invalider", () => {
    // C'est précisément l'asymétrie voulue : `Driver.trendRefs` couvre « alimente OU pourrait
    // invalider », `Trend.driverRefs` seulement « pourrait la faire tomber ».
    const g = graph({
      drivers: [driver({ trendRefs: ["desinflation"] })],
      trends: [trend({ driverRefs: [] })],
    });
    expect(() => checkIntegrity(g)).not.toThrow();
  });
});

describe("références mortes — note", () => {
  it("refuse une tendance inexistante dans trendRefs", () => {
    const g = graph({ notes: [note({ trendRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/tendance inconnue « fantome » dans trendRefs/);
  });

  it("refuse un instrument inexistant dans instrumentRefs", () => {
    const g = graph({ notes: [note({ instrumentRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/instrument inconnu « fantome » dans instrumentRefs/);
  });

  it("refuse un driver inexistant dans driverOrder", () => {
    const g = graph({ notes: [note({ driverOrder: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/driver inconnu « fantome » dans driverOrder/);
  });

  it("refuse un driver listé deux fois dans driverOrder", () => {
    const g = graph({ notes: [note({ driverOrder: ["rates", "rates"] })] });
    expect(() => checkIntegrity(g)).toThrow(/listé deux fois dans driverOrder/);
  });

  it("refuse que la dernière note oublie un driver actif — sa carte disparaîtrait", () => {
    const g = graph({
      drivers: [driver(), driver({ id: "iran", trendRefs: [] })],
      scenarios: [...branches("rates"), ...branches("iran")],
      notes: [note({ driverOrder: ["rates"] })],
    });
    expect(() => checkIntegrity(g)).toThrow(/driverOrder omet « iran »/);
  });

  it("tolère qu'une note ancienne soit partielle : un driver a pu naître après elle", () => {
    const g = graph({
      drivers: [driver(), driver({ id: "iran", trendRefs: [] })],
      scenarios: [...branches("rates"), ...branches("iran")],
      notes: [
        note({ slug: "2026-S27", date: "2026-07-05", driverOrder: ["rates"] }),
        note({ slug: "2026-S28", date: "2026-07-12", driverOrder: ["rates", "iran"] }),
      ],
    });
    expect(() => checkIntegrity(g)).not.toThrow();
  });

  it("n'exige pas d'un driver retiré qu'il figure dans la dernière note", () => {
    const g = graph({
      drivers: [driver(), driver({ id: "iran", trendRefs: [], retiredAt: "2026-06-01" })],
      scenarios: [...branches("rates"), ...branches("iran")],
      notes: [note({ driverOrder: ["rates"] })],
    });
    expect(() => checkIntegrity(g)).not.toThrow();
  });
});

describe("références mortes — scénarios", () => {
  it("refuse un driverId inexistant", () => {
    // Le driver « rates » garde ses trois branches : seule l'arête testée est cassée.
    const orphan = { ...branches("rates")[0], driverId: "fantome", branchId: "fantome-a" };
    const g = graph({ scenarios: [...branches(), orphan] });
    expect(() => checkIntegrity(g)).toThrow(/driver inconnu « fantome »/);
  });

  it("refuse une note inexistante", () => {
    const g = graph({ scenarios: branches("rates", [{ noteSlug: "2026-S99" }]) });
    expect(() => checkIntegrity(g)).toThrow(/note inconnue « 2026-S99 »/);
  });

  it("refuse une révision de vraisemblance sans justification", () => {
    const g = graph({
      scenarios: branches("rates", [{ likelihoodChangedFrom: "faible", why: "" }]),
    });
    expect(() => checkIntegrity(g)).toThrow(/sans justification/);
  });

  it("refuse des numéros de version non contigus — une révision perdue", () => {
    const g = graph({ scenarios: branches("rates", [{ version: 3 }]) });
    expect(() => checkIntegrity(g)).toThrow(/versions non contiguës/);
  });
});

describe("identifiants en double", () => {
  it("refuse deux drivers de même id", () => {
    const g = graph({ drivers: [driver(), driver()] });
    expect(() => checkIntegrity(g)).toThrow(/identifiant en double/);
  });
});

// ---------------------------------------------------------------------------

describe("dérivation des champs de Driver", () => {
  const notes = [
    note({ slug: "2026-S27", date: "2026-07-05", driverOrder: ["rates", "iran"] }),
    note({ slug: "2026-S28", date: "2026-07-12", driverOrder: ["iran", "rates"] }),
  ];
  const scenarios = [
    ...branches("rates"),
    ...branches("iran"),
    { ...branches("rates")[0], version: 2, date: "2026-07-12", noteSlug: "2026-S28" },
  ];

  it("prend l'ordre d'intensité de la dernière note, pas de la première", () => {
    const derived = deriveDrivers(
      [driver(), driver({ id: "iran", trendRefs: [] })],
      notes,
      scenarios,
    );
    expect(derived.map((d) => d.id).sort()).toEqual(["iran", "rates"]);
    expect(derived.find((d) => d.id === "iran")!.intensityRank).toBe(0);
    expect(derived.find((d) => d.id === "rates")!.intensityRank).toBe(1);
  });

  it("prend la branche centrale comme branche dominante", () => {
    const derived = deriveDrivers([driver()], notes, scenarios);
    expect(derived[0].dominantBranchId).toBe("rates-a");
  });

  it("prend la révision la plus récente comme dernière révision", () => {
    const derived = deriveDrivers([driver()], notes, scenarios);
    expect(derived[0].lastRevisedAt).toBe("2026-07-12");
    expect(derived[0].lastRevisedIn).toBe("2026-S28");
  });

  it("écarte des cartes un driver retiré, sans supprimer son objet", () => {
    const derived = deriveDrivers(
      [driver(), driver({ id: "iran", trendRefs: [], retiredAt: "2026-07-10" })],
      notes,
      scenarios,
    );
    expect(derived).toHaveLength(2);
    expect(activeDrivers(derived, "2026-07-12").map((d) => d.id)).toEqual(["rates"]);
  });
});

// ---------------------------------------------------------------------------

describe("la note de test à référence morte", () => {
  // `content/__fixtures__/2026-S33.mdx` est une hebdo entièrement valide, sauf que son
  // driverOrder cite un driver inexistant. Elle vit hors de `content/notes/` : déposée
  // dans le corpus, elle rendrait la branche définitivement non compilable, ce qui est
  // exactement ce qu'elle sert à démontrer. Ce test la joue contre le vrai graphe.
  const fixture = () => {
    const source = readFileSync(
      path.join(process.cwd(), "content", "__fixtures__", "2026-S33.mdx"),
      "utf8",
    );
    return parseNote("2026-S33", source);
  };

  it("passe la validation de fichier : le défaut n'est pas dans sa forme", () => {
    expect(() => fixture()).not.toThrow();
    expect(fixture().meta.driverOrder).toContain("geopolitique-europe");
  });

  it("fait échouer le contrôle d'intégrité en nommant le driver inexistant", () => {
    const notes = readNoteSources().map(({ slug, source }) => parseNote(slug, source));
    const graph: ContentGraph = {
      drivers: DRIVERS,
      trends: TRENDS,
      notes: [...notes.map((e) => e.meta), fixture().meta],
      scenarios: SCENARIO_VERSIONS,
      outlooks: OUTLOOKS,
      instrumentIds: new Set(getInstruments().map((i) => i.id)),
    };
    expect(() => checkIntegrity(graph)).toThrow(
      /2026-S33\.mdx — driver inconnu « geopolitique-europe » dans driverOrder/,
    );
  });

  it("le corpus réel, lui, passe le contrôle sans la fixture", () => {
    const notes = readNoteSources().map(({ slug, source }) => parseNote(slug, source));
    const graph: ContentGraph = {
      drivers: DRIVERS,
      trends: TRENDS,
      notes: notes.map((e) => e.meta),
      scenarios: SCENARIO_VERSIONS,
      outlooks: OUTLOOKS,
      instrumentIds: new Set(getInstruments().map((i) => i.id)),
    };
    expect(() => checkIntegrity(graph)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe("références mortes — outlook", () => {
  it("refuse un identifiant en double", () => {
    const g = graph({ outlooks: [outlook(), outlook()] });
    expect(() => checkIntegrity(g)).toThrow(/identifiant en double : « jpmorgan-mid-2026 »/);
  });

  it("refuse un driver inexistant dans driverRefs", () => {
    const g = graph({ outlooks: [outlook({ driverRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/driver inconnu « fantome » dans driverRefs/);
  });

  it("refuse une tendance inexistante dans trendRefs", () => {
    const g = graph({ outlooks: [outlook({ trendRefs: ["fantome"] })] });
    expect(() => checkIntegrity(g)).toThrow(/tendance inconnue « fantome » dans trendRefs/);
  });

  it("refuse une date de publication mal formée", () => {
    const g = graph({ outlooks: [outlook({ publishedAt: "juillet 2026" })] });
    expect(() => checkIntegrity(g)).toThrow(/publishedAt doit être une date AAAA-MM-JJ/);
  });

  it("accepte un outlook qui cite un driver et une tendance réels", () => {
    const g = graph({ outlooks: [outlook({ driverRefs: ["rates"], trendRefs: ["desinflation"] })] });
    expect(() => checkIntegrity(g)).not.toThrow();
  });
});
