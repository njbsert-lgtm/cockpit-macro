import { describe, expect, it } from "vitest";
import {
  compterPhrases,
  paragraphes,
  premiereListe,
  signalementsDesBlocs,
  signalementsDuBloc,
} from "./style";

describe("premiereListe — ce qui est une liste", () => {
  it.each([
    ["- un point", "- un point"],
    ["* un point", "* un point"],
    ["+ un point", "+ un point"],
    ["1. un point", "1. un point"],
    ["2) un point", "2) un point"],
    ["  - indentée", "- indentée"],
  ])("reconnaît « %s »", (texte, attendu) => {
    expect(premiereListe(texte)).toBe(attendu);
  });

  it("la trouve au milieu d'un texte", () => {
    expect(premiereListe("Une phrase.\n\n- puis une puce\n- et une autre")).toBe("- puis une puce");
  });

  it.each([
    "**Le Brent monte.** Une phrase.",
    "Une phrase — avec un tiret long.",
    "En 2026. Une phrase qui commence autrement.",
    "2026. Une année en début de ligne n'est pas un numéro.",
    "---",
    "Un taux de 3.75 % et de 2,5 %.",
  ])("ne prend pas « %s » pour une liste", (texte) => {
    expect(premiereListe(texte)).toBeNull();
  });
});

describe("compterPhrases", () => {
  it("ne coupe ni les décimales ni les pourcentages", () => {
    expect(compterPhrases("Le taux passe à 3.75 % puis à 2,5 %.")).toBe(1);
  });
  it("compte les phrases", () => {
    expect(compterPhrases("Une. Deux ! Trois ? Quatre.")).toBe(4);
  });
  it("compte la phrase d'attaque en gras, dont le point précède la fermeture du gras", () => {
    expect(compterPhrases("**Le Brent monte.** Il passe à 113,96 $.")).toBe(2);
    expect(compterPhrases("Il dit « non. » Puis il part.")).toBe(2);
  });
  it("un paragraphe sans ponctuation finale vaut une phrase", () => {
    expect(compterPhrases("sans point")).toBe(1);
  });
});

describe("paragraphes", () => {
  it("sépare sur les lignes vides, sans paragraphe vide", () => {
    expect(paragraphes("A.\n\n\n  \nB.\n\nC.")).toEqual(["A.", "B.", "C."]);
  });
});

describe("signalementsDuBloc — jamais bloquants", () => {
  it("signale un paragraphe de plus de six phrases", () => {
    const long = "**Fait.** " + Array(6).fill("Une phrase.").join(" ");
    const s = signalementsDuBloc("CeQuiAChange", long);
    expect(s.map((x) => x.code)).toEqual(["paragraphe-long"]);
    expect(s[0].paragraphe).toBe(1);
  });

  it("ne signale pas six phrases pile", () => {
    const six = "**Fait.** " + Array(5).fill("Une phrase.").join(" ");
    expect(signalementsDuBloc("CeQuiAChange", six)).toEqual([]);
  });

  it("signale un paragraphe de bloc 1 ou 2 qui ne s'ouvre pas en gras", () => {
    const s = signalementsDuBloc("CeQuiSestConfirme", "**Bon.** Ok.\n\nSans gras d'attaque.");
    expect(s).toEqual([expect.objectContaining({ code: "sans-gras-d-attaque", paragraphe: 2 })]);
  });

  it("n'exige pas le gras d'attaque hors des blocs 1 et 2", () => {
    expect(signalementsDuBloc("RevisionDesScenarios", "Sans gras, c'est permis ici.")).toEqual([]);
  });

  it("n'exige pas le gras d'un composant MDX ni d'un titre", () => {
    expect(signalementsDuBloc("CeQuiAChange", "<Preuve id=\"x\" />\n\n# Titre")).toEqual([]);
  });

  it("agrège plusieurs blocs", () => {
    const s = signalementsDesBlocs({ CeQuiAChange: "Sans gras.", CeQuiSestConfirme: "**Bon.** Ok." });
    expect(s.map((x) => x.bloc)).toEqual(["CeQuiAChange"]);
  });
});
