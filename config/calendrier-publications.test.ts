import { describe, expect, it } from "vitest";
import seed from "@/data/seed.json";
import { CALENDRIER_PUBLICATIONS, prochainePublication } from "./calendrier-publications";
import { getMacroIndicator } from "@/lib/data";

describe("prochainePublication", () => {
  it("rend la première date à venir", () => {
    expect(prochainePublication("us-policy-rate", "2026-10-19")).toBe("2026-10-28");
  });

  it("garde la date du jour : la donnée n'est pas encore sortie le matin", () => {
    expect(prochainePublication("us-policy-rate", "2026-10-28")).toBe("2026-10-28");
  });

  it("avance d'elle-même une fois la date passée", () => {
    expect(prochainePublication("us-policy-rate", "2026-10-29")).toBe("2026-12-09");
  });

  it("rend null quand toutes les dates relevées sont passées", () => {
    expect(prochainePublication("us-policy-rate", "2028-01-01")).toBeNull();
  });

  it("rend null pour un indicateur sans calendrier relevé", () => {
    expect(prochainePublication("us-pmi", "2026-10-19")).toBeNull();
  });
});

describe("CALENDRIER_PUBLICATIONS", () => {
  const ids = new Set(seed.macroIndicators.map((i) => i.id));

  it("ne porte que des indicateurs du catalogue", () => {
    for (const id of Object.keys(CALENDRIER_PUBLICATIONS)) expect(ids.has(id), id).toBe(true);
  });

  it("n'écrit que des dates réelles, au format AAAA-MM-JJ", () => {
    for (const [id, { dates }] of Object.entries(CALENDRIER_PUBLICATIONS)) {
      for (const d of dates) {
        expect(d, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), id).toBe(d);
      }
    }
  });
});

describe("getMacroIndicator", () => {
  it("porte la prochaine publication du calendrier, plus celle du seed", () => {
    const indicator = getMacroIndicator("us-cpi");
    expect(indicator?.nextRelease).toBe(prochainePublication("us-cpi"));
  });
});
