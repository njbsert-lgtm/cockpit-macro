import { describe, expect, it } from "vitest";
import { decouperBloc } from "./relecture";
import type { VerdictChiffre } from "./figures";

function verdict(over: Partial<VerdictChiffre>): VerdictChiffre {
  return {
    ecrit: "125,44",
    valeur: 125.44,
    bloc: "CeQuiAChange",
    regime: "A",
    source: null,
    verdict: "ecart",
    dateRetenue: "2026-10-06",
    valeurBase: "115,22",
    phrase: "Le Brent cote 125,44 $ au 06/10.",
    ...over,
  };
}

const TEXTE = [
  "### Le pétrole",
  "**Le Brent recule.** Le Brent cote 125,44 $ au 06/10. Autre phrase.",
  "### Les taux",
  "Le 10 ans clôture à 4,96 % au 22/10.",
].join("\n\n");

describe("decouperBloc", () => {
  it("sépare sous-titres et paragraphes", () => {
    const { parties } = decouperBloc(TEXTE, []);
    expect(parties.map((p) => p.type)).toEqual(["titre", "paragraphe", "titre", "paragraphe"]);
  });

  it("interprète le gras d'attaque sans en laisser les astérisques", () => {
    const { parties } = decouperBloc(TEXTE, []);
    const p = parties[1];
    if (p.type !== "paragraphe") throw new Error("paragraphe attendu");
    expect(p.segments[0]).toEqual({ texte: "Le Brent recule.", gras: true });
    expect(p.segments.map((s) => s.texte).join("")).not.toContain("**");
  });

  it("surligne le nombre dans sa phrase et le numérote dans le bloc", () => {
    const v1 = verdict({});
    const v2 = verdict({
      ecrit: "4,96",
      valeur: 4.96,
      phrase: "Le 10 ans clôture à 4,96 % au 22/10.",
    });
    const { parties, surlignes } = decouperBloc(TEXTE, [v1, v2]);
    expect(surlignes).toBe(2);
    const lus = parties.flatMap((p) => (p.type === "paragraphe" ? p.segments : []));
    const marques = lus.filter((s) => s.verdict);
    expect(marques.map((s) => [s.texte, s.rang])).toEqual([
      ["125,44", 1],
      ["4,96", 2],
    ]);
  });

  it("ne surligne que le nombre de la phrase visée, pas la même valeur ailleurs", () => {
    const texte = "Le Brent cote 125,44 $ au 06/10. Il valait 125,44 $ en mai.";
    const { parties } = decouperBloc(texte, [verdict({})]);
    const p = parties[0];
    if (p.type !== "paragraphe") throw new Error("paragraphe attendu");
    expect(p.segments.filter((s) => s.verdict)).toHaveLength(1);
  });

  it("ignore sans erreur un nombre dont la phrase n'est plus dans le texte", () => {
    const { surlignes } = decouperBloc("Un texte retouché.", [verdict({})]);
    expect(surlignes).toBe(0);
  });
});
