import { describe, expect, it } from "vitest";
import { weeklyChange, weeklyChanges } from "./performance";
import type { Observation } from "./types";

const o = (date: string, value: number): Observation => ({
  instrumentId: "x", date, value, source: "t", fetchedAt: `${date}T12:00:00Z`,
});
const idx = { id: "spx", unit: "index" as const };
const taux = { id: "us10y", unit: "percent" as const };

describe("weeklyChange", () => {
  it("recalcule la variation en % entre la clôture de fin et celle de 7 jours avant", () => {
    const r = weeklyChange(idx, [o("2026-09-11", 100), o("2026-09-18", 102.3)], { collecte: true });
    expect(r).toMatchObject({ status: "ok", unit: "pct", fromDate: "2026-09-11", toDate: "2026-09-18", fromValue: 100, toValue: 102.3 });
    expect(r.status === "ok" && r.value).toBeCloseTo(2.3, 10);
  });

  it("rend un taux en points de base, pas en %", () => {
    const r = weeklyChange(taux, [o("2026-09-11", 4.0), o("2026-09-18", 4.25)], { collecte: true });
    expect(r.status === "ok" && r.unit).toBe("bps");
    expect(r.status === "ok" && r.value).toBeCloseTo(25, 10);
  });

  it("signale une baisse par un signe négatif", () => {
    const r = weeklyChange(idx, [o("2026-09-11", 100), o("2026-09-18", 97)], { collecte: true });
    expect(r.status === "ok" && r.value).toBeCloseTo(-3, 10);
  });

  it("prend la clôture précédente quand la borne tombe un week-end ou un férié", () => {
    const r = weeklyChange(idx, [o("2026-09-11", 100), o("2026-09-18", 110)], { collecte: true, dateFin: "2026-09-19" });
    expect(r).toMatchObject({ status: "ok", fromDate: "2026-09-11", toDate: "2026-09-18" });
    // début nominal mardi 12/05 sans cotation : repli sur la dernière clôture connue, le 08/05
    const f = weeklyChange(idx, [o("2026-05-08", 100), o("2026-05-15", 103), o("2026-05-19", 106)], { collecte: true });
    expect(f).toMatchObject({ status: "ok", fromDate: "2026-05-08", toDate: "2026-05-19" });
  });

  it("refuse une clôture de début absente, en nommant la date", () => {
    const r = weeklyChange(idx, [o("2026-09-18", 102)], { collecte: true });
    expect(r).toMatchObject({ status: "indisponible", reason: "donnee-absente", message: "donnée absente au 11/09" });
  });

  it("refuse un trou de plus de sept jours avant la borne de début", () => {
    const r = weeklyChange(idx, [o("2026-08-20", 100), o("2026-09-18", 102)], { collecte: true });
    expect(r).toMatchObject({ status: "indisponible", message: "donnée absente au 11/09" });
  });

  it("refuse une fin trop ancienne pour la date demandée", () => {
    const r = weeklyChange(idx, [o("2026-09-01", 100), o("2026-09-08", 101)], { collecte: true, dateFin: "2026-09-19" });
    expect(r).toMatchObject({ status: "indisponible", message: "donnée absente au 19/09" });
  });

  it("une série mensuelle n'a pas de variation hebdomadaire", () => {
    const r = weeklyChange(taux, [o("2026-07-01", 3.0), o("2026-08-01", 3.1)], { collecte: true });
    expect(r.status).toBe("indisponible");
  });

  it("un instrument non collecté est « non suivi », jamais zéro", () => {
    const r = weeklyChange(idx, [o("2026-09-11", 100), o("2026-09-18", 102)], { collecte: false });
    expect(r).toEqual({ instrumentId: "spx", status: "indisponible", reason: "non-suivi", message: "non suivi" });
  });

  it("série vide : indisponible, pas de valeur", () => {
    expect(weeklyChange(idx, [], { collecte: true }).status).toBe("indisponible");
  });

  it("par défaut, « collecté » vient du fournisseur actif du catalogue", () => {
    expect(weeklyChange({ id: "id-inexistant", unit: "index" }, [o("2026-09-11", 1), o("2026-09-18", 2)]).status).toBe("indisponible");
  });
});

describe("weeklyChanges", () => {
  it("une ligne par instrument, sans agrégat par classe", () => {
    const res = weeklyChanges(
      [idx, taux],
      { spx: [o("2026-09-11", 100), o("2026-09-18", 101)], us10y: [] },
      { collecte: () => true },
    );
    expect(res.map((r) => r.instrumentId)).toEqual(["spx", "us10y"]);
    expect(res[1].status).toBe("indisponible");
  });
});
