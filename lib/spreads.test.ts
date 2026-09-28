import { describe, expect, it } from "vitest";
import { computeSpread } from "./spreads";
import type { SpreadDefinition } from "@/config/spreads";
import type { Observation } from "./types";

const NOW = new Date("2026-09-28T04:00:00Z");

const DEF: SpreadDefinition = {
  target: { kind: "instrument", id: "spread-us10y-bund10y" },
  longLegId: "us10y",
  shortLegId: "de10y",
};

const obs = (date: string, value: number): Observation => ({
  instrumentId: "peu-importe",
  date,
  value,
  source: "FRED",
  fetchedAt: "2026-09-28T04:00:00Z",
});

describe("computeSpread", () => {
  it("apparie chaque point de la jambe courte à la dernière valeur connue de la jambe longue", () => {
    const longLeg = [obs("2026-08-01", 4.2), obs("2026-08-15", 4.25), obs("2026-09-01", 4.3)];
    const shortLeg = [obs("2026-08-01", 3.0), obs("2026-09-01", 3.05)];

    const points = computeSpread(longLeg, shortLeg, DEF, NOW);

    expect(points).toEqual([
      {
        instrumentId: "spread-us10y-bund10y",
        date: "2026-08-01",
        value: 1.2000000000000002, // 4.2 - 3.0, flottant fidèle à l'entrée
        source: "Calculé (FRED)",
        fetchedAt: NOW.toISOString(),
      },
      {
        instrumentId: "spread-us10y-bund10y",
        date: "2026-09-01",
        value: 4.3 - 3.05,
        source: "Calculé (FRED)",
        fetchedAt: NOW.toISOString(),
      },
    ]);
  });

  it("hérite de la cadence de la jambe courte — un point par relevé mensuel, pas par jour de la jambe longue", () => {
    const longLeg = Array.from({ length: 30 }, (_, i) =>
      obs(`2026-08-${String(i + 1).padStart(2, "0")}`, 4.2 + i * 0.001),
    );
    const shortLeg = [obs("2026-08-01", 3.0)];

    const points = computeSpread(longLeg, shortLeg, DEF, NOW);

    expect(points).toHaveLength(1);
  });

  it("ne produit aucun point quand la jambe courte précède toute valeur connue de la jambe longue", () => {
    const longLeg = [obs("2026-09-01", 4.3)];
    const shortLeg = [obs("2026-08-01", 3.0)];

    expect(computeSpread(longLeg, shortLeg, DEF, NOW)).toEqual([]);
  });

  it("n'apparie jamais à une valeur future de la jambe longue", () => {
    const longLeg = [obs("2026-08-01", 4.2), obs("2026-10-01", 5.0)];
    const shortLeg = [obs("2026-09-01", 3.05)];

    const points = computeSpread(longLeg, shortLeg, DEF, NOW);

    expect(points).toEqual([
      {
        instrumentId: "spread-us10y-bund10y",
        date: "2026-09-01",
        value: 4.2 - 3.05,
        source: "Calculé (FRED)",
        fetchedAt: NOW.toISOString(),
      },
    ]);
  });

  it("ne produit rien si l'une des deux jambes est vide", () => {
    expect(computeSpread([], [obs("2026-08-01", 3.0)], DEF, NOW)).toEqual([]);
    expect(computeSpread([obs("2026-08-01", 4.2)], [], DEF, NOW)).toEqual([]);
  });
});
