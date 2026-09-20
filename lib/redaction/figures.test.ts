import { describe, expect, it } from "vitest";
import { confronter, controlerChiffres, rendreRapport } from "./figures";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

/**
 * Trois clôtures et une base YTD : de quoi éprouver les trois ancrages — une date écrite, une
 * période recalculée, le présent — sur une même série.
 */
function obs(over: Partial<ObservationContexte> = {}): ObservationContexte {
  return {
    instrumentId: "spx",
    label: "S&P 500",
    unit: "index",
    valeurs: [
      { date: "2026-08-28", value: 7500 },
      { date: "2026-09-03", value: 7600 },
      { date: "2026-09-04", value: 7674.37 },
    ],
    ytdBasis: { date: "2025-12-31", value: 6800 },
    variationSeance: 1.24,
    variationYTD: 12.11,
    fraicheur: "ok",
    ...over,
  };
}

const BRENT = obs({
  instrumentId: "brent",
  label: "Brent",
  valeurs: [
    { date: "2026-09-03", value: 101.4 },
    { date: "2026-09-04", value: 102.96 },
  ],
  ytdBasis: null,
});

const FICHE = {
  pageId: "p1",
  url: "https://notion.so/p1",
  semaine: "S36 — lundi 31/08 au dimanche 06/09",
  contenu:
    "La BCE a porté sa facilité de dépôt à 2,50 % (communiqué BCE).\n" +
    "L'IPCH ressort à 2,4 % en août (Eurostat).\n" +
    "Le Brent a fini à 104,00 $ le 04/09 (Zonebourse).\n" +
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

/** Raccourci : un seul bloc de texte, contrôlé contre un paquet. */
function controler(texte: string, p = paquet()) {
  return controlerChiffres(brouillon({ blocs: { CeQuiAChange: texte } }), p);
}

// ---------------------------------------------------------------------------

describe("confronter — la tolérance d'arrondi", () => {
  it("accepte la valeur exacte", () => {
    expect(confronter("102,96", 102.96)).toEqual({ ok: true });
  });

  it("accepte un arrondi à une décimale de moins que la valeur stockée", () => {
    expect(confronter("103,0", 102.96)).toEqual({ ok: true });
    expect(confronter("3,4", 3.42)).toEqual({ ok: true });
  });

  it("refuse un arrondi qui perd plus d'une décimale — « 103 » pour 102,96", () => {
    // Sans ce plancher, il suffirait d'écrire assez grossièrement pour que la tolérance avale
    // un vrai écart : « 103 » tolérerait ±0,5, donc couvrirait aussi bien 102,96 que 103,4.
    expect(confronter("103", 102.96)).toEqual({ ok: false, raison: "arrondi" });
  });

  it("refuse un écart de niveau à précision égale", () => {
    expect(confronter("104,00", 102.96)).toEqual({ ok: false, raison: "niveau" });
    expect(confronter("3,5", 3.42)).toEqual({ ok: false, raison: "niveau" });
  });

  it("n'impose aucun plancher quand la valeur stockée est entière", () => {
    expect(confronter("7500", 7500)).toEqual({ ok: true });
  });
});

describe("régime A — un chiffre daté se vérifie à sa date", () => {
  it("confronte à la clôture de la date écrite, pas à la dernière", () => {
    // 7600 est la clôture du 03/09 ; 7674,37 celle du 04/09. Sans ancrage sur la date, le
    // premier passerait pour un écart et le second pour juste, quelle que soit la phrase.
    const r = controler("Le S&P 500 clôture à 7600,00 au 03/09.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({
      regime: "A",
      verdict: "conforme",
      dateRetenue: "2026-09-03",
      valeurBase: "7600",
    });
  });

  it("refuse la dernière cotation présentée sous une date antérieure", () => {
    const r = controler("Le S&P 500 clôture à 7674,37 au 03/09.");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ verdict: "ecart", valeurBase: "7600" });
    expect(rendreRapport(r)).toContain("la base porte 7600");
  });

  it("lit une date en toutes lettres comme une date chiffrée", () => {
    expect(controler("Le S&P 500 clôture à 7600,00 le 3 septembre.").bloque).toBe(false);
    expect(controler("Le S&P 500 clôture à 7600,00 le 2026-09-03.").bloque).toBe(false);
  });

  it("ne confond pas les chiffres d'une date avec un prix", () => {
    // « 19 » dans « au 19/09 » serait sinon extrait et confronté à la base comme un niveau.
    const r = controler("Le S&P 500 clôture à 7674,37 au 04/09.");
    expect(r.verdicts).toHaveLength(1);
    expect(r.verdicts[0].ecrit).toBe("7674,37");
  });

  it("rattache chaque nombre à la date la plus proche quand la phrase en porte deux", () => {
    const r = controler("De 7600,00 au 03/09, l'indice S&P 500 passe à 7674,37 au 04/09.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts.map((v) => v.dateRetenue)).toEqual(["2026-09-03", "2026-09-04"]);
  });

  it("ramène une date sans année à l'année précédente si elle tombe après la note", () => {
    const p = paquet([obs({ valeurs: [{ date: "2025-12-30", value: 6790 }], ytdBasis: null })]);
    const r = controlerChiffres(
      brouillon({ blocs: { CeQuiAChange: "Le S&P 500 clôturait à 6790,00 le 30/12." } }),
      { ...p, date: "2026-01-05" },
    );
    expect(r.verdicts[0].dateRetenue).toBe("2025-12-30");
  });
});

