import { describe, expect, it } from "vitest";
import { freshnessTier, oldestFetchedAt, worstTier } from "./freshness";

const NOW = new Date("2026-08-13T12:00:00Z");

describe("freshnessTier", () => {
  it("est 'frais' sous 24h", () => {
    expect(freshnessTier("2026-08-13T00:00:01Z", NOW)).toBe("frais");
  });

  it("est 'perime' entre 24 et 48h", () => {
    expect(freshnessTier("2026-08-12T00:00:00Z", NOW)).toBe("perime");
  });

  it("est 'erreur' au-delà de 48h", () => {
    expect(freshnessTier("2026-08-10T00:00:00Z", NOW)).toBe("erreur");
  });

  it("est 'absente' sans fetchedAt", () => {
    expect(freshnessTier(null, NOW)).toBe("absente");
    expect(freshnessTier(undefined, NOW)).toBe("absente");
  });

  it("respecte les bornes exactes 24h et 48h", () => {
    expect(freshnessTier("2026-08-12T12:00:00Z", NOW)).toBe("perime"); // exactement 24h
    expect(freshnessTier("2026-08-11T12:00:00Z", NOW)).toBe("erreur"); // exactement 48h
  });
});

describe("worstTier", () => {
  it("retourne le plus sévère d'un ensemble", () => {
    expect(worstTier(["frais", "perime", "frais"])).toBe("perime");
    expect(worstTier(["frais", "erreur", "perime"])).toBe("erreur");
    expect(worstTier(["frais"])).toBe("frais");
  });

  it("retourne 'absente' pour un ensemble vide", () => {
    expect(worstTier([])).toBe("absente");
  });
});

describe("oldestFetchedAt", () => {
  it("retourne la date la plus ancienne", () => {
    const obs = [
      { instrumentId: "a", date: "2026-08-01", value: 1, source: "s", fetchedAt: "2026-08-12T10:00:00Z" },
      { instrumentId: "b", date: "2026-08-01", value: 1, source: "s", fetchedAt: "2026-08-10T10:00:00Z" },
      { instrumentId: "c", date: "2026-08-01", value: 1, source: "s", fetchedAt: "2026-08-13T10:00:00Z" },
    ];
    expect(oldestFetchedAt(obs)).toBe("2026-08-10T10:00:00Z");
  });

  it("retourne null pour un ensemble vide", () => {
    expect(oldestFetchedAt([])).toBeNull();
  });
});
