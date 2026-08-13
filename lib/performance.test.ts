import { describe, expect, it } from "vitest";
import {
  latestObservation,
  observationOnOrBefore,
  oneMonthPerformance,
  oneYearPerformance,
  performanceSince,
  ytdPerformance,
} from "./performance";
import type { Instrument, Observation } from "./types";

const obs = (date: string, value: number): Observation => ({
  instrumentId: "test",
  date,
  value,
  source: "test",
  fetchedAt: date + "T12:00:00Z",
});

describe("latestObservation", () => {
  it("retourne l'observation la plus récente, indépendamment de l'ordre d'entrée", () => {
    const list = [obs("2026-01-10", 100), obs("2026-03-01", 110), obs("2026-02-15", 105)];
    expect(latestObservation(list)?.date).toBe("2026-03-01");
  });

  it("retourne null pour une série vide", () => {
    expect(latestObservation([])).toBeNull();
  });
});

describe("observationOnOrBefore", () => {
  const list = [obs("2026-01-10", 100), obs("2026-02-15", 105), obs("2026-03-01", 110)];

  it("trouve l'observation exacte à la date donnée", () => {
    expect(observationOnOrBefore(list, "2026-02-15")?.value).toBe(105);
  });

  it("trouve la plus récente observation avant la date donnée", () => {
    expect(observationOnOrBefore(list, "2026-02-20")?.value).toBe(105);
  });

  it("retourne null si la série ne remonte pas jusqu'à la date donnée", () => {
    expect(observationOnOrBefore(list, "2025-12-31")).toBeNull();
  });
});

describe("performanceSince", () => {
  const list = [obs("2026-01-01", 100), obs("2026-02-01", 110)];

  it("calcule un pourcentage correct", () => {
    const perf = performanceSince(list, "2026-01-01");
    expect(perf?.pct).toBeCloseTo(10);
    expect(perf?.fromDate).toBe("2026-01-01");
  });

  it("retourne null si le point de départ n'existe pas dans la série", () => {
    expect(performanceSince(list, "2025-06-01")).toBeNull();
  });

  it("retourne null si le point de départ est la dernière observation elle-même", () => {
    expect(performanceSince(list, "2026-02-01")).toBeNull();
  });
});

describe("ytdPerformance", () => {
  const instrument: Instrument = {
    id: "test",
    label: "Test",
    assetClass: "equity",
    zones: ["global"],
    unit: "index",
    ytdBasis: 100,
    note: "",
  };

  it("calcule la performance depuis la base saisie à la main", () => {
    const list = [obs("2026-06-01", 112)];
    expect(ytdPerformance(instrument, list)).toBeCloseTo(12);
  });

  it("retourne null quand la base YTD n'a pas encore été saisie — jamais un chiffre inventé", () => {
    const noBasis: Instrument = { ...instrument, ytdBasis: null };
    expect(ytdPerformance(noBasis, [obs("2026-06-01", 112)])).toBeNull();
  });

  it("retourne null quand aucune observation n'existe", () => {
    expect(ytdPerformance(instrument, [])).toBeNull();
  });
});

describe("oneMonthPerformance / oneYearPerformance", () => {
  it("retourne null quand l'historique ne remonte pas assez loin", () => {
    const shortHistory = [obs("2026-08-01", 100), obs("2026-08-10", 102)];
    expect(oneMonthPerformance(shortHistory)).toBeNull();
    expect(oneYearPerformance(shortHistory)).toBeNull();
  });

  it("calcule la performance 1 mois quand l'ancre existe", () => {
    const list = [obs("2026-07-10", 100), obs("2026-08-10", 105)];
    const perf = oneMonthPerformance(list);
    expect(perf).not.toBeNull();
    expect(perf?.pct).toBeCloseTo(5);
  });
});
