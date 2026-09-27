import { describe, expect, it } from "vitest";
import seedJson from "@/data/seed.json";
import { estNonCollectee, SEED_SOURCE } from "./provenance";
import { FRED_SOURCE } from "./fred";
import { TWELVE_DATA_SOURCE } from "./twelve-data";
import { EUROSTAT_SOURCE } from "./eurostat";
import { ONS_SOURCE } from "./ons";
import { ESTAT_SOURCE } from "./estat";

type SeedObs = { instrumentId: string; source: string };
const seed = seedJson as unknown as { observations: SeedObs[]; macroObservations: SeedObs[] };

describe("provenance du seed", () => {
  it("aucune observation du seed ne s'attribue une source réelle", () => {
    // Le seed attribuait ses valeurs à « Bundesbank », « Banque de France », « FRED /
    // Bundesbank »… sans qu'aucune n'ait été collectée. Une valeur ajoutée à la main doit
    // porter le marqueur, sans quoi elle s'afficherait comme une donnée collectée.
    const fautives = [...seed.observations, ...seed.macroObservations].filter(
      (o) => o.source !== SEED_SOURCE,
    );
    expect(fautives.map((o) => `${o.instrumentId} : ${o.source}`)).toEqual([]);
  });

  it("aucune source collectée ne se confond avec le marqueur du seed", () => {
    for (const source of [FRED_SOURCE, TWELVE_DATA_SOURCE, EUROSTAT_SOURCE, ONS_SOURCE, ESTAT_SOURCE]) {
      expect(estNonCollectee({ source })).toBe(false);
    }
  });

  it("une absence d'observation n'est pas une valeur non collectée", () => {
    expect(estNonCollectee(null)).toBe(false);
    expect(estNonCollectee(undefined)).toBe(false);
  });
});
