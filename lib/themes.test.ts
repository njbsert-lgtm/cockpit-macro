import { describe, expect, it } from "vitest";
import type { ThemeObserve } from "@/lib/types";
import { assemblerThemes } from "./themes-content";
import {
  estChiffre,
  etatTheme,
  grouperThemes,
  placesRestantes,
  validerPlafond,
  validerTheme,
} from "./themes";

const AUJOURDHUI = "2026-11-15";
const CATALOGUE = new Set(["spread-oat10y-bund10y", "fr10y", "us10y", "eurusd"]);
const TOUT_COLLECTE = () => true;
const RIEN_COLLECTE = () => false;

function theme(over: Partial<ThemeObserve> = {}): ThemeObserve {
  return {
    id: "risque-souverain-francais",
    libelle: "Risque souverain français",
    origine: "outlook",
    emetteur: "Une maison de recherche",
    these: "La trajectoire budgétaire française est le sujet sous-estimé de 2027.",
    dateOrigine: "2026-10-04",
    instrumentsTemoins: ["spread-oat10y-bund10y", "fr10y"],
    temoinsHorsCatalogue: [],
    confirmeSi: "Le spread dépasse 150 pb au relevé avant le 31/01/2027.",
    infirmeSi: "Il reste sous 110 pb sur toute la période.",
    delaiJours: 90,
    debutObservation: "2026-10-04",
    statut: "observe",
    mentions: [],
    verdictLe: null,
    verdictPar: null,
    ...over,
  };
}

describe("etatTheme — le statut se calcule, il ne se déclare pas", () => {
  it("observe quand tous les témoins sont collectés", () => {
    const e = etatTheme(theme(), TOUT_COLLECTE, AUJOURDHUI);
    expect(e.statut).toBe("observe");
    expect(e.temoinsManquants).toEqual([]);
  });

  it("observe-sans-temoin dès qu'un témoin n'est pas collecté — même si le statut stocké dit observe", () => {
    const collecte = (id: string) => id !== "fr10y";
    const e = etatTheme(theme({ statut: "observe" }), collecte, AUJOURDHUI);
    expect(e.statut).toBe("observe-sans-temoin");
    expect(e.temoinsManquants).toEqual(["fr10y"]);
  });

  it("observe-sans-temoin quand un témoin n'est même pas dans le catalogue", () => {
    const e = etatTheme(theme({ instrumentsTemoins: ["fr10y"], temoinsHorsCatalogue: ["Spread CDS France 5 ans"] }), TOUT_COLLECTE, AUJOURDHUI);
    expect(e.statut).toBe("observe-sans-temoin");
    expect(e.temoinsManquants).toEqual(["Spread CDS France 5 ans"]);
  });

  it("repasse en observe quand l'instrument devient collecté : rien à migrer", () => {
    const t = theme({ debutObservation: null });
    expect(etatTheme(t, RIEN_COLLECTE, AUJOURDHUI).statut).toBe("observe-sans-temoin");
    expect(etatTheme(t, TOUT_COLLECTE, AUJOURDHUI).statut).toBe("observe");
  });

  it("un statut terminal posé par un humain n'est jamais recalculé", () => {
    const t = theme({ statut: "confirme", verdictLe: "2026-12-01" });
    expect(etatTheme(t, RIEN_COLLECTE, AUJOURDHUI).statut).toBe("confirme");
  });
});

