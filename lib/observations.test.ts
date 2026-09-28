import { beforeEach, describe, expect, it, vi } from "vitest";

// Le client Supabase est remplacé série par série : c'est le seul point d'entrée de la base,
// donc le seul à simuler pour éprouver le repli.
const getReadClient = vi.fn();
vi.mock("./supabase", () => ({ getReadClient: () => getReadClient() }));

const { loadObservations, loadMacroObservations, isMacroCovered, isInstrumentCovered } =
  await import("./observations");
const { getObservations, getMacroObservations, getMacroIndicators, getInstruments } =
  await import("./data");

/** Un client dont la requête se termine comme demandé — une requête par identifiant. */
function clientReturning(rows: unknown[] | null, error: { message: string } | null = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error }),
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

/**
 * Un client dont la réponse dépend de l'identifiant demandé (`.eq(idColumn, id)`) — pour
 * éprouver que chaque série est bien requêtée séparément plutôt que mêlée aux autres.
 */
function clientPerId(rowsById: Record<string, unknown[]>) {
  return {
    from: () => {
      let requestedId: string | undefined;
      const chain = {
        select: () => chain,
        eq: (_column: string, id: string) => {
          requestedId = id;
          return chain;
        },
        order: () => chain,
        limit: () => Promise.resolve({ data: rowsById[requestedId!] ?? [], error: null }),
      };
      return chain;
    },
  };
}

