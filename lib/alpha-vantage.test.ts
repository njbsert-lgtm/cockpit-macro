import { describe, expect, it } from "vitest";
import { buildDailySeriesUrl, parseAlphaVantageSeries } from "./alpha-vantage";
import type { AlphaVantageMapping } from "@/config/alpha-vantage-series";

const sx5e: AlphaVantageMapping = {
  target: { kind: "instrument", id: "sx5e" },
  symbol: "C50.PAR",
  cadence: "business-daily",
  plausible: { min: 10, max: 300 },
  enabled: true,
};

describe("buildDailySeriesUrl", () => {
  it("porte la fonction quotidienne, le symbole, la sortie compacte et la clé", () => {
    const url = buildDailySeriesUrl(sx5e, "clé-de-test");
    expect(url).toContain("function=TIME_SERIES_DAILY");
    expect(url).toContain("symbol=C50.PAR");
    expect(url).toContain("outputsize=compact");
    expect(url).toContain("apikey=cl%C3%A9-de-test");
  });
});

describe("parseAlphaVantageSeries — lecture normale", () => {
  it("rend les points triés par date, quel que soit l'ordre reçu", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      "Meta Data": { "2. Symbol": "C50.PAR" },
      "Time Series (Daily)": {
        "2026-09-25": { "1. open": "169.34", "4. close": "169.60" },
        "2026-09-24": { "1. open": "168.90", "4. close": "169.34" },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([
      { date: "2026-09-24", value: 169.34 },
      { date: "2026-09-25", value: 169.6 },
    ]);
  });

  it("découvre la clé de série sans supposer son nom exact", () => {
    // Alpha Vantage nomme la clé englobante d'après la fonction appelée — jamais confirmée
    // fixe depuis cet environnement, d'où la détection plutôt qu'une clé en dur.
    const r = parseAlphaVantageSeries(sx5e, {
      "Weekly Adjusted Time Series": { "2026-09-25": { "4. close": "169.60" } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-09-25", value: 169.6 }]);
  });
});

describe("parseAlphaVantageSeries — le refus explicite d'Alpha Vantage", () => {
  it("relaie le message d'erreur pour un symbole inconnu", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      "Error Message": "Invalid API call. Please retry or visit the documentation.",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Invalid API call/);
  });

  it("relaie le message quand le plafond d'appels est dépassé (clé Note)", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      Note: "Thank you for using Alpha Vantage! Our standard API call frequency is 25 requests per day.",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/25 requests per day/);
  });

  it("relaie le message quand la clé est Information plutôt que Note", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      Information: "Thank you for using Alpha Vantage! This is a premium endpoint.",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/premium endpoint/);
  });
});

describe("parseAlphaVantageSeries — bornes de plausibilité", () => {
  it("rejette toute la série si une valeur sort des bornes, pas seulement le point fautif", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      "Time Series (Daily)": {
        "2026-09-24": { "4. close": "169.34" },
        "2026-09-25": { "4. close": "0.05" },
      },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/hors bornes le 2026-09-25/);
    expect(r.error).toMatch(/série non écrite/);
  });
});

describe("parseAlphaVantageSeries — réponses inexploitables", () => {
  it("rejette une charge utile sans clé « Time Series » ni message d'erreur reconnu", () => {
    const r = parseAlphaVantageSeries(sx5e, { "Meta Data": { "2. Symbol": "C50.PAR" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/réponse malformée/);
  });

  it("écarte une clé de date malformée sans faire échouer toute la série", () => {
    const r = parseAlphaVantageSeries(sx5e, {
      "Time Series (Daily)": {
        "Meta": { note: "pas une date" },
        "2026-09-25": { "4. close": "169.60" },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-09-25", value: 169.6 }]);
  });
});
