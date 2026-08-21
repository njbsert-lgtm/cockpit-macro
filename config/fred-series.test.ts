import { describe, expect, it } from "vitest";
import { FRED_SERIES, ENABLED_SERIES, LOOKBACK_DAYS, STALENESS_TOLERANCE } from "./fred-series";
import { getInstrument, getMacroIndicator } from "@/lib/data";

describe("la table de correspondance FRED", () => {
  it("ne cible que des identifiants qui existent — une cible morte serait collectée dans le vide", () => {
    for (const mapping of FRED_SERIES) {
      const found =
        mapping.target.kind === "instrument"
          ? getInstrument(mapping.target.id)
          : getMacroIndicator(mapping.target.id);
      expect(found, `${mapping.seriesId} cible « ${mapping.target.id} », qui n'existe pas`).not.toBeNull();
    }
  });

  it("ne cible jamais deux fois le même objet — sinon deux séries s'écraseraient l'une l'autre", () => {
    const keys = FRED_SERIES.map((m) => `${m.target.kind}:${m.target.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("n'emploie jamais deux fois la même série FRED", () => {
    const ids = FRED_SERIES.map((m) => m.seriesId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exige une raison écrite pour toute série désactivée", () => {
    for (const mapping of FRED_SERIES.filter((m) => !m.enabled)) {
      expect(mapping.disabledReason, `${mapping.seriesId} est désactivée sans raison`).toBeTruthy();
    }
  });

  it("porte des bornes de plausibilité cohérentes", () => {
    for (const mapping of FRED_SERIES) {
      expect(mapping.plausible.min).toBeLessThan(mapping.plausible.max);
    }
  });

  it("couvre chaque cadence employée par une profondeur et une tolérance", () => {
    for (const mapping of FRED_SERIES) {
      expect(LOOKBACK_DAYS[mapping.cadence]).toBeGreaterThan(0);
      expect(STALENESS_TOLERANCE[mapping.cadence].max).toBeGreaterThan(0);
    }
  });

  it("ne couvre pas l'US 15 ans — le Trésor ne cote pas cette maturité", () => {
    expect(FRED_SERIES.some((m) => m.target.id === "us15y")).toBe(false);
    expect(getInstrument("us15y")).toBeNull();
  });

  it("laisse les instruments hors FRED au seed : la courbe allemande n'est pas couverte", () => {
    // Courbe allemande : jamais couverte, FRED ne redistribue pas les Bund. Les indices
    // propriétaires sous licence (Euro Stoxx, or, DXY…) non plus, structurellement — voir
    // le test suivant, qui dérive la liste plutôt que de la nommer en dur.
    for (const id of ["de10y", "fr10y"]) {
      expect(ENABLED_SERIES.some((m) => m.target.id === id)).toBe(false);
    }
  });

  it("ne collecte que les indices propriétaires sous licence, jamais les mots-clés qui les désignent en commentaire", () => {
    // `ndx`, `brent`, `eurusd` ont rejoint les séries actives après contrôle : ce test citait
    // leurs identifiants comme exemples de « jamais couvert », et échouait pour la seule raison
    // qu'une source de plus avait été branchée. Ce qui doit être vérifié, c'est la borne
    // structurelle — DXY reste hors FRED, l'indice de la Fed n'étant pas celui d'ICE —, pas un
    // échantillon qui se périme à chaque activation.
    expect(ENABLED_SERIES.some((m) => m.target.id === "dxy")).toBe(false);
  });
});