beforeEach(() => {
  getReadClient.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("instruments non couverts par aucune source active", () => {
  it("lisent le seed sans jamais toucher la base", async () => {
    getReadClient.mockReturnValue(clientReturning([]));
    // Choisi à l'exécution plutôt que nommé en dur : la première version de ce test citait
    // 'dxy', qu'Alpha Vantage a depuis pris en charge, et il échouait pour la seule raison
    // qu'une source de plus avait été branchée. Ce qui doit être vérifié, c'est la règle.
    const nonCouvert = getInstruments().find((i) => !isInstrumentCovered(i.id));
    expect(nonCouvert, "plus aucun instrument au seed — la règle n'a plus de cas à couvrir")
      .toBeDefined();

    const result = await loadObservations([nonCouvert!.id]);
    expect(result.get(nonCouvert!.id)).toEqual(getObservations(nonCouvert!.id));
    expect(getReadClient).not.toHaveBeenCalled();
  });

  it("continuent de fonctionner quand la base n'est pas configurée du tout", async () => {
    getReadClient.mockReturnValue(null);
    const nonCouvert = getInstruments().find((i) => !isInstrumentCovered(i.id))!;
    const result = await loadObservations(["us10y", nonCouvert.id]);
    expect(result.get("us10y")).toEqual(getObservations("us10y"));
    expect(result.get(nonCouvert.id)).toEqual(getObservations(nonCouvert.id));
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

describe("instruments couverts par Twelve Data — pas seulement FRED", () => {
  it("l'or et MSCI ACWI sont bien tenus pour couverts", () => {
    // Bug réel du 13/09 : loadObservations ne vérifiait que FRED, donc ces deux instruments
    // retombaient sur le seed pour toujours — même une fois réellement collectés par Twelve
    // Data. Pour ACWI en particulier, le seed est resté à l'échelle d'avant le passage à l'ETF
    // (points d'indice, ~800) alors qu'`ytdBasis` avait déjà été mis à jour à l'échelle du prix
    // par part (~141), ce qui rendait le calcul YTD absurde.
    expect(isInstrumentCovered("acwi")).toBe(true);
    expect(isInstrumentCovered("gold")).toBe(true);
  });

  it("lisent la base quand elle répond", async () => {
    getReadClient.mockReturnValue(
      clientReturning([
        {
          instrument_id: "acwi",
          date: "2026-09-12",
          value: 145.2,
          source: "Twelve Data",
          fetched_at: "2026-09-13T04:10:00Z",
        },
      ]),
    );
    const result = await loadObservations(["acwi"]);
    expect(result.get("acwi")).toEqual([
      {
        instrumentId: "acwi",
        date: "2026-09-12",
        value: 145.2,
        source: "Twelve Data",
        fetchedAt: "2026-09-13T04:10:00Z",
      },
    ]);
  });

  it("retombent sur le seed quand la base est vide, comme pour FRED", async () => {
    getReadClient.mockReturnValue(clientReturning([]));
    const result = await loadObservations(["acwi"]);
    expect(result.get("acwi")).toEqual(getObservations("acwi"));
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

describe("indicateurs macro couverts par ONS et e-Stat — pas seulement FRED et Eurostat", () => {
  it("les indicateurs UK (ONS) et Japon (e-Stat) sont bien tenus pour couverts", () => {
    // Même bug que celui du 13/09 sur Twelve Data (voir plus haut), pour ONS et e-Stat cette
    // fois : `isMacroCovered` ne testait que FRED et Eurostat. uk-cpi, uk-cpi-core,
    // uk-unemployment, uk-wages, uk-gdp et jp-cpi, jp-cpi-core, jp-unemployment retombaient donc
    // silencieusement sur le seed — vide depuis l'activation de chaque source — au lieu de la
    // donnée réellement collectée chaque jour.
    expect(isMacroCovered("uk-cpi")).toBe(true);
    expect(isMacroCovered("uk-gdp")).toBe(true);
    expect(isMacroCovered("jp-cpi")).toBe(true);
    expect(isMacroCovered("jp-unemployment")).toBe(true);
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

describe("une série longue ne doit pas en tronquer une autre", () => {
  // Bug réel du 28/09 : une seule requête `.in(idColumn, ids)` partageait le plafond de lignes
  // de PostgREST entre tous les indicateurs demandés. Triée par date croissante, la troncature
  // faisait disparaître les points récents d'une série dès qu'une autre, plus volumineuse
  // (l'historique complet renvoyé par ONS à chaque passage), saturait le plafond avant elle —
  // l'inflation britannique s'affichait alors datée de 2004 alors que la base avait 2026.
  it("interroge chaque identifiant séparément, sans laisser l'un tronquer l'autre", async () => {
    getReadClient.mockReturnValue(
      clientPerId({
        "uk-cpi": [
          {
            indicator_id: "uk-cpi",
            date: "2026-04-01",
            value: 2.8,
            source: "ONS",
            fetched_at: "2026-09-28T04:45:33Z",
          },
          {
            indicator_id: "uk-cpi",
            date: "1989-05-01",
            value: 5.3,
            source: "ONS",
            fetched_at: "2026-09-28T04:45:33Z",
          },
        ],
        "uk-gdp": [
          {
            indicator_id: "uk-gdp",
            date: "2026-01-01",
            value: 0.5,
            source: "ONS",
            fetched_at: "2026-09-28T04:45:33Z",
          },
        ],
      }),
    );

    const result = await loadMacroObservations(["uk-cpi", "uk-gdp"]);
    const ukCpi = result.get("uk-cpi")!;
    // Le point le plus récent doit survivre, et l'ordre reste chronologique croissant pour les
    // consommateurs existants (sparkline, calcul de variation).
    expect(ukCpi.at(-1)).toEqual({
      instrumentId: "uk-cpi",
      date: "2026-04-01",
      value: 2.8,
      source: "ONS",
      fetchedAt: "2026-09-28T04:45:33Z",
    });
    expect(ukCpi[0].date).toBe("1989-05-01");
    expect(result.get("uk-gdp")!.at(-1)?.date).toBe("2026-01-01");
  });

  it("un identifiant en erreur retombe seul sur le seed, sans emporter les autres", async () => {
    getReadClient.mockReturnValue({
      from: () => {
        let requestedId: string | undefined;
        const chain = {
          select: () => chain,
          eq: (_column: string, id: string) => {
            requestedId = id;
            return chain;
          },
          order: () => chain,
          limit: () =>
            requestedId === "brent"
              ? Promise.resolve({ data: null, error: { message: "relation absente" } })
              : Promise.resolve({
                  data: [
                    {
                      instrument_id: "us10y",
                      date: "2026-08-14",
                      value: 4.61,
                      source: "FRED",
                      fetched_at: "2026-08-15T06:00:00Z",
                    },
                  ],
                  error: null,
                }),
        };
        return chain;
      },
    });
    const result = await loadObservations(["us10y", "brent"]);
    // us10y est servi par la base ; brent, dont la requête échoue, retombe sur le seed sans que
    // la panne de l'un n'efface la donnée bien reçue de l'autre.
    expect(result.get("us10y")!.every((o) => o.source === "FRED")).toBe(true);
    expect(result.get("brent")).toEqual(getObservations("brent"));
  });
});
