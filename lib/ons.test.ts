import { describe, expect, it } from "vitest";
import { buildOnsUrl, parseOnsResponse, periodToDate } from "./ons";
import type { OnsMapping } from "@/config/ons-series";

const cpi: OnsMapping = {
  target: { kind: "macro", id: "uk-cpi" },
  timeseriesId: "D7G7",
  datasetId: "MM23",
  cadence: "monthly",
  zone: "uk",
  plausible: { min: -5, max: 25 },
  expect: {},
  enabled: true,
};

const gdp: OnsMapping = {
  target: { kind: "macro", id: "uk-gdp" },
  timeseriesId: "ABMI",
  datasetId: "QNA",
  cadence: "quarterly",
  zone: "uk",
  plausible: { min: -35, max: 35 },
  expect: {},
  enabled: true,
};

describe("periodToDate", () => {
  it("date une période mensuelle au premier du mois", () => {
    expect(periodToDate("2026 JUL")).toBe("2026-07-01");
    expect(periodToDate("2026 JAN")).toBe("2026-01-01");
    expect(periodToDate("2026 DEC")).toBe("2026-12-01");
  });

  it("date un trimestre au premier jour du trimestre", () => {
    expect(periodToDate("2026 Q1")).toBe("2026-01-01");
    expect(periodToDate("2026 Q3")).toBe("2026-07-01");
  });

  it("date une année au 1er janvier", () => {
    expect(periodToDate("2026")).toBe("2026-01-01");
  });

  it("rend null sur une période inconnue plutôt que d'inventer une date", () => {
    expect(periodToDate("2026 XXX")).toBeNull();
    expect(periodToDate("n'importe quoi")).toBeNull();
  });
});

describe("buildOnsUrl", () => {
  it("compose l'URL série + dataset, sans clé", () => {
    expect(buildOnsUrl(cpi)).toBe("https://api.ons.gov.uk/timeseries/D7G7/dataset/MM23/data");
  });
});

describe("parseOnsResponse — lecture normale", () => {
  it("lit le tableau mensuel pour une série mensuelle", () => {
    const payload = {
      months: [
        { date: "2026 MAY", value: "2.1" },
        { date: "2026 JUN", value: "2.4" },
        { date: "2026 JUL", value: "2.3" },
      ],
      description: { unit: "%" },
    };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([
      { date: "2026-05-01", value: 2.1 },
      { date: "2026-06-01", value: 2.4 },
      { date: "2026-07-01", value: 2.3 },
    ]);
    expect(r.unitLabel).toBe("%");
  });

  it("lit le tableau trimestriel pour une série trimestrielle, ignore les mensuelles présentes", () => {
    const payload = {
      months: [{ date: "2026 JUL", value: "999" }],
      quarters: [
        { date: "2026 Q1", value: "1.2" },
        { date: "2026 Q2", value: "1.5" },
      ],
    };
    const r = parseOnsResponse(gdp, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([
      { date: "2026-01-01", value: 1.2 },
      { date: "2026-04-01", value: 1.5 },
    ]);
  });

  it("trie les points du plus ancien au plus récent même si la source les renvoie dans le désordre", () => {
    const payload = { months: [{ date: "2026 JUL", value: "2.3" }, { date: "2026 MAY", value: "2.1" }] };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points.map((p) => p.date)).toEqual(["2026-05-01", "2026-07-01"]);
  });
});

describe("parseOnsResponse — valeurs manquantes ou provisoires", () => {
  it("écarte une valeur vide plutôt que de la remplacer par zéro", () => {
    const payload = {
      months: [
        { date: "2026 JUN", value: "2.4" },
        { date: "2026 JUL", value: "" },
      ],
    };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-06-01", value: 2.4 }]);
  });

  it("écarte une valeur non numérique", () => {
    const payload = { months: [{ date: "2026 JUL", value: "n/a" }] };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });

  it("écarte une période illisible sans faire échouer toute la réponse", () => {
    const payload = { months: [{ date: "n'importe quoi", value: "2.4" }] };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });
});

describe("parseOnsResponse — garde-fous", () => {
  it("rejette toute la réponse si le tableau attendu pour cette cadence est absent", () => {
    const r = parseOnsResponse(cpi, { quarters: [{ date: "2026 Q1", value: "2.1" }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("months");
  });

  it("rejette toute la réponse si une valeur dépasse les bornes de plausibilité", () => {
    const payload = {
      months: [
        { date: "2026 JUN", value: "2.4" },
        { date: "2026 JUL", value: "9999" },
      ],
    };
    const r = parseOnsResponse(cpi, payload);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("hors bornes");
  });

  it("rejette une réponse malformée avec un message qui nomme le champ fautif", () => {
    const r = parseOnsResponse(cpi, { months: [{ date: "2026 JUL" }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("réponse malformée");
  });
});
