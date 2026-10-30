import { describe, expect, it } from "vitest";
import type { Echeance } from "@/lib/types";
import { CALENDRIER_DRIVERS, anomaliesCalendrier } from "./calendrier-drivers";

const AUJOURDHUI = "2026-10-30";
const ok: Echeance = {
  date: "2026-12-09",
  driverId: "rates",
  libelle: "Décision FOMC",
  source: "FED:communique",
  url: "https://example.org/officiel",
  releveLe: "2026-10-30",
};

describe("calendrier des drivers", () => {
  it("le calendrier réel est sourcé et relevé", () => {
    // Les échéances passées ne sont pas testées ici : elles sont retirées à la main, et leur
    // passage ne doit pas casser la CI. Source et relevé le sont toujours.
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const anomalies = anomaliesCalendrier(CALENDRIER_DRIVERS, aujourdhui).filter((a) => !a.endsWith("échéance passée"));
    expect(anomalies).toEqual([]);
  });
  it("accepte une entrée complète", () => {
    expect(anomaliesCalendrier([ok], AUJOURDHUI)).toEqual([]);
  });
  it("refuse une entrée sans source", () => {
    expect(anomaliesCalendrier([{ ...ok, url: "" }], AUJOURDHUI)).toHaveLength(1);
  });
  it("refuse une source non https", () => {
    expect(anomaliesCalendrier([{ ...ok, url: "federalreserve.gov" }], AUJOURDHUI)).toHaveLength(1);
  });
  it("refuse une entrée sans date de relevé", () => {
    expect(anomaliesCalendrier([{ ...ok, releveLe: "" }], AUJOURDHUI)).toHaveLength(1);
  });
  it("refuse une date passée", () => {
    expect(anomaliesCalendrier([{ ...ok, date: "2026-10-29" }], AUJOURDHUI)[0]).toMatch(/passée/);
  });
});
