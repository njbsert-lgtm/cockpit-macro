import { describe, expect, it } from "vitest";
import {
  dailyChange,
  latestObservation,
  MAX_SESSION_GAP_DAYS,
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

// ---------------------------------------------------------------------------

describe("dailyChange", () => {
  it("mesure l'écart entre les deux dernières clôtures, pas entre les deux premières", () => {
    const list = [obs("2026-08-10", 100), obs("2026-08-11", 110), obs("2026-08-12", 121)];
    const change = dailyChange(list);
    expect(change?.absolute).toBeCloseTo(11, 10);
    expect(change?.pct).toBeCloseTo(10, 10);
    expect(change?.fromDate).toBe("2026-08-11");
    expect(change?.toDate).toBe("2026-08-12");
  });

  it("ne dépend pas de l'ordre d'entrée des observations", () => {
    const list = [obs("2026-08-12", 121), obs("2026-08-10", 100), obs("2026-08-11", 110)];
    expect(dailyChange(list)?.fromDate).toBe("2026-08-11");
  });

  it("enregistre le sens, pas seulement l'amplitude", () => {
    expect(dailyChange([obs("2026-08-11", 110), obs("2026-08-12", 100)])?.direction).toBe("down");
    expect(dailyChange([obs("2026-08-11", 100), obs("2026-08-12", 110)])?.direction).toBe("up");
    expect(dailyChange([obs("2026-08-11", 100), obs("2026-08-12", 100)])?.direction).toBe("flat");
  });

  it("franchit un week-end prolongé par un jour férié", () => {
    const list = [obs("2026-08-05", 100), obs("2026-08-12", 101)];
    expect(dailyChange(list)).not.toBeNull();
    expect(dailyChange(list)?.fromDate).toBe("2026-08-05");
  });

  it("refuse de franchir un trou plus large qu'une séance — ce ne serait plus une variation du jour", () => {
    const list = [obs("2026-07-13", 100), obs("2026-08-12", 130)];
    expect(dailyChange(list)).toBeNull();
  });

  it("place la frontière exactement à MAX_SESSION_GAP_DAYS jours", () => {
    const within = [obs("2026-08-05", 100), obs("2026-08-12", 101)]; // 7 jours
    const beyond = [obs("2026-08-04", 100), obs("2026-08-12", 101)]; // 8 jours
    expect(MAX_SESSION_GAP_DAYS).toBe(7);
    expect(dailyChange(within)).not.toBeNull();
    expect(dailyChange(beyond)).toBeNull();
  });

  it("retourne null plutôt que zéro quand la série n'a qu'une clôture", () => {
    expect(dailyChange([obs("2026-08-12", 100)])).toBeNull();
    expect(dailyChange([])).toBeNull();
  });

  it("gère une variation négative sur un taux sans inverser le signe du pourcentage", () => {
    // Les taux se lisent en bps, mais le calcul relatif doit rester juste : 4,30 → 4,28.
    const change = dailyChange([obs("2026-08-11", 4.3), obs("2026-08-12", 4.28)]);
    expect(change?.absolute).toBeCloseTo(-0.02, 10);
    expect(change?.pct).toBeLessThan(0);
    expect(change?.direction).toBe("down");
  });

  it("ne divise pas par zéro sur un spread nul la veille", () => {
    expect(dailyChange([obs("2026-08-11", 0), obs("2026-08-12", 0.15)])).toBeNull();
  });
});
