import { describe, expect, it } from "vitest";
import { enPointsDeBase, estEnPalier, paliersDe } from "./paliers";
import { getMacroIndicator, getMacroIndicators } from "./data";

describe("estEnPalier — décidé sur la métrique, jamais sur la zone", () => {
  it("retient tous les taux directeurs, quelle que soit la zone", () => {
    const taux = getMacroIndicators().filter((i) => i.id.endsWith("-policy-rate"));
    expect(taux.length).toBeGreaterThan(1);
    expect(taux.every(estEnPalier)).toBe(true);
  });

  it("ne retient pas une série continue", () => {
    expect(estEnPalier(getMacroIndicator("us-cpi")!)).toBe(false);
    expect(estEnPalier(getMacroIndicator("us-unemployment")!)).toBe(false);
  });
});

describe("paliersDe — l'histoire du taux, sans répétition", () => {
  const quotidien = [
    { date: "2026-09-14", value: 3.75 },
    { date: "2026-09-15", value: 3.75 },
    { date: "2026-09-16", value: 4.0 },
    { date: "2026-09-17", value: 4.0 },
    { date: "2026-09-18", value: 4.0 },
  ];

  it("ne garde que le premier relevé et les changements", () => {
    expect(paliersDe(quotidien).map((p) => p.date)).toEqual(["2026-09-14", "2026-09-16"]);
  });

  it("chiffre la variation par rapport au palier précédent", () => {
    const [premier, second] = paliersDe(quotidien);
    expect(premier.variation).toBeNull();
    expect(second.variation).toBeCloseTo(0.25, 10);
  });

  it("retient jusqu'à quand un palier a tenu", () => {
    const [premier, second] = paliersDe(quotidien);
    expect(premier.jusquA).toBe("2026-09-15");
    expect(second.jusquA).toBe("2026-09-18");
  });

  it("trie avant de réduire — l'ordre d'arrivée ne doit rien changer", () => {
    const melange = [quotidien[2], quotidien[0], quotidien[4], quotidien[1], quotidien[3]];
    expect(paliersDe(melange).map((p) => p.date)).toEqual(["2026-09-14", "2026-09-16"]);
  });

  it("compte une baisse comme une rupture au même titre qu'une hausse", () => {
    const baisse = [
      { date: "2026-01-05", value: 4.0 },
      { date: "2026-02-05", value: 3.75 },
      { date: "2026-03-05", value: 3.75 },
    ];
    const paliers = paliersDe(baisse);
    expect(paliers).toHaveLength(2);
    expect(paliers[1].variation).toBeCloseTo(-0.25, 10);
  });

  it("rend une série vide sur une série vide, et un point sur un point", () => {
    expect(paliersDe([])).toEqual([]);
    expect(paliersDe([{ date: "2026-09-16", value: 4 }])).toHaveLength(1);
  });

  it("garde toute l'information : la valeur à une date quelconque se relit des paliers", () => {
    // C'est ce qui rend la réduction honnête plutôt qu'appauvrissante — entre deux ruptures,
    // la valeur est celle de la rupture précédente, par construction.
    const paliers = paliersDe(quotidien);
    for (const point of quotidien) {
      const applicable = paliers.filter((p) => p.date <= point.date).at(-1)!;
      expect(applicable.value).toBe(point.value);
    }
  });
});

describe("enPointsDeBase — l'unité dans laquelle une décision se lit", () => {
  it("rend une hausse et une baisse avec leur signe", () => {
    expect(enPointsDeBase(0.25)).toBe("+25 bps");
    expect(enPointsDeBase(-0.5)).toBe("−50 bps");
  });

  it("absorbe l'imprécision de la soustraction de deux flottants", () => {
    // 4 − 3,75 vaut 0,25000000000000044 en virgule flottante : sans arrondi, la table
    // afficherait « +25,000000000000004 bps » pour une faute qui n'est pas la nôtre.
    expect(enPointsDeBase(4 - 3.75)).toBe("+25 bps");
  });
});
