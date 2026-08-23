import { describe, expect, it } from "vitest";
import { buildTimeSeriesUrl, parseTwelveDataSeries } from "./twelve-data";
import type { TwelveDataMapping } from "@/config/twelve-data-series";

const gold: TwelveDataMapping = {
  target: { kind: "instrument", id: "gold" },
  symbol: "XAU/USD",
  cadence: "business-daily",
  plausible: { min: 200, max: 20_000 },
  expect: { currency: "USD" },
  enabled: true,
};

describe("buildTimeSeriesUrl", () => {
  it("porte le symbole, l'ordre chronologique et la clé — jamais interprétés côté client", () => {
    const url = buildTimeSeriesUrl(gold, "clé-de-test", new Date("2026-08-23T00:00:00Z"));
    expect(url).toContain("symbol=XAU%2FUSD");
    expect(url).toContain("interval=1day");
    expect(url).toContain("order=ASC");
    expect(url).toContain("apikey=cl%C3%A9-de-test");
  });
});

describe("parseTwelveDataSeries — lecture normale", () => {
  it("rend les points datés dans l'ordre reçu", () => {
    const r = parseTwelveDataSeries(gold, {
      values: [
        { datetime: "2026-08-20", close: "4600.5" },
        { datetime: "2026-08-21", close: "4608.27" },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([
      { date: "2026-08-20", value: 4600.5 },
      { date: "2026-08-21", value: 4608.27 },
    ]);
  });

  it("traite une réponse sans aucune valeur comme un succès vide", () => {
    const r = parseTwelveDataSeries(gold, { values: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });
});

describe("parseTwelveDataSeries — le refus explicite de Twelve Data", () => {
  it("relaie le message d'erreur plutôt que de le traiter comme une réponse malformée", () => {
    // La forme réelle observée en sondant l'API : symbole verrouillé au palier payant.
    const r = parseTwelveDataSeries(gold, {
      code: 404,
      status: "error",
      message: "This symbol is available starting with the Grow or Venture plan.",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Grow or Venture/);
  });
});

describe("parseTwelveDataSeries — bornes de plausibilité", () => {
  it("rejette toute la série si une valeur sort des bornes, pas seulement le point fautif", () => {
    const r = parseTwelveDataSeries(gold, {
      values: [
        { datetime: "2026-08-20", close: "4600.5" },
        { datetime: "2026-08-21", close: "0.05" },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/hors bornes le 2026-08-21/);
    expect(r.error).toMatch(/série non écrite/);
  });
});

describe("parseTwelveDataSeries — réponses inexploitables", () => {
  it("rejette une charge utile qui n'a ni values ni message d'erreur", () => {
    const r = parseTwelveDataSeries(gold, { observations: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/réponse malformée/);
  });
});
