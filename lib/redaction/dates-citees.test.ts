import { describe, expect, it } from "vitest";
import {
  datesCitees,
  decritLePresent,
  estUneVariation,
  masquer,
  periodeCitee,
  spansDeTermes,
} from "./dates-citees";

const NOTE = "2026-09-05";

describe("datesCitees", () => {
  const iso = (phrase: string, note = NOTE) => datesCitees(phrase, note).map((d) => d.iso);

  it("lit les trois écritures d'une date", () => {
    expect(iso("clôture du 03/09")).toEqual(["2026-09-03"]);
    expect(iso("clôture du 3 septembre")).toEqual(["2026-09-03"]);
    expect(iso("clôture du 2026-09-03")).toEqual(["2026-09-03"]);
  });

  it("lit une année écrite, à deux ou quatre chiffres", () => {
    expect(iso("le 03/09/2025")).toEqual(["2025-09-03"]);
    expect(iso("le 03/09/25")).toEqual(["2025-09-03"]);
    expect(iso("le 3 septembre 2024")).toEqual(["2024-09-03"]);
  });

  it("comble l'année manquante par celle de la note", () => {
    expect(iso("au 28/08")).toEqual(["2026-08-28"]);
  });

  it("ramène au passé une date déduite qui tomberait après la note", () => {
    // Une note du 5 janvier qui cite « le 28/12 » parle de décembre dernier.
    expect(iso("le 28/12", "2026-01-05")).toEqual(["2025-12-28"]);
  });

  it("n'invente pas une date qui n'existe pas", () => {
    expect(iso("référence 45/13")).toEqual([]);
    expect(iso("le 31/09")).toEqual([]);
  });

  it("ne compte pas deux fois une date dont les motifs se recouvrent", () => {
    expect(iso("le 03/09/2026")).toHaveLength(1);
  });

  it("rend les positions, pour rattacher la bonne date au bon nombre", () => {
    const [a, b] = datesCitees("De 7600 au 03/09 à 7674 au 04/09", NOTE);
    expect(a.debut).toBeLessThan(b.debut);
    expect(a.iso).toBe("2026-09-03");
  });
});

describe("masquer", () => {
  it("remplace par des espaces, en conservant les positions", () => {
    const phrase = "clôture à 7674,37 au 04/09";
    const masquee = masquer(phrase, datesCitees(phrase, NOTE));
    expect(masquee).toHaveLength(phrase.length);
    expect(masquee).not.toContain("04/09");
    expect(masquee).toContain("7674,37");
    expect(masquee.indexOf("7674,37")).toBe(phrase.indexOf("7674,37"));
  });
});

describe("spansDeTermes — les noms d'instruments portent des chiffres", () => {
  it("masque le nom, pas la mesure", () => {
    const phrase = "Le S&P 500 clôture à 7674,37";
    const masquee = masquer(phrase, spansDeTermes(phrase, ["S&P 500", "spx"]));
    expect(masquee).not.toContain("500");
    expect(masquee).toContain("7674,37");
  });

  it("préfère le terme le plus long quand deux se recouvrent", () => {
    const phrase = "Le S&P 500 monte";
    const spans = spansDeTermes(phrase, ["S&P", "S&P 500"]);
    expect(spans).toHaveLength(1);
    expect(phrase.slice(spans[0].debut, spans[0].fin)).toBe("S&P 500");
  });

  it("ignore la casse", () => {
    expect(spansDeTermes("le brent recule", ["Brent"])).toHaveLength(1);
  });
});

describe("periodeCitee", () => {
  it("reconnaît les périodes usuelles", () => {
    expect(periodeCitee("en hausse sur la semaine")).toMatchObject({ libelle: "sur la semaine" });
    expect(periodeCitee("sur deux séances")).toMatchObject({ libelle: "sur deux séances" });
    expect(periodeCitee("depuis le 1er janvier")).toMatchObject({ ytd: true });
    expect(periodeCitee("sur un mois")).toMatchObject({ libelle: "sur un mois" });
  });

  it("rend null quand la phrase ne nomme aucune période", () => {
    expect(periodeCitee("Le Brent clôture à 102,96 au 04/09")).toBeNull();
  });

  it("rend la position du marqueur — « 1er janvier » est une borne, pas une date", () => {
    const phrase = "progresse de 12,9 % depuis le 1er janvier, au 04/09";
    const periode = periodeCitee(phrase);
    expect(periode).not.toBeNull();
    if (!periode) return;

    // Sans ce span, la date du 1er janvier serait retenue comme date de référence du nombre,
    // et la variation annuelle serait vérifiée au 1er janvier plutôt qu'au 04/09.
    const dansLeMarqueur = datesCitees(phrase, NOTE).filter(
      (d) => d.debut < periode.fin && d.fin > periode.debut,
    );
    expect(dansLeMarqueur.map((d) => d.iso)).toEqual(["2026-01-01"]);
  });
});

describe("estUneVariation — le segment depuis le nombre précédent", () => {
  const cas = (phrase: string, cible: string, debutDuSegment = 0) =>
    estUneVariation(phrase, debutDuSegment, phrase.indexOf(cible));

  it("reconnaît un mouvement", () => {
    expect(cas("l'indice est en hausse de 2,3 %", "2,3")).toBe(true);
    expect(cas("l'indice recule de 2,3 %", "2,3")).toBe(true);
    expect(cas("l'indice gagne 2,3 %", "2,3")).toBe(true);
  });

  it("ne prend pas un niveau pour une variation", () => {
    expect(cas("l'indice clôture à 7674,37", "7674,37")).toBe(false);
    expect(cas("le 10 ans à 4,18 %", "4,18")).toBe(false);
  });

  it("n'attrape pas le mouvement du nombre précédent", () => {
    // « gagne » qualifie 2,3, pas 7674,37. Une fenêtre de largeur fixe les confondrait.
    const phrase = "l'indice gagne 2,3 % pour finir à 7674,37";
    const apres23 = phrase.indexOf("2,3") + 3;
    expect(cas(phrase, "7674,37", apres23)).toBe(false);
  });
});

describe("decritLePresent", () => {
  it("reconnaît un ancrage explicite", () => {
    expect(decritLePresent("l'indice cote aujourd'hui 7674,37")).toBe(true);
    expect(decritLePresent("au dernier relevé, 7674,37")).toBe(true);
  });

  it("ne tient pas le présent pour implicite", () => {
    // Le doute ne bénéficie pas au texte : sans marqueur, le nombre est réputé sans date.
    expect(decritLePresent("l'indice s'établit à 7674,37")).toBe(false);
  });
});
