import { describe, expect, it } from "vitest";
import {
  EMETTEURS_MAJEURS,
  CLASSEMENT_SOURCE,
  controlerEmetteursMajeurs,
  preparerSuivi,
  type EmetteurMajeur,
  type ClassementSource,
} from "./emetteurs-majeurs";

const src: ClassementSource = { libelle: "Test", url: "https://exemple.test/classement", date: "2026-10-01" };
const A: EmetteurMajeur = { rang: 1, nom: "A", pays: "US", ticker: "AAA", cik: "0000000001", canal: "edgar" };
const B: EmetteurMajeur = { rang: 2, nom: "B", pays: "TW", ticker: "BBB", cik: null, canal: "communique" };
const AUJ = "2026-10-30";

describe("emetteurs-majeurs", () => {
  it("la configuration livrée est vide et valide", () => {
    expect(EMETTEURS_MAJEURS).toEqual([]);
    expect(CLASSEMENT_SOURCE).toBeNull();
    expect(controlerEmetteursMajeurs(EMETTEURS_MAJEURS, CLASSEMENT_SOURCE, AUJ).erreurs).toEqual([]);
  });
  it("refuse une liste sans source datée", () => {
    expect(controlerEmetteursMajeurs([A], null, AUJ).erreurs.join()).toMatch(/sans classement source/);
    expect(controlerEmetteursMajeurs([A], { ...src, date: "hier" }, AUJ).erreurs.join()).toMatch(/date valide/);
    expect(controlerEmetteursMajeurs([A], { ...src, url: "" }, AUJ).erreurs.join()).toMatch(/URL/);
  });
  it("signale une liste de plus de 100 jours, sans la refuser", () => {
    const r = controlerEmetteursMajeurs([A], { ...src, date: "2026-06-01" }, AUJ);
    expect(r.erreurs).toEqual([]);
    expect(r.avertissements.join()).toMatch(/à réviser chaque trimestre/);
    expect(controlerEmetteursMajeurs([A], src, AUJ).avertissements).toEqual([]);
  });
  it("accepte un émetteur sans CIK en communiqué, refuse EDGAR sans CIK", () => {
    expect(controlerEmetteursMajeurs([A, B], src, AUJ).erreurs).toEqual([]);
    expect(controlerEmetteursMajeurs([{ ...B, canal: "edgar" }], src, AUJ).erreurs.join()).toMatch(/sans CIK/);
  });
  it("refuse les doublons de rang, ticker et CIK", () => {
    expect(controlerEmetteursMajeurs([A, { ...B, rang: 1 }], src, AUJ).erreurs.join()).toMatch(/rang en double/);
    expect(controlerEmetteursMajeurs([A, { ...B, ticker: "aaa" }], src, AUJ).erreurs.join()).toMatch(/ticker en double/);
    expect(
      controlerEmetteursMajeurs([A, { ...A, rang: 2, ticker: "ZZZ" }], src, AUJ).erreurs.join(),
    ).toMatch(/CIK en double/);
  });
  it("préparer le suivi : n'invente aucun driver, sépare hors-EDGAR et déjà suivis", () => {
    const deja: EmetteurMajeur = { ...A, rang: 3, ticker: "MSFT", cik: "0000789019" };
    const r = preparerSuivi([A, B, deja], {});
    expect(r.sansDriver).toEqual([A]);
    expect(r.aAjouter).toEqual([]);
    expect(r.besoinCommunique).toEqual([B]);
    expect(r.dejaSuivis).toEqual([deja]);
    expect(preparerSuivi([A], { AAA: ["ai"] }).aAjouter).toEqual([
      { name: "A", cik: "0000000001", driverRefs: ["ai"] },
    ]);
  });
});
