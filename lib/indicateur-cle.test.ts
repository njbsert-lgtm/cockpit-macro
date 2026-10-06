import { describe, expect, it } from "vitest";
import { indicateurDepuisLibelle, resoudreIndicateurCle } from "./indicateur-cle";

const catalogue = new Set(["us-policy-rate", "ez-policy-rate", "jp-policy-rate", "fr-cpi", "us-cpi-core"]);
const existe = (id: string) => catalogue.has(id);

describe("indicateurDepuisLibelle", () => {
  it.each([
    ["Fed funds", "us-policy-rate"],
    ["BCE — facilité de dépôt", "ez-policy-rate"],
    ["BoJ — taux directeur", "jp-policy-rate"],
    ["Inflation France", "fr-cpi"],
    ["Inflation sous-jacente US", "us-cpi-core"],
  ])("%s → %s", (label, id) => {
    expect(indicateurDepuisLibelle(label, existe)).toBe(id);
  });

  it("ne lie pas un chiffre de marché ou une prévision sans indicateur", () => {
    expect(indicateurDepuisLibelle("Brent", existe)).toBeNull();
    expect(indicateurDepuisLibelle("10 ans US", existe)).toBeNull();
    expect(indicateurDepuisLibelle("Déficit France 2027", existe)).toBeNull();
  });

  it("ne fabrique pas de lien vers un indicateur absent du catalogue", () => {
    expect(indicateurDepuisLibelle("BoE — taux directeur", existe)).toBeNull();
  });
});

describe("resoudreIndicateurCle", () => {
  it("l'identifiant explicite prévaut sur le libellé", () => {
    expect(resoudreIndicateurCle({ label: "Fed funds", indicatorId: "fr-cpi" }, existe)).toBe("fr-cpi");
  });

  it("un identifiant explicite inconnu retombe sur le libellé", () => {
    expect(resoudreIndicateurCle({ label: "Fed funds", indicatorId: "zz-x" }, existe)).toBe("us-policy-rate");
  });
});
