import { describe, expect, it } from "vitest";
import {
  businessDaysBetween,
  calendarDaysBetween,
  describePublicationDelay,
  publicationDelay,
} from "./staleness";

// 2026-08-13 est un jeudi, 2026-08-14 un vendredi, 2026-08-17 un lundi.

describe("businessDaysBetween", () => {
  it("compte un jour d'un jeudi au vendredi", () => {
    expect(businessDaysBetween("2026-08-13", "2026-08-14")).toBe(1);
  });

  it("saute le week-end : du vendredi au lundi, un seul jour ouvré", () => {
    expect(businessDaysBetween("2026-08-14", "2026-08-17")).toBe(1);
  });

  it("ne compte ni le samedi ni le dimanche", () => {
    expect(businessDaysBetween("2026-08-14", "2026-08-16")).toBe(0);
  });

  it("compte une semaine pleine comme cinq jours ouvrés", () => {
    expect(businessDaysBetween("2026-08-10", "2026-08-17")).toBe(5);
  });

  it("renvoie zéro quand les dates sont égales ou inversées", () => {
    expect(businessDaysBetween("2026-08-13", "2026-08-13")).toBe(0);
    expect(businessDaysBetween("2026-08-17", "2026-08-13")).toBe(0);
  });
});

describe("calendarDaysBetween", () => {
  it("compte tous les jours, week-end compris", () => {
    expect(calendarDaysBetween("2026-08-14", "2026-08-17")).toBe(3);
  });
});

describe("publicationDelay — une série qui ne bouge pas n'est pas en retard", () => {
  it("ne signale rien pour une série quotidienne au lendemain d'une clôture", () => {
    const delay = publicationDelay("2026-08-13", "business-daily", new Date("2026-08-14T06:00:00Z"));
    expect(delay?.late).toBe(false);
  });

  it("ne signale rien le lundi pour une clôture du vendredi — le week-end ne compte pas", () => {
    const delay = publicationDelay("2026-08-14", "business-daily", new Date("2026-08-17T06:00:00Z"));
    expect(delay?.elapsed).toBe(1);
    expect(delay?.late).toBe(false);
  });

  it("absorbe un jour férié isolé sans calendrier de fériés", () => {
    // Clôture du jeudi, on est mardi : vendredi férié, puis week-end, puis lundi férié.
    const delay = publicationDelay("2026-08-13", "business-daily", new Date("2026-08-18T06:00:00Z"));
    expect(delay?.elapsed).toBe(3);
    expect(delay?.late).toBe(false);
  });

  it("finit par signaler une source qui s'est vraiment tue", () => {
    const delay = publicationDelay("2026-08-03", "business-daily", new Date("2026-08-17T06:00:00Z"));
    expect(delay?.late).toBe(true);
  });

  it("laisse un CPI mensuel tranquille trois semaines après sa publication", () => {
    const delay = publicationDelay("2026-07-01", "monthly", new Date("2026-07-22T06:00:00Z"));
    expect(delay?.late).toBe(false);
  });

  it("signale un CPI mensuel qui n'a rien publié depuis deux mois", () => {
    const delay = publicationDelay("2026-06-01", "monthly", new Date("2026-08-15T06:00:00Z"));
    expect(delay?.late).toBe(true);
  });

  it("laisse un PIB trimestriel tranquille trois mois après", () => {
    const delay = publicationDelay("2026-04-01", "quarterly", new Date("2026-07-15T06:00:00Z"));
    expect(delay?.late).toBe(false);
  });

  it("renvoie null quand il n'y a aucune observation — on ne déduit rien du vide", () => {
    expect(publicationDelay(null, "monthly")).toBeNull();
  });
});

describe("describePublicationDelay", () => {
  it("ne dit rien quand la série est à l'heure", () => {
    const ok = publicationDelay("2026-08-13", "business-daily", new Date("2026-08-14T06:00:00Z"));
    expect(describePublicationDelay(ok)).toBeNull();
    expect(describePublicationDelay(null)).toBeNull();
  });

  it("nomme le retard et la tolérance quand il y en a un", () => {
    const late = publicationDelay("2026-08-03", "business-daily", new Date("2026-08-17T06:00:00Z"));
    const text = describePublicationDelay(late);
    expect(text).toMatch(/jours ouvrés/);
    expect(text).toMatch(/au-delà des 3/);
  });
});
