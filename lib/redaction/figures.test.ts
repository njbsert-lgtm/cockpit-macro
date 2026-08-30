import { describe, expect, it } from "vitest";
import { controlerChiffres, rendreRapport } from "./figures";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

function obs(over: Partial<ObservationContexte> = {}): ObservationContexte {
  return {
    instrumentId: "spx",
    label: "S&P 500",
    unit: "index",
    valeurs: [{ date: "2026-09-04", value: 7674.37 }],
    variationSemaine: 1.24,
    variationYTD: 12.11,
    fraicheur: "ok",
    ...over,
  };
}

function paquet(observations: ObservationContexte[] = [obs()]): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S36",
    isoWeek: "2026-S36",
    date: "2026-09-05",
    comparesTo: "2026-S35",
    specialesDeLaSemaine: [],
    notePrecedente: null,
    observations,
    itemsVeille: [],
    scenariosCourants: [],
    tendancesCourantes: [],
    guetsOuverts: [],
    guetsExpires: [],
    budgetGuets: 3,
    echeancesSemaine: [],
    trigger: null,
  };
}

function brouillon(over: Partial<Brouillon> = {}): Brouillon {
  return {
    regimeStatement: "Un régime.",
    keyIndicators: [{ label: "Régime", value: "Choc d'offre" }],
    channels: ["taux-reel"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: { CeQuiAChange: "Rien n'a changé." },
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [],
    driverCandidate: null,
    redactionNotes: "",
    ...over,
  };
}

describe("controlerChiffres — un chiffre du paquet passe", () => {
  it("reconnaît une valeur citée telle quelle", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'indice clôture à 7674,37." } }),
      paquet(),
    );
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({ verdict: "trouve", source: "spx au 2026-09-04" });
  });

  it("accepte un arrondi à la décimale écrite — 3,4 pour 3,42", () => {
    const p = paquet([obs({ variationSemaine: 3.42, variationYTD: null, valeurs: [] })]);
    const r = controlerChiffres(brouillon({ blocs: { CeQuiAChange: "En hausse de 3,4 %." } }), p);
    expect(r.bloque).toBe(false);
  });

  it("refuse un arrondi qui déborde la tolérance — 3,5 pour 3,42", () => {
    const p = paquet([obs({ variationSemaine: 3.42, variationYTD: null, valeurs: [] })]);
    const r = controlerChiffres(brouillon({ blocs: { CeQuiAChange: "En hausse de 3,5 %." } }), p);
    expect(r.bloque).toBe(true);
  });

  it("reconnaît un nombre écrit avec un séparateur de milliers", () => {
    const p = paquet([obs({ valeurs: [{ date: "2026-09-04", value: 25249.85 }] })]);
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Le Nasdaq à 25 249,85." } }),
      p,
    );
    expect(r.verdicts.some((v) => v.verdict === "introuvable")).toBe(false);
  });

  it("rattache une variation signée à sa valeur absolue", () => {
    const p = paquet([obs({ variationSemaine: -2.4, variationYTD: null, valeurs: [] })]);
    const r = controlerChiffres(brouillon({ blocs: { CeQuiAChange: "Recul de 2,4 %." } }), p);
    expect(r.bloque).toBe(false);
  });
});

describe("controlerChiffres — il bloque, il ne signale pas", () => {
  it("un chiffre absent du paquet bloque la publication", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'inflation atteint 4,7 %." } }),
      paquet(),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ ecrit: "4,7", verdict: "introuvable", source: null });
  });

  it("un seul chiffre faux suffit à bloquer, même noyé dans des chiffres justes", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'indice à 7674,37 après une inflation à 4,7 %." } }),
      paquet(),
    );
    expect(r.bloque).toBe(true);
  });

  it("contrôle aussi les indicateurs d'en-tête, aussi visibles que le corps", () => {
    const r = controlerChiffres(
      brouillon({ keyIndicators: [{ label: "Inflation US", value: "4,7 %" }] }),
      paquet(),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0].bloc).toBe("keyIndicators/Inflation US");
  });

  it("contrôle la justification d'une révision de scénario", () => {
    const r = controlerChiffres(
      brouillon({
        scenarioRevisions: [
          {
            driverId: "rates",
            branches: [
              {
                branchId: "hausse",
                likelihood: "central",
                why: "Le cœur d'inflation à 2,9 % ne laisse pas de marge.",
                thesis: "La Fed reprend son cycle.",
                impacts: {
                  eq: { direction: "down", label: "—", text: "…" },
                  fi: { direction: "down", label: "—", text: "…" },
                  fx: { direction: "flat", label: "—", text: "…" },
                  cm: { direction: "flat", label: "—", text: "…" },
                },
                watchSignals: "…",
              },
            ],
          },
        ],
      }),
      paquet(),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0].bloc).toContain("scenarioRevisions/rates/hausse/why");
  });
});

describe("controlerChiffres — ce qui n'est pas une mesure", () => {
  it("laisse passer une année", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Plus bas depuis 2021." } }),
      paquet(),
    );
    expect(r.bloque).toBe(false);
    expect(r.verdicts).toHaveLength(0);
  });

  it("laisse passer un petit compte — « les trois branches », « les cinq canaux »", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Les 3 branches du driver restent en place." } }),
      paquet(),
    );
    expect(r.bloque).toBe(false);
  });

  it("un texte sans chiffre ne bloque rien", () => {
    const r = controlerChiffres(brouillon(), paquet());
    expect(r.bloque).toBe(false);
    expect(r.verdicts).toHaveLength(0);
  });
});

describe("rendreRapport", () => {
  it("annonce le blocage et compte les introuvables", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Inflation à 4,7 %." } }),
      paquet(),
    );
    expect(rendreRapport(r)).toMatch(/1 chiffre\(s\) introuvable\(s\).*publication bloquée/);
  });

  it("nomme la source de chaque chiffre rattaché", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'indice à 7674,37." } }),
      paquet(),
    );
    expect(rendreRapport(r)).toContain("spx au 2026-09-04");
  });

  it("le dit quand le texte ne porte aucun chiffre", () => {
    expect(rendreRapport(controlerChiffres(brouillon(), paquet()))).toBe(
      "Aucun chiffre dans le texte.",
    );
  });
});
