import { describe, expect, it } from "vitest";
import type { ObservationsBySeries } from "@/lib/observations";
import { construireObservationsDepuis, type EntreeObservable } from "./observations";

function bySeries(entries: Record<string, Array<{ date: string; value: number }>>): ObservationsBySeries {
  const map: ObservationsBySeries = new Map();
  for (const [id, points] of Object.entries(entries)) {
    map.set(
      id,
      points.map((p) => ({
        instrumentId: id,
        date: p.date,
        value: p.value,
        source: "test",
        fetchedAt: `${p.date}T00:00:00Z`,
      })),
    );
  }
  return map;
}

const toujoursCouvert = () => true;
const jamaisCouvert = () => false;

describe("construireObservationsDepuis", () => {
  it("exclut une entrée que la source ne couvre pas, même si le seed lui donne des valeurs", () => {
    // C'est le bug qui a motivé cette fonction : une entrée restée au seed a des points non
    // vides, mais fictifs. Sans le filtre `estCouvert`, elle entrerait dans le paquet comme si
    // elle était réellement collectée.
    const entree: EntreeObservable = {
      id: "cac40",
      label: "CAC 40",
      unit: "index",
      cadence: "business-daily",
      ytdBasis: 7500,
    };
    const series = bySeries({ cac40: [{ date: "2026-09-01", value: 7600 }] });
    expect(construireObservationsDepuis([entree], series, "2026-09-19", jamaisCouvert)).toEqual([]);
  });

  it("calcule la variation d'un indicateur mensuel malgré l'écart de trente jours entre relevés", () => {
    // Le taux directeur, exemple direct : une variation entre deux publications mensuelles
    // espacées de 30 jours ne doit pas être écartée par le seuil de sept jours pensé pour du
    // quotidien — c'est exactement ce que le seuil calibré par cadence corrige.
    const entree: EntreeObservable = {
      id: "us-policy-rate",
      label: "Taux directeur (Fed funds)",
      unit: "percent",
      cadence: "monthly",
      ytdBasis: null,
    };
    const series = bySeries({
      "us-policy-rate": [
        { date: "2026-08-15", value: 3.75 },
        { date: "2026-09-17", value: 4.0 },
      ],
    });
    const [resultat] = construireObservationsDepuis([entree], series, "2026-09-19", toujoursCouvert);
    expect(resultat.variationSemaine).not.toBeNull();
    expect(resultat.variationSemaine!).toBeCloseTo(((4.0 - 3.75) / 3.75) * 100, 5);
    expect(resultat.variationYTD).toBeNull();
    expect(resultat.fraicheur).toBe("ok");
  });

  it("ne calcule jamais de variation YTD sans base — jamais une valeur inventée", () => {
    const entree: EntreeObservable = {
      id: "us-unemployment",
      label: "Taux de chômage",
      unit: "percent",
      cadence: "monthly",
      ytdBasis: null,
    };
    const series = bySeries({ "us-unemployment": [{ date: "2026-08-01", value: 4.2 }] });
    const [resultat] = construireObservationsDepuis([entree], series, "2026-09-19", toujoursCouvert);
    expect(resultat.variationYTD).toBeNull();
  });

  it("n'affiche rien pour une entrée couverte mais dont la collecte n'a encore rien écrit", () => {
    const entree: EntreeObservable = {
      id: "us-cpi",
      label: "Inflation totale",
      unit: "percent",
      cadence: "monthly",
      ytdBasis: null,
    };
    expect(
      construireObservationsDepuis([entree], new Map(), "2026-09-19", toujoursCouvert),
    ).toEqual([]);
  });
});
