import { describe, expect, it } from "vitest";
import { comparisonRows, recentMacroChanges } from "./macro";
import type { MacroIndicator, Observation } from "./types";

function indicator(over: Partial<MacroIndicator> = {}): MacroIndicator {
  return {
    id: "fr-cpi",
    label: "Inflation totale",
    zone: "fr",
    unit: "percent",
    frequency: "monthly",
    seriesKey: "FR.CPI",
    nextRelease: null,
    ...over,
  };
}

function obs(date: string, value: number, over: Partial<Observation> = {}): Observation {
  return { instrumentId: "fr-cpi", date, value, source: "Eurostat", fetchedAt: `${date}T06:00:00Z`, ...over };
}

const NOW = new Date("2026-08-23T12:00:00Z");

describe("recentMacroChanges", () => {
  it("retient un indicateur dont le dernier relevé date de moins de 7 jours", () => {
    const ind = indicator();
    const bySeries = new Map([[ind.id, [obs("2026-08-01", 1.8), obs("2026-08-20", 2.1)]]]);

    const changes = recentMacroChanges([ind], bySeries, NOW);

    expect(changes).toHaveLength(1);
    expect(changes[0].date).toBe("2026-08-20");
    expect(changes[0].value).toBe(2.1);
    expect(changes[0].variation).toBeCloseTo(0.3, 10);
  });

  it("écarte un indicateur dont le dernier relevé date de plus de 7 jours", () => {
    const ind = indicator();
    const bySeries = new Map([[ind.id, [obs("2026-07-01", 1.5), obs("2026-08-01", 1.8)]]]);

    const changes = recentMacroChanges([ind], bySeries, NOW);

    expect(changes).toHaveLength(0);
  });

  it("previous est null quand il n'y a qu'un seul relevé — variation non calculée", () => {
    const ind = indicator();
    const bySeries = new Map([[ind.id, [obs("2026-08-20", 2.1)]]]);

    const changes = recentMacroChanges([ind], bySeries, NOW);

    expect(changes).toHaveLength(1);
    expect(changes[0].previous).toBeNull();
    expect(changes[0].variation).toBeNull();
  });

  it("un indicateur sans aucune observation est absent du résultat", () => {
    const ind = indicator();
    const bySeries = new Map<string, Observation[]>();

    const changes = recentMacroChanges([ind], bySeries, NOW);

    expect(changes).toHaveLength(0);
  });

  it("trie par date décroissante, puis par id d'indicateur", () => {
    const a = indicator({ id: "fr-cpi", zone: "fr" });
    const b = indicator({ id: "de-cpi", zone: "de" });
    const bySeries = new Map([
      [a.id, [obs("2026-08-18", 2.0, { instrumentId: a.id }), obs("2026-08-21", 2.2, { instrumentId: a.id })]],
      [b.id, [obs("2026-08-19", 1.9, { instrumentId: b.id }), obs("2026-08-21", 2.0, { instrumentId: b.id })]],
    ]);

    const changes = recentMacroChanges([a, b], bySeries, NOW);

    expect(changes.map((c) => c.indicator.id)).toEqual(["de-cpi", "fr-cpi"]);
  });

  it("respecte une fenêtre personnalisée", () => {
    const ind = indicator();
    const bySeries = new Map([[ind.id, [obs("2026-08-10", 2.0)]]]);

    expect(recentMacroChanges([ind], bySeries, NOW, 30)).toHaveLength(1);
    expect(recentMacroChanges([ind], bySeries, NOW, 7)).toHaveLength(0);
  });
});

describe("comparisonRows", () => {
  const zones = ["us", "ez", "fr", "de", "es", "it", "uk", "jp", "cn", "in", "em", "global"] as const;

  it("retire les pays de la zone euro pour le taux directeur — ils n'en ont pas en propre", () => {
    const rows = comparisonRows([...zones], "policy-rate");
    expect(rows).not.toContain("fr");
    expect(rows).not.toContain("de");
    expect(rows).not.toContain("es");
    expect(rows).not.toContain("it");
    expect(rows).toContain("ez");
    expect(rows).toContain("us");
  });

  it("garde toutes les zones (sauf global) pour une métrique sans exclusion", () => {
    const rows = comparisonRows([...zones], "cpi");
    expect(rows).toContain("fr");
    expect(rows).not.toContain("global");
  });

  it("exclut toujours global, quelle que soit la métrique", () => {
    expect(comparisonRows([...zones], "policy-rate")).not.toContain("global");
  });
});
