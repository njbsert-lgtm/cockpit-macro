import { describe, expect, it } from "vitest";
import { construireChiffre, dateDansLaValeur, instrumentDepuisLibelle, libelleDate, socleManquant } from "./chiffres-vivants";
import { SOCLE_CHIFFRES_CLES } from "@/config/chiffres-cles-socle";
import type { Instrument, MacroIndicator, Observation } from "./types";

const instruments = [
  { id: "us10y", label: "US 10 ans" },
  { id: "us1y", label: "US 1 an" },
  { id: "dxy", label: "ETF Indice dollar (DXY)" },
  { id: "brent", label: "Brent" },
  { id: "ndx", label: "Nasdaq 100" },
];

describe("instrumentDepuisLibelle", () => {
  it("lit le libellé du catalogue mot pour mot", () => {
    expect(instrumentDepuisLibelle("US 10 ans", instruments)).toBe("us10y");
    expect(instrumentDepuisLibelle("Nasdaq 100", instruments)).toBe("ndx");
    expect(instrumentDepuisLibelle("Indice dollar (DXY)", instruments)).toBe("dxy");
  });
  it("ne rattache pas un libellé qu'il ne reconnaît pas", () => {
    expect(instrumentDepuisLibelle("Prévision Brent 2027 (Goldman)", [{ id: "x", label: "Or" }])).toBeNull();
    expect(instrumentDepuisLibelle("Inflation US", instruments)).toBeNull();
  });
  it("retrouve le Brent physique quand la note écrit « Brent »", () => {
    expect(instrumentDepuisLibelle("Brent", [{ id: "brent", label: "Brent physique" }])).toBe("brent");
  });
});

describe("dateDansLaValeur", () => {
  it("lit « au 15/10 » dans la valeur écrite", () => {
    expect(dateDansLaValeur("5,1 % au 15/10", "2026-10-17")).toBe("2026-10-15");
  });
  it("se replie sur la date de la note", () => {
    expect(dateDansLaValeur("5,1 %", "2026-10-17")).toBe("2026-10-17");
  });
  it("une note de janvier qui cite décembre parle de l'année précédente", () => {
    expect(dateDansLaValeur("3 % au 30/12", "2027-01-09")).toBe("2026-12-30");
  });
});

describe("libelleDate", () => {
  it("écrit « le 14/10 » pour une série quotidienne", () => {
    expect(libelleDate("2026-10-14", "business-daily")).toBe("le 14/10");
  });
  it("écrit la période d'une série trimestrielle", () => {
    expect(libelleDate("2026-04-01", "quarterly")).toBe("T2 2026");
  });
});

const obs = (date: string, value: number, fetchedAt = "2026-10-19T04:45:00Z"): Observation => ({
  instrumentId: "x",
  date,
  value,
  source: "FRED",
  fetchedAt,
});

describe("construireChiffre", () => {
  const us10y = { id: "us10y", label: "US 10 ans", assetClass: "rates", unit: "percent" } as Instrument;
  const maintenant = new Date("2026-10-19T08:00:00Z");

  it("donne la dernière valeur, sa variation en bps et l'écart à la note", () => {
    const c = construireChiffre({
      chiffre: { label: "US 10 ans", value: "5,1 % au 15/10" },
      note: { date: "2026-10-17" },
      cible: { kind: "instrument", id: "us10y" },
      instrument: us10y,
      observations: [obs("2026-10-15", 5.1), obs("2026-10-16", 5.06), obs("2026-10-19", 5.08)],
      source: "FRED · DGS10",
      maintenant,
    });
    expect(c.href).toBe("/marches/rates/us10y");
    expect(c.actuel).toMatchObject({ valeur: "5,08 %", perime: false });
    expect(c.actuel?.variation).toEqual({ texte: "+2 bps", sens: "up" });
    expect(c.dansLaNote).toEqual({ valeur: "5,10 %", date: "2026-10-15" });
    expect(c.ecart).toEqual({ texte: "-2 bps", sens: "down" });
  });

  it("marque périmée une valeur dont la copie a vieilli", () => {
    const c = construireChiffre({
      chiffre: { label: "US 10 ans", value: "5,1 %" },
      note: { date: "2026-10-17" },
      cible: { kind: "instrument", id: "us10y" },
      instrument: us10y,
      observations: [obs("2026-10-05", 5.0, "2026-10-06T04:00:00Z"), obs("2026-10-06", 5.1, "2026-10-06T04:00:00Z")],
      source: null,
      maintenant,
    });
    expect(c.actuel?.perime).toBe(true);
  });

  it("écrit la fourchette d'un taux directeur et dit qu'il n'a pas bougé", () => {
    const indicateur = { id: "us-policy-rate", zone: "us", unit: "percent", frequency: "business-daily" } as MacroIndicator;
    const c = construireChiffre({
      chiffre: { label: "Taux directeur Fed (fourchette)", value: "3,75-4,00 % au 16/10" },
      note: { date: "2026-10-17" },
      cible: { kind: "macro", id: "us-policy-rate" },
      indicateur,
      observations: [obs("2026-09-10", 4.25), obs("2026-09-18", 4.0), obs("2026-10-18", 4.0)],
      borneBasse: [obs("2026-09-18", 3.75), obs("2026-10-18", 3.75)],
      source: null,
      maintenant,
    });
    expect(c.actuel?.valeur).toBe("3,75-4,00 %");
    expect(c.actuel?.variation).toBeNull();
    expect(c.actuel?.mention).toMatch(/^inchangé depuis sept/);
  });

  it("reste le texte de la note quand rien n'est rattaché", () => {
    const c = construireChiffre({
      chiffre: { label: "Prévision Goldman", value: "80 $" },
      note: { date: "2026-10-17" },
      cible: null,
      observations: [],
      source: null,
    });
    expect(c.actuel).toBeNull();
    expect(c.href).toBeNull();
    expect(c.valeurNote).toBe("80 $");
  });
});

describe("socleManquant (J7.19)", () => {
  const catalogue = { indicateurExiste: () => true, instruments };

  it("ajoute le taux BCE et l'inflation US, en « non suivi » tant que rien n'est collecté", () => {
    const ajoutes = socleManquant([], SOCLE_CHIFFRES_CLES, { instrumentRefs: [] }, catalogue);
    expect(ajoutes.map((c) => c.indicatorId)).toEqual(["ez-policy-rate", "us-cpi"]);
    expect(ajoutes.every((c) => c.value === "non suivi")).toBe(true);
    const c = construireChiffre({
      chiffre: ajoutes[0],
      note: { date: "2026-10-17" },
      cible: { kind: "macro", id: "ez-policy-rate" },
      indicateur: { id: "ez-policy-rate", zone: "ez", unit: "percent", frequency: "business-daily" } as MacroIndicator,
      observations: [],
      source: null,
    });
    expect(c.actuel).toBeNull();
    expect(c.valeurNote).toBe("non suivi");
  });

  it("ne double pas un chiffre que la note porte déjà", () => {
    const ajoutes = socleManquant(
      [{ label: "BCE — facilité de dépôt", value: "2,00 %", indicatorId: "ez-policy-rate" }],
      SOCLE_CHIFFRES_CLES,
      { instrumentRefs: [] },
      catalogue,
    );
    expect(ajoutes.map((c) => c.indicatorId)).toEqual(["us-cpi"]);
  });

  it("ne porte aucun MSCI World : seul l'ACWI est collecté", () => {
    expect(JSON.stringify(SOCLE_CHIFFRES_CLES).toLowerCase()).not.toContain("world");
  });
});
