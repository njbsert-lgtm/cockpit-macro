import { describe, expect, it } from "vitest";
import { filterByRange, rangeStart, type SeriesPoint } from "./chart-range";

const points: SeriesPoint[] = [
  { date: "2024-06-01", value: 1 },
  { date: "2025-12-31", value: 2 },
  { date: "2026-01-02", value: 3 },
  { date: "2026-07-15", value: 4 },
  { date: "2026-08-10", value: 5 },
  { date: "2026-08-13", value: 6 },
];

describe("rangeStart", () => {
  it("ancre YTD au 1er janvier de l'année du dernier point", () => {
    expect(rangeStart("ytd", "2026-08-13")).toBe("2026-01-01");
  });

  it("recule d'une semaine pour 1w", () => {
    expect(rangeStart("1w", "2026-08-13")).toBe("2026-08-06");
  });

  it("recule du bon nombre de mois", () => {
    expect(rangeStart("1m", "2026-08-13")).toBe("2026-07-13");
    expect(rangeStart("6m", "2026-08-13")).toBe("2026-02-13");
    expect(rangeStart("1y", "2026-08-13")).toBe("2025-08-13");
    expect(rangeStart("5y", "2026-08-13")).toBe("2021-08-13");
  });
});

describe("filterByRange", () => {
  it("s'ancre sur le dernier point, pas sur la date du jour", () => {
    // Série arrêtée en 2026 : un an en arrière doit rester peuplé, quelle que soit la date
    // à laquelle on regarde la page.
    expect(filterByRange(points, "1y").map((p) => p.value)).toEqual([2, 3, 4, 5, 6]);
  });

  it("YTD ne garde que l'année du dernier point", () => {
    expect(filterByRange(points, "ytd").map((p) => p.value)).toEqual([3, 4, 5, 6]);
  });

  it("une fenêtre courte peut ne garder que quelques points", () => {
    expect(filterByRange(points, "1w").map((p) => p.value)).toEqual([5, 6]);
  });

  it("une fenêtre longue garde tout", () => {
    expect(filterByRange(points, "5y")).toHaveLength(6);
  });

  it("une série vide reste vide", () => {
    expect(filterByRange([], "1y")).toEqual([]);
  });
});
