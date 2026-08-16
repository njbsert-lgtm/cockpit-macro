import { describe, expect, it } from "vitest";
import { buildObservationsUrl, parseFredObservations } from "./fred";
import type { FredMapping } from "@/config/fred-series";

const yieldMapping: FredMapping = {
  target: { kind: "instrument", id: "us10y" },
  seriesId: "DGS10",
  units: "lin",
  cadence: "business-daily",
  plausible: { min: -5, max: 25 },
  expect: { units: "Percent", frequency: "Daily" },
  enabled: true,
};

const obs = (date: string, value: string) => ({ date, value });

describe("parseFredObservations — structure", () => {
  it("accepte une réponse conforme et convertit les valeurs", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("2026-08-12", "4.65"), obs("2026-08-13", "4.62")],
    });
    expect(result).toEqual({
      ok: true,
      points: [
        { date: "2026-08-12", value: 4.65 },
        { date: "2026-08-13", value: 4.62 },
      ],
    });
  });

  it("refuse un corps qui n'a pas le tableau attendu — rien ne sera écrit", () => {
    const result = parseFredObservations(yieldMapping, { error_code: 400 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/réponse malformée/);
  });

  it("refuse une date au mauvais format plutôt que de l'accepter en silence", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("13/08/2026", "4.62")],
    });
    expect(result.ok).toBe(false);
  });

  it("refuse une valeur numérique là où FRED envoie des chaînes", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [{ date: "2026-08-13", value: 4.62 }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseFredObservations — trous et jours sans publication", () => {
  it("écarte les « . » sans les remplacer par zéro", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("2026-08-12", "4.65"), obs("2026-08-13", "."), obs("2026-08-14", "4.60")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.points).toEqual([
        { date: "2026-08-12", value: 4.65 },
        { date: "2026-08-14", value: 4.6 },
      ]);
      expect(result.points.some((p) => p.value === 0)).toBe(false);
    }
  });

  it("traite un tableau vide comme un succès — un week-end n'est pas une panne", () => {
    const result = parseFredObservations(yieldMapping, { observations: [] });
    expect(result).toEqual({ ok: true, points: [] });
  });

  it("traite une série entièrement manquante comme un succès sans point", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("2026-08-13", "."), obs("2026-08-14", ".")],
    });
    expect(result).toEqual({ ok: true, points: [] });
  });
});

describe("parseFredObservations — bornes de plausibilité", () => {
  it("rejette toute la série quand une valeur trahit une unité inattendue", () => {
    // CPIAUCSL sans `pc1` renvoie un indice autour de 320 là où on attend un pourcentage.
    const cpi: FredMapping = {
      ...yieldMapping,
      target: { kind: "macro", id: "us-cpi" },
      seriesId: "CPIAUCSL",
      units: "pc1",
      cadence: "monthly",
      plausible: { min: -20, max: 50 },
    };
    const result = parseFredObservations(cpi, {
      observations: [obs("2026-06-01", "3.4"), obs("2026-07-01", "320.1")],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/hors bornes/);
      expect(result.error).toMatch(/320\.1/);
    }
  });

  it("rejette l'ensemble, pas seulement le point fautif — une unité fausse fausse tout", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("2026-08-12", "4.65"), obs("2026-08-13", "9999")],
    });
    expect(result.ok).toBe(false);
  });

  it("accepte une valeur négative quand les bornes l'autorisent", () => {
    const result = parseFredObservations(yieldMapping, {
      observations: [obs("2026-08-13", "-0.35")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.points[0].value).toBe(-0.35);
  });
});

describe("buildObservationsUrl", () => {
  const now = new Date("2026-08-15T06:00:00Z");

  it("demande la transformation d'unité à FRED plutôt que de la calculer chez nous", () => {
    const url = buildObservationsUrl({ ...yieldMapping, units: "pc1" }, "clef", now);
    expect(url).toContain("units=pc1");
    expect(url).toContain("series_id=DGS10");
    expect(url).toContain("file_type=json");
  });

  it("borne la profondeur d'historique selon la cadence", () => {
    const daily = buildObservationsUrl(yieldMapping, "clef", now);
    const quarterly = buildObservationsUrl({ ...yieldMapping, cadence: "quarterly" }, "clef", now);
    const dateOf = (url: string) =>
      new URLSearchParams(url.split("?")[1]).get("observation_start")!;
    expect(dateOf(daily)).toBe("2025-07-11"); // 400 jours
    expect(dateOf(quarterly) < dateOf(daily)).toBe(true);
  });

  it("ne fait qu'un appel : la clé et les paramètres tiennent dans une seule requête", () => {
    const url = buildObservationsUrl(yieldMapping, "clef-secrete", now);
    expect(url.startsWith("https://api.stlouisfed.org/fred/series/observations?")).toBe(true);
    expect(url).toContain("api_key=clef-secrete");
  });
});