describe("etatTheme — l'échéance est suspendue tant qu'un témoin manque", () => {
  it("sans témoin collecté, pas d'échéance : le thème n'expire pas sans avoir pu être testé", () => {
    const e = etatTheme(theme({ debutObservation: "2026-08-01" }), RIEN_COLLECTE, "2027-06-01");
    expect(e.echeance).toBeNull();
    expect(e.verdictATrancher).toBe(false);
  });

  it("compte depuis quand il attend, et non depuis quand il est collecté", () => {
    const e = etatTheme(theme({ dateOrigine: "2026-10-04" }), RIEN_COLLECTE, "2026-11-15");
    expect(e.attenteJours).toBe(42);
  });

  it("l'échéance court à partir du début de l'observation, pas de la date d'origine", () => {
    const t = theme({ dateOrigine: "2026-10-04", debutObservation: "2026-11-01", delaiJours: 90 });
    expect(etatTheme(t, TOUT_COLLECTE, AUJOURDHUI).echeance).toBe("2027-01-30");
  });

  it("tous les témoins collectés mais le début non daté : l'échéance ne court pas, et on le dit", () => {
    const e = etatTheme(theme({ debutObservation: null }), TOUT_COLLECTE, AUJOURDHUI);
    expect(e.statut).toBe("observe");
    expect(e.echeance).toBeNull();
    expect(e.aDater).toBe(true);
  });

  it("dit « verdict à trancher » une fois l'échéance atteinte", () => {
    const t = theme({ debutObservation: "2026-07-01", delaiJours: 30 });
    expect(etatTheme(t, TOUT_COLLECTE, AUJOURDHUI).verdictATrancher).toBe(true);
    expect(etatTheme(theme({ debutObservation: "2026-11-01", delaiJours: 90 }), TOUT_COLLECTE, AUJOURDHUI).verdictATrancher).toBe(false);
  });
});

describe("validerTheme — les règles dures", () => {
  it("accepte un thème complet", () => {
    expect(validerTheme(theme(), CATALOGUE)).toEqual([]);
  });

  it("le seuil est chiffré : « les tensions s'aggravent » est refusé à la création", () => {
    const e = validerTheme(theme({ confirmeSi: "Les tensions sur la dette française s'aggravent." }), CATALOGUE);
    expect(e.map((x) => x.message).join(" ")).toContain("confirmeSi");
    const e2 = validerTheme(theme({ infirmeSi: "Elles se calment." }), CATALOGUE);
    expect(e2.map((x) => x.message).join(" ")).toContain("infirmeSi");
  });

  it("sans aucun témoin, ce n'est pas observable", () => {
    const e = validerTheme(theme({ instrumentsTemoins: [], temoinsHorsCatalogue: [] }), CATALOGUE);
    expect(e.map((x) => x.message).join(" ")).toContain("opinion");
  });

  it("un témoin absent du catalogue se déclare à part, il ne s'invente pas dans la liste", () => {
    const e = validerTheme(theme({ instrumentsTemoins: ["cds-france"] }), CATALOGUE);
    expect(e.map((x) => x.message).join(" ")).toContain("temoinsHorsCatalogue");
  });

  it("l'absence de l'instrument en base ne bloque pas la création", () => {
    // `fr10y` est au catalogue : qu'il soit collecté ou non est affaire de statut, pas de validité.
    expect(validerTheme(theme(), CATALOGUE)).toEqual([]);
  });

  it("un délai hors bornes est refusé", () => {
    expect(validerTheme(theme({ delaiJours: 0 }), CATALOGUE)).not.toEqual([]);
    expect(validerTheme(theme({ delaiJours: 9999 }), CATALOGUE)).not.toEqual([]);
    expect(validerTheme(theme({ delaiJours: 12.5 }), CATALOGUE)).not.toEqual([]);
  });

  it("un verdict se date, et un thème encore ouvert n'en porte pas", () => {
    expect(validerTheme(theme({ statut: "confirme" }), CATALOGUE)).not.toEqual([]);
    expect(validerTheme(theme({ statut: "confirme", verdictLe: "2026-12-01" }), CATALOGUE)).toEqual([]);
    expect(validerTheme(theme({ statut: "observe", verdictLe: "2026-12-01" }), CATALOGUE)).not.toEqual([]);
  });

  it("estChiffre", () => {
    expect(estChiffre("dépasse 150 pb")).toBe(true);
    expect(estChiffre("s'aggravent")).toBe(false);
  });
});

