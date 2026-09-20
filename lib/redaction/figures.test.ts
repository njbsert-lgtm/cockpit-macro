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

const FICHE = {
  pageId: "p1",
  url: "https://notion.so/p1",
  semaine: "S36 — lundi 31/08 au dimanche 06/09",
  contenu:
    "La BCE a porté sa facilité de dépôt à 2,50 % (communiqué BCE).\n" +
    "L'IPCH ressort à 2,4 % en août (Eurostat).\n" +
    "Le Brent a fini à 104 $ sur la semaine (Zonebourse).\n" +
    "La croissance est révisée à 12,45 % par le FMI.",
  sources: ["communiqué BCE", "Eurostat", "Zonebourse", "FMI"],
  recupereLe: "2026-09-05T09:00:00Z",
};

function paquet(
  observations: ObservationContexte[] = [obs()],
  ficheNotion: ContextePaquet["ficheNotion"] = null,
): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S36",
    isoWeek: "2026-S36",
    date: "2026-09-05",
    comparesTo: "2026-S35",
    specialesDeLaSemaine: [],
    notePrecedente: null,
    ficheNotion,
    observations,
    drivers: [],
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
    expect(r.verdicts[0]).toMatchObject({
      verdict: "conforme",
      regime: "A",
      source: "spx au 2026-09-04",
    });
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
    expect(r.verdicts.every((v) => v.verdict === "conforme")).toBe(true);
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
                impacts: [
                  { classe: "eq", direction: "down", label: "—", text: "…" },
                  { classe: "fi", direction: "down", label: "—", text: "…" },
                  { classe: "fx", direction: "flat", label: "—", text: "…" },
                  { classe: "cm", direction: "flat", label: "—", text: "…" },
                ],
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
    expect(rendreRapport(r)).toMatch(/1 non conforme\(s\).*publication bloquée/);
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
      "Aucun chiffre à contrôler dans le texte.",
    );
  });
});

describe("régime A — la base fait foi, sans exception", () => {
  it("un écart sur un instrument nommé dans la phrase bloque, et dit la bonne valeur", () => {
    // Le cas qui justifie le régime : la fiche écrit 104 $, la base a 102,96 $. Sans détection
    // d'écart, ce nombre repartirait en régime B — il est bien dans la fiche, bien attribué —
    // et passerait. L'application a sa propre source pour cet instrument, c'est elle qui fait foi.
    const p = paquet(
      [obs({ instrumentId: "brent", label: "Brent", valeurs: [{ date: "2026-09-04", value: 102.96 }], variationSemaine: null, variationYTD: null })],
      FICHE,
    );
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Le Brent a fini à 104 $ sur la semaine (Zonebourse)." } }),
      p,
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "A", verdict: "ecart", attendu: "102,96" });
    expect(rendreRapport(r)).toContain("la base porte 102,96");
  });

  it("la valeur de la base passe, dans la même phrase", () => {
    const p = paquet(
      [obs({ instrumentId: "brent", label: "Brent", valeurs: [{ date: "2026-09-04", value: 102.96 }], variationSemaine: null, variationYTD: null })],
      FICHE,
    );
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Le Brent a fini à 102,96 $ sur la semaine." } }),
      p,
    );
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({ regime: "A", verdict: "conforme" });
  });

  it("une phrase qui ne nomme aucun instrument ne déclenche pas d'écart", () => {
    // Volontairement étroit : « les rendements longs » ne nomme pas us10y, donc le nombre
    // repart en régime B — lui-même bloquant. L'échec par défaut est le régime le plus exigeant.
    const p = paquet([obs({ instrumentId: "us10y", label: "US 10 ans", valeurs: [{ date: "2026-09-04", value: 4.18 }], variationSemaine: null, variationYTD: null })], FICHE);
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Les rendements longs tiennent à 4,55 %." } }),
      p,
    );
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "introuvable" });
  });
});

describe("régime B — dans la fiche, et attribué", () => {
  it("accepte un nombre littéralement dans la fiche et attribué dans la phrase", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "La facilité de dépôt passe à 2,50 % (communiqué BCE)." } }),
      paquet([obs()], FICHE),
    );
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "conforme", source: "communiqué BCE" });
  });

  it("refuse un nombre de la fiche que personne n'avance dans la phrase", () => {
    // La condition la plus importante : elle transforme des chiffres non vérifiables en
    // discipline éditoriale — le lecteur sait toujours qui avance quoi.
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "La facilité de dépôt passe à 2,50 %." } }),
      paquet([obs()], FICHE),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "sans-attribution" });
  });

  it("refuse un arrondi introduit par le modèle — « 2,5 % » pour « 2,50 % »", () => {
    // La recherche est littérale : on normalise les espaces, jamais les chiffres. Un arrondi
    // de plus est un chiffre fabriqué, même de peu.
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "La facilité de dépôt passe à 2,5 % (communiqué BCE)." } }),
      paquet([obs()], FICHE),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ verdict: "introuvable" });
  });

  it("ne reconnaît pas un nombre dans un nombre plus long", () => {
    // « 2,4 » figure dans « 12,45 » ; ce n'est pas pour autant un nombre de la fiche.
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "La croissance ressort à 2,4 % (FMI)." } }),
      paquet([obs()], { ...FICHE, contenu: "La croissance est révisée à 12,45 % par le FMI." }),
    );
    expect(r.verdicts[0]).toMatchObject({ verdict: "introuvable" });
  });

  it("sans fiche, le régime B n'a pas de texte source : il ne reste qu'introuvable", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'inflation atteint 4,7 % (Eurostat)." } }),
      paquet(),
    );
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "introuvable" });
  });
});

describe("rendreRapport — le total par régime en tête", () => {
  it("compte les deux régimes séparément", () => {
    const p = paquet([obs()], FICHE);
    const r = controlerChiffres(
      brouillon({
        blocs: {
          CeQuiAChange: "L'indice à 7674,37. La facilité de dépôt passe à 2,50 % (communiqué BCE).",
        },
      }),
      p,
    );
    expect(rendreRapport(r)).toContain("régime A : 1, régime B : 1");
    expect(r.bloque).toBe(false);
  });

  it("signale une note sans aucun chiffre du régime A — la collecte n'a rien apporté", () => {
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "L'IPCH ressort à 2,4 % en août (Eurostat)." } }),
      paquet([], FICHE),
    );
    expect(r.bloque).toBe(false);
    expect(rendreRapport(r)).toContain("la collecte n'a rien apporté");
  });
});