describe("régime A — un chiffre sans date exploitable bloque", () => {
  it("bloque un prix nu : dans une note macro, ce n'est pas une information", () => {
    const r = controler("Le S&P 500 clôture à 7674,37.");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({
      regime: "A",
      verdict: "sans-date",
      dateRetenue: null,
      valeurBase: null,
    });
    expect(rendreRapport(r)).toContain("aucune date dans la phrase");
  });

  it("accepte un ancrage explicite au présent, résolu sur la dernière clôture", () => {
    const r = controler("Le S&P 500 cote aujourd'hui 7674,37.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({ verdict: "conforme", dateRetenue: "2026-09-04" });
  });

  it("ne tient pas le présent pour implicite — le doute ne bénéficie pas au texte", () => {
    expect(controler("Le S&P 500 s'établit à 7674,37.").verdicts[0].verdict).toBe("sans-date");
  });
});

describe("régime A — donnée absente à la date citée", () => {
  it("distingue « non vérifiable » d'un écart : l'action corrective n'est pas la même", () => {
    // Le 05/09 n'a pas de clôture dans la base. Dire « écart » enverrait corriger un chiffre
    // peut-être juste ; « donnée absente » envoie regarder la date, ou la collecte.
    const r = controler("Le S&P 500 clôture à 7674,37 au 05/09.");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({
      verdict: "non-verifiable",
      dateRetenue: "2026-09-05",
      valeurBase: null,
    });
    expect(rendreRapport(r)).toContain("non vérifiable — donnée absente au 05/09");
  });
});

describe("régime A — une variation est recalculée, jamais reprise", () => {
  it("recalcule depuis les deux clôtures de la base", () => {
    // (7674,37 − 7500) / 7500 = 2,3249 %. La borne de début est la clôture du 28/08, dernière
    // à sept jours ou plus avant le 04/09.
    const r = controler("Le S&P 500 est en hausse de 2,3 % sur la semaine, au 04/09.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({
      regime: "A",
      verdict: "conforme",
      dateRetenue: "du 28/08 au 04/09",
      valeurBase: "2,32 %",
    });
  });

  it("refuse le pourcentage de la source quand notre calcul dit autre chose", () => {
    // C'est le cœur de la règle : une maison calcule sa variation sur ses propres bornes.
    // Reprendre son chiffre reviendrait à publier son calcul sous notre signature.
    const r = controler("Le S&P 500 est en hausse de 3,1 % sur la semaine, au 04/09.");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ verdict: "ecart", valeurBase: "2,32 %" });
  });

  it("recalcule une variation depuis le 1er janvier sur la base YTD", () => {
    // (7674,37 − 6800) / 6800 = 12,8584 %.
    const r = controler("Le S&P 500 progresse de 12,9 % depuis le 1er janvier, au 04/09.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({
      dateRetenue: "du 31/12 au 04/09",
      valeurBase: "12,86 %",
    });
  });

  it("refuse une variation écrite sans décimale — un ordre de grandeur n'est pas une mesure", () => {
    const r = controler("Le S&P 500 est en hausse de 2 % sur la semaine, au 04/09.");
    expect(r.verdicts[0].verdict).toBe("ecart");
    expect(rendreRapport(r)).toContain("arrondi trop grossier");
  });

  it("déclare non vérifiable une période que la base ne borne pas", () => {
    const r = controler("Le S&P 500 est en hausse de 8,4 % sur un an, au 04/09.");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ verdict: "non-verifiable", valeurBase: null });
  });

  it("sans date écrite, la période se termine sur la dernière clôture", () => {
    const r = controler("Le S&P 500 est en hausse de 2,3 % sur la semaine.");
    expect(r.verdicts[0]).toMatchObject({
      verdict: "conforme",
      dateRetenue: "du 28/08 au 04/09",
    });
  });

  it("ne prend pas un niveau pour une variation parce que la phrase nomme une période", () => {
    // « 7674,37 » est un niveau, « 2,3 % » une variation, dans la même phrase.
    const r = controler("Sur la semaine, le S&P 500 gagne 2,3 % pour finir à 7674,37 au 04/09.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts.map((v) => v.valeurBase)).toEqual(["2,32 %", "7674,37"]);
  });
});