describe("plafond — cinq thèmes observés, les thèmes sans témoin n'y comptent pas", () => {
  const six = Array.from({ length: 6 }, (_, i) => theme({ id: `t${i}` }));

  it("refuse six thèmes observés", () => {
    expect(validerPlafond(six, TOUT_COLLECTE, AUJOURDHUI)).not.toEqual([]);
  });

  it("accepte cinq", () => {
    expect(validerPlafond(six.slice(0, 5), TOUT_COLLECTE, AUJOURDHUI)).toEqual([]);
  });

  it("six thèmes dont certains sans témoin passent : ils attendent, ils n'occupent aucune attention", () => {
    const collecte = (id: string) => id !== "fr10y";
    // Aucun n'est « observe » : tous attendent fr10y.
    expect(validerPlafond(six, collecte, AUJOURDHUI)).toEqual([]);
  });

  it("les thèmes tranchés ne comptent pas non plus", () => {
    const mix = [...six.slice(0, 5), theme({ id: "vieux", statut: "infirme", verdictLe: "2026-09-01" })];
    expect(validerPlafond(mix, TOUT_COLLECTE, AUJOURDHUI)).toEqual([]);
  });

  it("placesRestantes", () => {
    expect(placesRestantes(six.slice(0, 2), TOUT_COLLECTE, AUJOURDHUI)).toBe(3);
    expect(placesRestantes(six, TOUT_COLLECTE, AUJOURDHUI)).toBe(0);
    expect(placesRestantes(six, RIEN_COLLECTE, AUJOURDHUI)).toBe(5);
  });
});

describe("grouperThemes — la feuille de route de collecte", () => {
  it("sépare ce qui attend, ce qui s'observe et ce qui est tranché", () => {
    const collecte = (id: string) => id !== "fr10y";
    const themes = [
      theme({ id: "attend" }), // fr10y manque
      theme({ id: "observe", instrumentsTemoins: ["us10y"] }),
      theme({ id: "fini", statut: "expire", verdictLe: "2026-09-01" }),
    ];
    const g = grouperThemes(themes, collecte, AUJOURDHUI);
    expect(g.enAttente.map((t) => t.id)).toEqual(["attend"]);
    expect(g.observes.map((t) => t.id)).toEqual(["observe"]);
    expect(g.tranches.map((t) => t.id)).toEqual(["fini"]);
  });

  it("met en tête ceux qui attendent depuis le plus longtemps : c'est l'argument de priorisation", () => {
    const themes = [
      theme({ id: "recent", dateOrigine: "2026-11-01" }),
      theme({ id: "ancien", dateOrigine: "2026-08-01" }),
    ];
    const g = grouperThemes(themes, RIEN_COLLECTE, AUJOURDHUI);
    expect(g.enAttente.map((t) => t.id)).toEqual(["ancien", "recent"]);
  });
});

describe("assemblerThemes — le généré et le manuel ne s'écrasent pas", () => {
  it("applique un ajustement manuel par-dessus un thème généré", () => {
    const [t] = assemblerThemes([], [theme({ debutObservation: null })], {
      "risque-souverain-francais": { debutObservation: "2026-11-01" },
    });
    expect(t.debutObservation).toBe("2026-11-01");
    // Ce qui a été accepté ne s'ajuste pas : la thèse reste celle du thème généré.
    expect(t.these).toContain("trajectoire budgétaire");
  });

  it("un thème manuel l'emporte sur un thème généré du même identifiant", () => {
    const res = assemblerThemes([theme({ libelle: "Manuel" })], [theme({ libelle: "Généré" })], {});
    expect(res).toHaveLength(1);
    expect(res[0].libelle).toBe("Manuel");
  });

  it("ignore un ajustement sans thème : il n'invente rien", () => {
    expect(assemblerThemes([], [], { fantome: { debutObservation: "2026-11-01" } })).toEqual([]);
  });
});
