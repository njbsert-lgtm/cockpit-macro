import { describe, expect, it } from "vitest";
import {
  budgetDisponible,
  estExpire,
  expirer,
  guetsARemonter,
  partitionnerRemontes,
} from "./guets";
import type { Guet } from "./types";

function guet(over: Partial<Guet> = {}): Guet {
  return {
    id: "g1",
    noteSlug: "2026-S36",
    driverId: "rates",
    libelle: "Réunion de la Fed du 16 septembre",
    attendu: "Statu quo, biais inchangé",
    confirmeSi: "Taux directeur inchangé",
    infirmeSi: "Hausse de 25 bps",
    echeance: "2026-09-16",
    sourceAttendue: ["FED:communique"],
    statut: "ouvert",
    resoluPar: null,
    resoluLe: null,
    ...over,
  };
}

const APRES = "2026-09-20";
const AVANT = "2026-09-10";

describe("estExpire — un guet sans échéance n'expire jamais", () => {
  it("« si Ormuz rouvre » reste ouvert, quelle que soit la date", () => {
    const sansDate = guet({ echeance: null, libelle: "Réouverture d'Ormuz" });
    expect(estExpire(sansDate, APRES)).toBe(false);
    expect(estExpire(sansDate, "2030-01-01")).toBe(false);
  });

  it("expire quand l'échéance est passée", () => {
    expect(estExpire(guet(), APRES)).toBe(true);
  });

  it("n'expire pas le jour même : l'événement n'a pas encore eu lieu", () => {
    expect(estExpire(guet(), "2026-09-16")).toBe(false);
  });

  it("n'expire pas avant l'échéance", () => {
    expect(estExpire(guet(), AVANT)).toBe(false);
  });

  it("n'expire pas un guet déjà résolu — l'échéance est passée, mais la question l'est aussi", () => {
    const resolu = guet({ statut: "confirme", resoluLe: "2026-09-16" });
    expect(estExpire(resolu, APRES)).toBe(false);
  });

  it("n'expire pas un guet clos en sans-objet", () => {
    expect(estExpire(guet({ statut: "sans-objet" }), APRES)).toBe(false);
  });
});

describe("expirer", () => {
  it("fait passer à expire les guets dont l'échéance est dépassée", () => {
    const apres = expirer([guet()], APRES);
    expect(apres[0].statut).toBe("expire");
  });

  it("renvoie la liste inchangée par référence quand rien ne bouge", () => {
    const avant = [guet(), guet({ id: "g2", echeance: null })];
    expect(expirer(avant, AVANT)).toBe(avant);
  });

  it("ne touche pas un guet sans échéance au milieu d'autres qui expirent", () => {
    const liste = [guet({ id: "g1" }), guet({ id: "g2", echeance: null })];
    const apres = expirer(liste, APRES);
    expect(apres[0].statut).toBe("expire");
    expect(apres[1].statut).toBe("ouvert");
  });
});

describe("guetsARemonter", () => {
  it("remonte les guets ouverts et ceux qui viennent d'expirer", () => {
    const liste = [
      guet({ id: "ouvert", echeance: "2026-12-01" }),
      guet({ id: "expire" }),
      guet({ id: "sans-date", echeance: null }),
    ];
    expect(guetsARemonter(liste, APRES).map((g) => g.id)).toEqual([
      "ouvert",
      "expire",
      "sans-date",
    ]);
  });

  it("ne remonte pas un guet résolu — sa question est réglée", () => {
    const liste = [
      guet({ id: "confirme", statut: "confirme", resoluLe: "2026-09-16" }),
      guet({ id: "infirme", statut: "infirme", resoluLe: "2026-09-16" }),
      guet({ id: "clos", statut: "sans-objet" }),
    ];
    expect(guetsARemonter(liste, APRES)).toEqual([]);
  });

  it("un guet sans échéance remonte indéfiniment tant qu'il n'est pas clos", () => {
    const liste = [guet({ echeance: null })];
    expect(guetsARemonter(liste, "2030-01-01")).toHaveLength(1);
  });

  it("conserve la note d'origine, pour que l'ancienneté se voie", () => {
    const liste = [guet({ noteSlug: "2026-S36" })];
    expect(guetsARemonter(liste, APRES)[0].noteSlug).toBe("2026-S36");
  });
});

describe("budgetDisponible — les guets remontés comptent dans les trois", () => {
  it("laisse trois places quand rien ne remonte", () => {
    expect(budgetDisponible([])).toBe(3);
  });

  it("décompte chaque guet remonté", () => {
    expect(budgetDisponible([guet({ id: "a" })])).toBe(2);
    expect(budgetDisponible([guet({ id: "a" }), guet({ id: "b" })])).toBe(1);
  });

  it("tombe à zéro quand trois guets sans échéance occupent le budget", () => {
    const sansDate = ["a", "b", "c"].map((id) => guet({ id, echeance: null }));
    expect(budgetDisponible(sansDate)).toBe(0);
  });

  it("ne descend jamais sous zéro", () => {
    const quatre = ["a", "b", "c", "d"].map((id) => guet({ id }));
    expect(budgetDisponible(quatre)).toBe(0);
  });
});

describe("partitionnerRemontes", () => {
  it("sépare les ouverts des expirés pour le paquet de contexte", () => {
    const remontes = guetsARemonter(
      [guet({ id: "a", echeance: "2026-12-01" }), guet({ id: "b" })],
      APRES,
    );
    const { ouverts, expires } = partitionnerRemontes(remontes);
    expect(ouverts.map((g) => g.id)).toEqual(["a"]);
    expect(expires.map((g) => g.id)).toEqual(["b"]);
  });
});
