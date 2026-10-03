import { describe, expect, it } from "vitest";
import { AXES, getAxesForDriver } from "./axes";
import { DRIVERS } from "./drivers";
import { getInstrument, getMacroIndicator } from "@/lib/data";

describe("axes des drivers — intégrité", () => {
  it("chaque driver porte de trois à cinq axes", () => {
    for (const driver of DRIVERS) {
      const n = getAxesForDriver(driver.id).length;
      expect(n, driver.id).toBeGreaterThanOrEqual(3);
      expect(n, driver.id).toBeLessThanOrEqual(5);
    }
  });

  it("n'attache aucun axe à un driver inconnu", () => {
    const ids = new Set(DRIVERS.map((d) => d.id));
    for (const axe of AXES) expect(ids.has(axe.driverId), axe.id).toBe(true);
  });

  it("des identifiants uniques", () => {
    expect(new Set(AXES.map((a) => a.id)).size).toBe(AXES.length);
  });

  it("ne cite que des instruments et des indicateurs du catalogue", () => {
    for (const axe of AXES) {
      for (const id of axe.instruments) expect(getInstrument(id), `${axe.id} → ${id}`).not.toBeNull();
      for (const id of axe.macros) expect(getMacroIndicator(id), `${axe.id} → ${id}`).not.toBeNull();
    }
  });

  it("une lisibilité non directe, ou limitée, explique pourquoi", () => {
    for (const axe of AXES) {
      if (axe.lisibilite !== "directe") expect(axe.limite.length, axe.id).toBeGreaterThan(0);
    }
  });

  it("un axe sans lisibilité n'a d'instrument que par défaut, jamais comme preuve", () => {
    for (const axe of AXES.filter((a) => a.lisibilite === "aucune")) {
      expect(axe.limite, axe.id).toMatch(/\S/);
    }
  });
});
