import { beforeEach, describe, expect, it, vi } from "vitest";

// Le client Supabase est remplacé série par série : c'est le seul point d'entrée de la base,
// donc le seul à simuler pour éprouver le repli.
const getReadClient = vi.fn();
vi.mock("./supabase", () => ({ getReadClient: () => getReadClient() }));

const { loadObservations, loadMacroObservations, isMacroCovered } = await import("./observations");
const { getObservations, getMacroObservations, getMacroIndicators } = await import("./data");

/** Un client dont la requête se termine comme demandé. */
function clientReturning(rows: unknown[] | null, error: { message: string } | null = null) {
  const chain = {
    select: () => chain,
    in: () => chain,
    order: () => Promise.resolve({ data: rows, error }),
  };
  return { from: () => chain };
}

function clientThrowing(message: string) {
  return {
    from: () => {
      throw new Error(message);
    },
  };
}

beforeEach(() => {
  getReadClient.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("instruments non couverts par FRED", () => {
  it("lisent le seed sans jamais toucher la base", async () => {
    getReadClient.mockReturnValue(clientReturning([]));
    // 'brent' n'est dans aucun mapping : c'est une matière première, FRED ne la sert pas ici.
    const result = await loadObservations(["brent"]);
    expect(result.get("brent")).toEqual(getObservations("brent"));
    expect(getReadClient).not.toHaveBeenCalled();
  });

  it("continuent de fonctionner quand la base n'est pas configurée du tout", async () => {
    getReadClient.mockReturnValue(null);
    const result = await loadObservations(["us10y", "brent"]);
    expect(result.get("us10y")).toEqual(getObservations("us10y"));
    expect(result.get("brent")).toEqual(getObservations("brent"));
  });
});

describe("instruments couverts par FRED", () => {
  it("lisent la base quand elle répond", async () => {
    getReadClient.mockReturnValue(
      clientReturning([
        {
          instrument_id: "us10y",
          date: "2026-08-14",
          value: 4.61,
          source: "FRED",
          fetched_at: "2026-08-15T06:00:00Z",
        },
      ]),
    );
    const result = await loadObservations(["us10y"]);
    expect(result.get("us10y")).toEqual([
      {
        instrumentId: "us10y",
        date: "2026-08-14",
        value: 4.61,
        source: "FRED",
        fetchedAt: "2026-08-15T06:00:00Z",
      },
    ]);
  });

  it("retombent sur le seed quand la base est vide — le cron n'est pas encore passé", async () => {
    getReadClient.mockReturnValue(clientReturning([]));
    const result = await loadObservations(["us10y"]);
    expect(result.get("us10y")).toEqual(getObservations("us10y"));
    expect(result.get("us10y")!.length).toBeGreaterThan(0);
  });

  it("retombent sur le seed quand la requête échoue", async () => {
    getReadClient.mockReturnValue(clientReturning(null, { message: "relation absente" }));
    const result = await loadObservations(["us10y"]);
    expect(result.get("us10y")).toEqual(getObservations("us10y"));
  });

  it("retombent sur le seed quand la base est injoignable, sans lever", async () => {
    getReadClient.mockReturnValue(clientThrowing("ECONNREFUSED"));
    const result = await loadObservations(["us10y"]);
    expect(result.get("us10y")).toEqual(getObservations("us10y"));
  });

  it("ne fusionnent jamais les deux sources pour un même instrument", async () => {
    getReadClient.mockReturnValue(
      clientReturning([
        {
          instrument_id: "us10y",
          date: "2026-08-14",
          value: 4.61,
          source: "FRED",
          fetched_at: "2026-08-15T06:00:00Z",
        },
      ]),
    );
    const result = await loadObservations(["us10y"]);
    // Une seule ligne : rien du seed ne vient s'ajouter derrière.
    expect(result.get("us10y")).toHaveLength(1);
    expect(result.get("us10y")!.every((o) => o.source === "FRED")).toBe(true);
  });
});

describe("le repli ne fabrique jamais de valeur", () => {
  it("ne renvoie ni zéro ni valeur nulle en cas de panne", async () => {
    getReadClient.mockReturnValue(clientThrowing("panne"));
    const result = await loadObservations(["us10y", "us6m", "brent"]);
    for (const [, obs] of result) {
      expect(obs.length).toBeGreaterThan(0);
      for (const o of obs) {
        expect(Number.isFinite(o.value)).toBe(true);
        expect(o.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(o.source).not.toBe("");
      }
    }
  });

  it("renvoie une liste vide, jamais undefined, pour un identifiant inconnu", async () => {
    getReadClient.mockReturnValue(null);
    const result = await loadObservations(["instrument-qui-nexiste-pas"]);
    expect(result.get("instrument-qui-nexiste-pas")).toEqual([]);
  });
});

describe("observations macro", () => {
  it("suivent la même règle de repli", async () => {
    getReadClient.mockReturnValue(clientThrowing("panne"));
    const result = await loadMacroObservations(["us-cpi"]);
    expect(result.get("us-cpi")).toEqual(getMacroObservations("us-cpi"));
  });

  it("laissent au seed les indicateurs qu'aucune série active ne couvre", async () => {
    getReadClient.mockReturnValue(clientReturning([]));
    // L'indicateur est choisi à l'exécution plutôt que nommé en dur : la première version de ce
    // test citait `ez-cpi`, qu'Eurostat a depuis pris en charge, et il échouait pour la seule
    // raison qu'une source de plus avait été branchée. Ce qui doit être vérifié, c'est la règle,
    // pas l'exemple.
    const nonCouvert = getMacroIndicators().find((i) => !isMacroCovered(i.id));
    expect(nonCouvert, "plus aucun indicateur au seed — la règle n'a plus de cas à couvrir")
      .toBeDefined();

    const result = await loadMacroObservations([nonCouvert!.id]);
    expect(result.get(nonCouvert!.id)).toEqual(getMacroObservations(nonCouvert!.id));
    expect(getReadClient).not.toHaveBeenCalled();
  });
});
