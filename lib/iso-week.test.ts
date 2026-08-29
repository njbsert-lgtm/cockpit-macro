import { describe, expect, it } from "vitest";
import { isoWeekBounds, isoWeekOf } from "./iso-week";

// ---------------------------------------------------------------------------
// Conversion date → semaine ISO — valeurs confrontées à `datetime.isocalendar()`
// ---------------------------------------------------------------------------

describe("isoWeekOf — la vraie règle ISO 8601", () => {
  it("un samedi appartient à la même semaine que le vendredi qu'il couvre", () => {
    expect(isoWeekOf("2026-08-28")).toBe("2026-S35"); // vendredi
    expect(isoWeekOf("2026-08-29")).toBe("2026-S35"); // samedi
  });

  it("le dimanche ferme la semaine, il ne l'ouvre pas", () => {
    expect(isoWeekOf("2026-08-30")).toBe("2026-S35"); // dimanche
    expect(isoWeekOf("2026-08-31")).toBe("2026-S36"); // lundi suivant
  });

  it("une fin d'année bascule sur l'année de son jeudi", () => {
    expect(isoWeekOf("2024-12-30")).toBe("2025-S01");
    expect(isoWeekOf("2025-12-31")).toBe("2026-S01");
  });

  it("gère une année à 53 semaines qui déborde sur janvier", () => {
    expect(isoWeekOf("2026-12-31")).toBe("2026-S53");
    expect(isoWeekOf("2027-01-03")).toBe("2026-S53");
    expect(isoWeekOf("2027-01-04")).toBe("2027-S01");
  });

  it("le 4 janvier est toujours en semaine 1", () => {
    for (const annee of [2024, 2025, 2026, 2027]) {
      expect(isoWeekOf(`${annee}-01-04`)).toBe(`${annee}-S01`);
    }
  });
});

describe("isoWeekBounds", () => {
  it("borne une semaine du lundi au dimanche", () => {
    expect(isoWeekBounds("2026-S36")).toEqual({ debut: "2026-08-31", fin: "2026-09-06" });
  });

  it("une semaine 1 peut commencer l'année précédente", () => {
    expect(isoWeekBounds("2026-S01")).toEqual({ debut: "2025-12-29", fin: "2026-01-04" });
  });

  it("une semaine 53 peut finir l'année suivante", () => {
    expect(isoWeekBounds("2026-S53")).toEqual({ debut: "2026-12-28", fin: "2027-01-03" });
  });

  it("fait l'aller-retour avec isoWeekOf", () => {
    for (const semaine of ["2026-S01", "2026-S35", "2026-S53"]) {
      const { debut, fin } = isoWeekBounds(semaine);
      expect(isoWeekOf(debut)).toBe(semaine);
      expect(isoWeekOf(fin)).toBe(semaine);
    }
  });
});
