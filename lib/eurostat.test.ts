import { describe, expect, it } from "vitest";
import { buildEurostatUrl, parseEurostatResponse, periodToDate } from "./eurostat";
import type { EurostatMapping } from "@/config/eurostat-series";

const hicp: EurostatMapping = {
  target: { kind: "macro", id: "ez-cpi" },
  dataset: "prc_hicp_manr",
  dimensions: { freq: "M", unit: "RCH_A", coicop: "CP00", geo: "EA" },
  cadence: "monthly",
  zone: "ez",
  plausible: { min: -5, max: 25 },
  expect: {},
  enabled: true,
};

/** Une réponse JSON-stat réduite à ce que le client lit vraiment. */
function payload(over: Record<string, unknown> = {}) {
  return {
    value: { "0": 2.1, "1": 2.4, "2": 2.3 },
    id: ["freq", "unit", "coicop", "geo", "time"],
    size: [1, 1, 1, 1, 3],
    dimension: {
      time: { category: { index: { "2026-05": 0, "2026-06": 1, "2026-07": 2 } } },
      unit: { category: { label: { RCH_A: "Annual rate of change" } } },
    },
    ...over,
  };
}

describe("periodToDate", () => {
  it("date une période mensuelle au premier du mois", () => {
    expect(periodToDate("2026-07")).toBe("2026-07-01");
  });

  it("date un trimestre au premier jour du trimestre", () => {
    expect(periodToDate("2026-Q1")).toBe("2026-01-01");
    expect(periodToDate("2026-Q2")).toBe("2026-04-01");
    expect(periodToDate("2026-Q4")).toBe("2026-10-01");
  });

  it("date une année au 1er janvier", () => {
    expect(periodToDate("2026")).toBe("2026-01-01");
  });

  it("rend null sur une période inconnue plutôt que d'inventer une date", () => {
    expect(periodToDate("2026-W12")).toBeNull();
    expect(periodToDate("n'importe quoi")).toBeNull();
  });
});

describe("buildEurostatUrl", () => {
  it("sérialise toutes les dimensions de la configuration, sans en interpréter aucune", () => {
    const url = buildEurostatUrl(hicp);
    expect(url).toContain("/prc_hicp_manr?");
    expect(url).toContain("freq=M");
    expect(url).toContain("unit=RCH_A");
    expect(url).toContain("coicop=CP00");
    expect(url).toContain("geo=EA");
    expect(url).toContain("lastTimePeriod=60");
  });
});

describe("parseEurostatResponse — lecture normale", () => {
  it("rend les points datés, triés du plus ancien au plus récent", () => {
    const r = parseEurostatResponse(hicp, payload());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([
      { date: "2026-05-01", value: 2.1 },
      { date: "2026-06-01", value: 2.4 },
      { date: "2026-07-01", value: 2.3 },
    ]);
    expect(r.unitLabel).toBe("Annual rate of change");
  });

  it("écarte une observation absente sans la remplacer par zéro", () => {
    // La clé « 1 » manque : juin n'est pas publié.
    const r = parseEurostatResponse(hicp, payload({ value: { "0": 2.1, "2": 2.3 } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points.map((p) => p.date)).toEqual(["2026-05-01", "2026-07-01"]);
  });

  it("écarte une observation explicitement nulle", () => {
    const r = parseEurostatResponse(hicp, payload({ value: { "0": 2.1, "1": null, "2": 2.3 } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toHaveLength(2);
  });

  it("traite une réponse sans aucune valeur comme un succès vide", () => {
    const r = parseEurostatResponse(hicp, payload({ value: {} }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });
});

describe("parseEurostatResponse — le piège des séries multidimensionnelles", () => {
  it("rejette toute la réponse quand une dimension est restée ouverte, en la nommant", () => {
    // `age` n'a pas été fixé : Eurostat sert plusieurs tranches d'âge, et prendre la première
    // valeur venue donnerait un chiffre plausible et faux.
    const r = parseEurostatResponse(
      hicp,
      payload({ id: ["freq", "unit", "age", "geo", "time"], size: [1, 1, 4, 1, 3] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/dimension non fixée : age \(4 valeurs\)/);
    expect(r.error).toMatch(/série non écrite/);
  });

  it("accepte une dimension à une seule valeur — c'est le cas normal", () => {
    const r = parseEurostatResponse(
      hicp,
      payload({ id: ["freq", "unit", "age", "geo", "time"], size: [1, 1, 1, 1, 3] }),
    );
    expect(r.ok).toBe(true);
  });

  it("distingue un code inconnu d'une dimension ouverte, et dit où chercher le bon", () => {
    // Taille 0 : le code demandé n'existe pas dans ce dataset — le contraire d'un mélange de
    // séries. Les confondre enverrait corriger au mauvais endroit.
    const r = parseEurostatResponse(hicp, payload({ size: [1, 1, 1, 0, 3] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/code inconnu de ce dataset : geo=EA/);
    expect(r.error).toMatch(/eurostat:explore -- prc_hicp_manr geo/);
    expect(r.error).not.toMatch(/dimension non fixée/);
  });
});

describe("parseEurostatResponse — bornes de plausibilité", () => {
  it("rejette toute la série si une valeur sort des bornes, pas seulement le point fautif", () => {
    // 118 ressemble à un indice de prix, pas à un taux d'inflation : `unit` est mal choisi.
    const r = parseEurostatResponse(hicp, payload({ value: { "0": 2.1, "1": 118.4, "2": 2.3 } }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/hors bornes en 2026-06/);
    expect(r.error).toMatch(/dimensions probablement mal choisies/);
  });
});

describe("parseEurostatResponse — réponses inexploitables", () => {
  it("rejette une charge utile qui n'est pas du JSON-stat", () => {
    const r = parseEurostatResponse(hicp, { observations: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/réponse malformée/);
  });

  it("rejette une réponse sans dimension temporelle", () => {
    const r = parseEurostatResponse(hicp, payload({ id: ["freq", "unit"], size: [1, 1] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/sans dimension « time »/);
  });
});
