import { describe, expect, it } from "vitest";
import {
  freshnessTier,
  oldestFetchedAt,
  worstTier,
  FRESH_MAX_HOURS,
  STALE_MAX_HOURS,
} from "./freshness";

const NOW = new Date("2026-08-13T12:00:00Z");

/** Décale `NOW` de `hours` heures vers le passé, pour raisonner en âge et non en date. */
function agedBy(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

describe("freshnessTier", () => {
  it("est 'frais' au lendemain d'une collecte réussie", () => {
    expect(freshnessTier(agedBy(1), NOW)).toBe("frais");
    expect(freshnessTier(agedBy(24), NOW)).toBe("frais");
  });

  it("est 'perime' après une collecte manquée", () => {
    expect(freshnessTier(agedBy(30), NOW)).toBe("perime");
  });

  it("est 'erreur' après deux collectes manquées", () => {
    expect(freshnessTier(agedBy(60), NOW)).toBe("erreur");
  });

  it("est 'absente' sans fetchedAt", () => {
    expect(freshnessTier(null, NOW)).toBe("absente");
    expect(freshnessTier(undefined, NOW)).toBe("absente");
  });

  it("respecte ses bornes exactes", () => {
    expect(freshnessTier(agedBy(FRESH_MAX_HOURS - 0.01), NOW)).toBe("frais");
    expect(freshnessTier(agedBy(FRESH_MAX_HOURS), NOW)).toBe("perime");
    expect(freshnessTier(agedBy(STALE_MAX_HOURS - 0.01), NOW)).toBe("perime");
    expect(freshnessTier(agedBy(STALE_MAX_HOURS), NOW)).toBe("erreur");
  });

  it("absorbe la dérive des crons Hobby, qui peuvent tarder d'une heure", () => {
    // Deux passages quotidiens sains, l'un à 06:00 et le suivant à 06:55 le lendemain :
    // 24 h 55 d'écart. Sous un seuil strict à 24 h, ce tuyau parfaitement sain passerait en
    // ambre — c'est précisément ce que la marge de deux heures évite.
    expect(freshnessTier(agedBy(24.92), NOW)).toBe("frais");
    expect(FRESH_MAX_HOURS).toBeGreaterThan(24);
    expect(STALE_MAX_HOURS).toBeGreaterThan(48);
  });

  it("bascule quand même en ambre si une collecte entière est sautée", () => {
    // Le but de la marge est d'absorber la dérive, pas de masquer un passage manqué.
    expect(freshnessTier(agedBy(48), NOW)).toBe("perime");
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