describe("régime A — la base fait foi, sans exception", () => {
  it("un écart avec la fiche bloque, et le rapport dit la valeur de la base", () => {
    // La fiche écrit 104 $, la base porte 102,96 $ au 04/09. Sans détection d'écart, ce nombre
    // repartirait en régime B — présent dans la fiche, attribué — et passerait.
    const r = controler("Le Brent a fini à 104,00 $ le 04/09 (Zonebourse).", paquet([BRENT], FICHE));
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "A", verdict: "ecart", valeurBase: "102,96" });
  });

  it("une phrase qui ne nomme aucun instrument ne bascule pas en régime A", () => {
    // Volontairement étroit : « les rendements longs » ne nomme rien, donc le nombre repart en
    // régime B — lui-même bloquant. L'échec par défaut est le régime le plus exigeant.
    const r = controler("Les rendements longs tiennent à 4,55 % au 04/09.", paquet([BRENT], FICHE));
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "introuvable" });
  });
});

describe("régime B — dans la fiche, et attribué", () => {
  it("accepte un nombre littéralement dans la fiche et attribué dans la phrase", () => {
    const r = controler(
      "La facilité de dépôt passe à 2,50 % (communiqué BCE).",
      paquet([obs()], FICHE),
    );
    expect(r.bloque).toBe(false);
    expect(r.verdicts[0]).toMatchObject({
      regime: "B",
      verdict: "conforme",
      source: "communiqué BCE",
    });
  });

  it("n'exige aucune date en régime B — la fiche est la référence, pas la base", () => {
    // La règle de datation sert à choisir une clôture. Un chiffre qui n'en a pas à choisir —
    // une décision de banque centrale — n'a pas à porter de date pour être vérifiable.
    expect(controler("L'IPCH ressort à 2,4 % (Eurostat).", paquet([obs()], FICHE)).bloque).toBe(
      false,
    );
  });

  it("refuse un nombre de la fiche que personne n'avance dans la phrase", () => {
    const r = controler("La facilité de dépôt passe à 2,50 %.", paquet([obs()], FICHE));
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "sans-attribution" });
  });

  it("refuse un arrondi introduit par le modèle — « 2,5 % » pour « 2,50 % »", () => {
    const r = controler("La facilité de dépôt passe à 2,5 % (communiqué BCE).", paquet([obs()], FICHE));
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ verdict: "introuvable" });
  });

  it("ne reconnaît pas un nombre dans un nombre plus long", () => {
    const r = controler(
      "La croissance ressort à 2,4 % (FMI).",
      paquet([obs()], { ...FICHE, contenu: "La croissance est révisée à 12,45 % par le FMI." }),
    );
    expect(r.verdicts[0]).toMatchObject({ verdict: "introuvable" });
  });

  it("sans fiche, le régime B n'a pas de texte source : il ne reste qu'introuvable", () => {
    const r = controler("L'inflation atteint 4,7 % (Eurostat).");
    expect(r.bloque).toBe(true);
    expect(r.verdicts[0]).toMatchObject({ regime: "B", verdict: "introuvable" });
  });
});

describe("ce qui n'est pas une mesure", () => {
  it("laisse passer une année", () => {
    const r = controler("Plus bas depuis 2021.");
    expect(r.bloque).toBe(false);
    expect(r.verdicts).toHaveLength(0);
  });

  it("laisse passer un petit compte — « les trois branches »", () => {
    expect(controler("Les 3 branches du driver restent en place.").bloque).toBe(false);
  });

  it("un texte sans chiffre ne bloque rien", () => {
    const r = controlerChiffres(brouillon(), paquet());
    expect(r.bloque).toBe(false);
    expect(r.verdicts).toHaveLength(0);
  });
});

describe("ce que le contrôle couvre au-delà des blocs", () => {
  it("contrôle les indicateurs d'en-tête, aussi visibles que le corps", () => {
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

describe("rendreRapport", () => {
  it("affiche pour chaque chiffre du régime A sa date retenue et la valeur en base", () => {
    const rendu = rendreRapport(controler("Le S&P 500 clôture à 7600,00 au 03/09."));
    expect(rendu).toContain("7600,00");
    expect(rendu).toContain("base 7600");
    expect(rendu).toContain("03/09");
  });

  it("compte les deux régimes séparément", () => {
    const r = controler(
      "Le S&P 500 clôture à 7674,37 au 04/09. La facilité de dépôt passe à 2,50 % (communiqué BCE).",
      paquet([obs()], FICHE),
    );
    expect(rendreRapport(r)).toContain("régime A : 1, régime B : 1");
    expect(r.bloque).toBe(false);
  });

  it("signale une note sans aucun chiffre du régime A — la collecte n'a rien apporté", () => {
    const r = controler("L'IPCH ressort à 2,4 % en août (Eurostat).", paquet([], FICHE));
    expect(r.bloque).toBe(false);
    expect(rendreRapport(r)).toContain("la collecte n'a rien apporté");
  });

  it("le dit quand le texte ne porte aucun chiffre", () => {
    expect(rendreRapport(controlerChiffres(brouillon(), paquet()))).toBe(
      "Aucun chiffre à contrôler dans le texte.",
    );
  });
});
