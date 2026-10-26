import { describe, expect, it } from "vitest";
import {
  chiffresParGeste,
  etatSegment,
  libelleSegment,
  premierAFaire,
  voisin,
  type Geste,
} from "./gestes";

function g(id: string, over: Partial<Geste> = {}): Geste {
  return { id, titre: id, emoji: null, fait: false, chiffres: 0, ...over };
}

const GESTES = [
  g("regime", { titre: "Phrase de régime", fait: true }),
  g("CeQuiAChange", { titre: "Ce qui a changé", chiffres: 7 }),
  g("CeQuiSestConfirme", { titre: "Ce qui s'est confirmé" }),
  g("RevisionDesScenarios", { titre: "Révision des scénarios" }),
];

describe("état d'un segment", () => {
  it("fait reste fait, ouvert ou non", () => {
    expect(etatSegment(GESTES[0], null)).toBe("fait");
    expect(etatSegment(GESTES[0], "regime")).toBe("fait");
  });

  it("en cours seulement pour le geste ouvert, à faire pour les autres", () => {
    expect(etatSegment(GESTES[1], "CeQuiAChange")).toBe("en-cours");
    expect(etatSegment(GESTES[2], "CeQuiAChange")).toBe("a-faire");
  });

  it("le libellé accessible dit l'état et les chiffres à trancher", () => {
    expect(libelleSegment(GESTES[1], null)).toBe("Ce qui a changé, à faire, 7 chiffres à trancher");
    expect(libelleSegment(GESTES[2], null)).toBe("Ce qui s'est confirmé, à faire");
    expect(libelleSegment(g("x", { titre: "X", chiffres: 1 }), null)).toBe("X, à faire, 1 chiffre à trancher");
  });
});

describe("navigation libre", () => {
  it("le premier geste à faire n'est pas le premier de la liste s'il est fait", () => {
    expect(premierAFaire(GESTES)?.id).toBe("CeQuiAChange");
  });

  it("aucun geste à faire : null", () => {
    expect(premierAFaire(GESTES.map((x) => ({ ...x, fait: true })))).toBeNull();
  });

  it("on atteint le 4e segment alors que les 2e et 3e ne sont pas faits", () => {
    // « Suivant » ne regarde pas l'état : il suffit que le segment existe.
    expect(voisin(GESTES, "CeQuiSestConfirme", 1)?.id).toBe("RevisionDesScenarios");
    // Et on saute directement à n'importe quel segment, quel que soit l'état des précédents.
    const cible = GESTES.find((x) => x.id === "RevisionDesScenarios")!;
    expect(etatSegment(cible, "RevisionDesScenarios")).toBe("en-cours");
  });

  it("aux extrémités, pas de voisin", () => {
    expect(voisin(GESTES, "regime", -1)).toBeNull();
    expect(voisin(GESTES, "RevisionDesScenarios", 1)).toBeNull();
    expect(voisin(GESTES, "inconnu", 1)).toBeNull();
  });
});

describe("chiffresParGeste", () => {
  it("compte les non conformes non gardés, la phrase de régime sous `regime`", () => {
    const compte = chiffresParGeste(
      [
        { bloc: "CeQuiAChange", verdict: "ecart" },
        { bloc: "CeQuiAChange", verdict: "introuvable", garde: true },
        { bloc: "CeQuiAChange", verdict: "conforme" },
        { bloc: "regimeStatement", verdict: "ecart" },
        { bloc: "regimeStatement/fait", verdict: "ecart" },
        { bloc: "keyIndicators/Brent", verdict: "ecart" },
      ],
      ["regime", "CeQuiAChange", "CeQuiSestConfirme"],
    );
    expect(compte).toEqual({ regime: 1, CeQuiAChange: 1, CeQuiSestConfirme: 0 });
  });
});
