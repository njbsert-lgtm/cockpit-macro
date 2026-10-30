import { describe, expect, it } from "vitest";
import { REGIMES_TEST } from "./regime-fixture";
import { recevoir } from "./reception";
import { MARQUEUR_DEBUT, MARQUEUR_FIN, type Vivier } from "./sortie-mixte";

const VIVIER: Vivier = {
  driverIds: ["rates"],
  branchesParDriver: new Map([["rates", ["hausse", "statu-quo", "baisses"]]]),
  trendIds: [],
  instrumentIds: [],
  veilleItemIds: [],
  sourceIds: ["Zonebourse"],
  blocsAttendus: ["CeQuiAChange"],
  budgetGuets: 3,
  catalogueInstrumentIds: ["us10y", "eurusd"],
  placesThemes: 5,
  themesExistantsIds: [],
  marches: {
    instrumentsParDriver: new Map([["rates", ["us10y", "eurusd"]]]),
    sansMesure: new Set(),
    emetteurs: ["Zonebourse"],
  },
};

const FRONTMATTER = `---
keyIndicators:
  - { label: a, value: "1" }
  - { label: b, value: "2" }
  - { label: c, value: "3" }
channels: [taux-reel]
driverOrder: [rates]
trendRefs: []
instrumentRefs: []
veilleItemRefs: []
---`;

function reponse(corps: string, marchesParDriver: unknown) {
  const json = {
    regimeStatementPropositions: REGIMES_TEST,
    scenarioRevisions: [],
    guets: [],
    trendUpdates: [],
    sources: [],
    marchesParDriver,
  };
  return `${FRONTMATTER}\n\n${corps}\n\n${MARQUEUR_DEBUT}\n${JSON.stringify(json)}\n${MARQUEUR_FIN}\n`;
}

const CORPS = "<CeQuiAChange>\n\n### Un sujet\n\n**Une affirmation.** Le texte.\n\n</CeQuiAChange>";

describe("recevoir — « Les marchés par driver »", () => {
  it("complète le brouillon d'une ligne sans cause pour l'instrument que le modèle n'a pas mentionné", () => {
    const r = recevoir(
      reponse(CORPS, [
        { driverId: "rates", lignes: [{ instrumentId: "us10y", cause: "La Fed durcit son discours.", emetteur: "Zonebourse", canal: "fonction-reaction" }] },
      ]),
      VIVIER,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.brouillon.marchesParDriver?.[0].lignes.map((l) => [l.instrumentId, l.cause === null])).toEqual([
      ["us10y", false],
      ["eurusd", true],
    ]);
  });

  it("refuse un modèle qui rédige le bloc lui-même : le chiffre est écrit par le code", () => {
    const corps = `${CORPS}\n\n<LesMarchesParDriver>\n\n### Taux\n\nUS 10 ans : +12 bps.\n\n</LesMarchesParDriver>`;
    const r = recevoir(reponse(corps, []), VIVIER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toMatch(/écrit par le code/);
  });

  it("refuse une cause dont l'émetteur n'est pas dans la fiche", () => {
    const r = recevoir(
      reponse(CORPS, [
        { driverId: "rates", lignes: [{ instrumentId: "us10y", cause: "Une cause.", emetteur: "Bloomberg", canal: "dollar" }] },
      ]),
      VIVIER,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toMatch(/absent de la fiche/);
  });
});
