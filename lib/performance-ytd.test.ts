import { describe, expect, it } from "vitest";
import { dateBaseYtd, groupesYtd, ligneYtd } from "./performance-ytd";
import type { Instrument, Observation } from "./types";

const inst = (over: Partial<Instrument>): Instrument =>
  ({
    id: "x",
    label: "X",
    assetClass: "equity",
    zones: ["global"],
    unit: "index",
    ytdBasis: 100,
    note: "",
    ...over,
  }) as Instrument;

const obs = (date: string, value: number, source = "fred"): Observation => ({
  instrumentId: "x",
  date,
  value,
  source,
  fetchedAt: date + "T04:00:00Z",
});

describe("ligneYtd", () => {
  it("calcule l'écart en pourcentage avec ses deux bornes datées", () => {
    const l = ligneYtd(inst({}), [obs("2026-10-29", 110)]);
    expect(l).toMatchObject({
      statut: "suivi",
      ecart: "+10,00 %",
      direction: "up",
      dateBase: "2025-12-31",
      valeurBase: 100,
      dateReleve: "2026-10-29",
    });
  });

  it("exprime un taux en points de base", () => {
    const l = ligneYtd(inst({ unit: "percent", assetClass: "rates", ytdBasis: 4 }), [
      obs("2026-10-29", 4.5),
    ]);
    expect(l).toMatchObject({ statut: "suivi", ecart: "+50 bps" });
  });

  it("un écart nul reste plat", () => {
    expect(ligneYtd(inst({}), [obs("2026-10-29", 100)])).toMatchObject({ direction: "flat" });
  });

  it("aucune observation : non suivi, aucune valeur", () => {
    expect(ligneYtd(inst({}), [])).toMatchObject({
      statut: "non-suivi",
      raison: "aucune-source",
      derniereValeur: null,
    });
  });

  it("une valeur du seed ne produit aucun écart", () => {
    const l = ligneYtd(inst({}), [obs("2026-10-29", 150, "seed")]);
    expect(l).toMatchObject({ statut: "non-suivi", raison: "valeur-saisie", derniereValeur: null });
  });

  it("base du 31 décembre absente : non suivi, mais la dernière valeur datée est gardée", () => {
    const l = ligneYtd(inst({ ytdBasis: null }), [obs("2026-10-29", 42)]);
    expect(l).toMatchObject({
      statut: "non-suivi",
      raison: "base-absente",
      derniereValeur: { date: "2026-10-29", value: 42 },
    });
  });

  it("une base nulle ne produit jamais un écart", () => {
    expect(ligneYtd(inst({ ytdBasis: 0 }), [obs("2026-10-29", 42)]).statut).toBe("non-suivi");
  });
});

describe("dateBaseYtd", () => {
  it("renvoie le 31 décembre de l'année précédente", () => {
    expect(dateBaseYtd("2026-01-02")).toBe("2025-12-31");
  });
});

describe("groupesYtd", () => {
  const a = inst({ id: "a", assetClass: "equity" });
  const b = inst({ id: "b", assetClass: "fx", ytdBasis: null });
  const c = inst({ id: "c", assetClass: "equity" });

  it("range par classe dans l'ordre donné, une ligne par instrument, sans agrégat", () => {
    const by = new Map<string, Observation[]>([["a", [obs("2026-10-29", 110)]]]);
    const g = groupesYtd([a, b, c], by, ["fx", "equity", "rates"]);
    expect(g.map((x) => x.assetClass)).toEqual(["fx", "equity"]);
    expect(g[1].lignes.map((l) => l.statut)).toEqual(["suivi", "non-suivi"]);
    expect(Object.keys(g[1])).toEqual(["assetClass", "lignes"]);
  });

  it("un instrument absent de la map reste une ligne non suivie", () => {
    const g = groupesYtd([a], new Map(), ["equity"]);
    expect(g[0].lignes[0]).toMatchObject({ raison: "aucune-source" });
  });
});
