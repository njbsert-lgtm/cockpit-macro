import { describe, expect, it } from "vitest";
import { balisageChiffresCites, sujetsDuBloc, valeurCitee } from "./chiffres-cites";

describe("valeurCitee", () => {
  it("garde la valeur sans sa date ni son commentaire", () => {
    expect(valeurCitee("5,1 % au 15/10")).toBe("5,1 %");
    expect(valeurCitee("29 950,82 pts au 14/10 (-2,02 % séance)")).toBe("29 950,82 pts");
    expect(valeurCitee("3,75-4,00 % au 16/10")).toBe("3,75-4,00 %");
  });
  it("ne garde rien sans chiffre", () => {
    expect(valeurCitee("inchangé")).toBeNull();
  });
});

describe("balisageChiffresCites", () => {
  it("enveloppe la valeur citée dans le texte", () => {
    expect(balisageChiffresCites("Le 10 ans clôture à 5,1 % au 15/10.", ["5,1 %"])).toBe(
      `Le 10 ans clôture à <ChiffreCite i="0">5,1 %</ChiffreCite> au 15/10.`,
    );
  });
  it("ne prend pas un morceau d'un autre nombre", () => {
    expect(balisageChiffresCites("à 15,1 % puis 5,12 %", ["5,1 %"])).toBe("à 15,1 % puis 5,12 %");
  });
  it("laisse les sous-titres et les balises de bloc intacts", () => {
    const corps = "<CeQuiAChange>\n### À 5,1 %\nTexte à 5,1 %.\n</CeQuiAChange>";
    expect(balisageChiffresCites(corps, ["5,1 %"])).toBe(
      `<CeQuiAChange>\n### À 5,1 %\nTexte à <ChiffreCite i="0">5,1 %</ChiffreCite>.\n</CeQuiAChange>`,
    );
  });
  it("préfère la valeur la plus longue", () => {
    expect(balisageChiffresCites("reste à 3,75-4,00 %", ["4,00 %", "3,75-4,00 %"])).toBe(
      `reste à <ChiffreCite i="1">3,75-4,00 %</ChiffreCite>`,
    );
  });
});

describe("sujetsDuBloc", () => {
  it("compte les sous-titres d'un bloc", () => {
    expect(sujetsDuBloc("<CeQuiAChange>\n### A\nx\n### B\ny\n</CeQuiAChange>", "CeQuiAChange")).toBe(2);
    expect(sujetsDuBloc("rien", "CeQuiAChange")).toBe(0);
  });
});
