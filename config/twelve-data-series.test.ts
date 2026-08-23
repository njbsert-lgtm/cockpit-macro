import { describe, expect, it } from "vitest";
import { TWELVE_DATA_SERIES, ENABLED_TWELVE_DATA_SERIES } from "./twelve-data-series";
import { getInstrument } from "@/lib/data";

describe("la table de correspondance Twelve Data", () => {
  it("ne cible que des identifiants qui existent — une cible morte serait collectée dans le vide", () => {
    for (const mapping of TWELVE_DATA_SERIES) {
      expect(
        getInstrument(mapping.target.id),
        `${mapping.symbol} cible « ${mapping.target.id} », qui n'existe pas`,
      ).not.toBeNull();
    }
  });

  it("ne cible jamais deux fois le même instrument", () => {
    const ids = TWELVE_DATA_SERIES.map((m) => m.target.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'emploie jamais deux fois le même symbole", () => {
    const symbols = TWELVE_DATA_SERIES.map((m) => m.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("exige une raison écrite pour tout symbole désactivé", () => {
    for (const mapping of TWELVE_DATA_SERIES.filter((m) => !m.enabled)) {
      expect(mapping.disabledReason, `${mapping.symbol} est désactivée sans raison`).toBeTruthy();
    }
  });

  it("porte des bornes de plausibilité cohérentes", () => {
    for (const mapping of TWELVE_DATA_SERIES) {
      expect(mapping.plausible.min).toBeLessThan(mapping.plausible.max);
    }
  });

  it("ne cible jamais un indicateur macro — Twelve Data ne sert que des instruments", () => {
    for (const mapping of TWELVE_DATA_SERIES) {
      expect(mapping.target.kind).toBe("instrument");
    }
  });

  it("n'active que ce qui est sorti vert de la sonde réelle : or et l'ETF ACWI", () => {
    const activeIds = ENABLED_TWELVE_DATA_SERIES.map((m) => m.target.id).sort();
    expect(activeIds).toEqual(["acwi", "gold"]);
  });
});
