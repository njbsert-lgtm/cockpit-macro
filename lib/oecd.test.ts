import { describe, expect, it } from "vitest";
import { buildOecdUrl, parseOecdResponse } from "./oecd";
import type { OecdMapping } from "@/config/oecd-series";

const CHINE: OecdMapping = {
  target: { kind: "macro", id: "cn-gdp" },
  dataflow: "DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_G20",
  agency: "OECD.SDD.NAD",
  version: "1.1",
  key: "Q.Y.CHN.S1.S1.B1GQ._Z._Z._Z.PC.L.GY.T0102",
  area: "CHN",
  transformation: "GY",
  zone: "cn",
  plausible: { min: -20, max: 30 },
  enabled: true,
};

const ENTETE =
  "DATAFLOW,FREQ,ADJUSTMENT,REF_AREA,SECTOR,COUNTERPART_SECTOR,TRANSACTION,INSTR_ASSET,ACTIVITY,EXPENDITURE,UNIT_MEASURE,PRICE_BASE,TRANSFORMATION,TABLE_IDENTIFIER,TIME_PERIOD,OBS_VALUE";
const ligne = (area: string, transformation: string, periode: string, valeur: string) =>
  `OECD.SDD.NAD:X(1.1),Q,Y,${area},S1,S1,B1GQ,_Z,_Z,_Z,PC,L,${transformation},T0102,${periode},${valeur}`;

describe("buildOecdUrl", () => {
  it("désigne le flux par agence, identifiant et version, avec la clé complète sans joker", () => {
    const url = new URL(buildOecdUrl(CHINE));
    expect(url.origin + url.pathname).toBe(
      "https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_G20,1.1/Q.Y.CHN.S1.S1.B1GQ._Z._Z._Z.PC.L.GY.T0102",
    );
    expect(url.searchParams.get("format")).toBe("csv");
    expect(url.searchParams.get("lastNObservations")).toBe("16");
  });

  it("porte treize dimensions, le pays en troisième : un code mal placé a déjà rendu des réponses vides trompeuses", () => {
    const dims = CHINE.key.split(".");
    expect(dims).toHaveLength(13);
    expect(dims[2]).toBe("CHN"); // REF_AREA, après FREQ et ADJUSTMENT
  });
});

describe("parseOecdResponse", () => {
  it("lit les trimestres, arrondit les décimales de la source à deux, trie par date", () => {
    const csv = [
      ENTETE,
      ligne("CHN", "GY", "2026-Q2", "4.3"),
      ligne("CHN", "GY", "2026-Q1", "5.0012345"),
    ].join("\n");
    expect(parseOecdResponse(CHINE, csv)).toEqual({
      ok: true,
      points: [
        { date: "2026-01-01", value: 5 },
        { date: "2026-04-01", value: 4.3 },
      ],
    });
  });

  it("nomme NoResultsFound : c'est une clé qui ne désigne rien, pas une donnée absente", () => {
    const res = parseOecdResponse(CHINE, "NoResultsFound");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("treize dimensions");
  });

  it("écarte une valeur manquante sans la remplacer par zéro", () => {
    const csv = [ENTETE, ligne("CHN", "GY", "2026-Q1", ""), ligne("CHN", "GY", "2026-Q2", "4.3")].join("\n");
    expect(parseOecdResponse(CHINE, csv)).toEqual({
      ok: true,
      points: [{ date: "2026-04-01", value: 4.3 }],
    });
  });

  it("traite un en-tête seul comme un succès sans point", () => {
    expect(parseOecdResponse(CHINE, `${ENTETE}\n`)).toEqual({ ok: true, points: [] });
  });

  it("rejette un autre pays que celui attendu", () => {
    const res = parseOecdResponse(CHINE, [ENTETE, ligne("JPN", "GY", "2026-Q2", "0.7")].join("\n"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("« JPN » dans la réponse, « CHN » attendu");
  });

  it("rejette une croissance sur trimestre : ce n'est pas la base de comparaison d'Eurostat", () => {
    const res = parseOecdResponse(CHINE, [ENTETE, ligne("CHN", "G1", "2026-Q2", "0.9")].join("\n"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("transformation « G1 »");
  });

  it("rejette toute la réponse sur une valeur hors bornes", () => {
    const csv = [ENTETE, ligne("CHN", "GY", "2026-Q1", "5"), ligne("CHN", "GY", "2026-Q2", "400")].join("\n");
    const res = parseOecdResponse(CHINE, csv);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("hors bornes");
  });

  it("rejette une réponse qui n'est pas du CSV, en citant son début", () => {
    const res = parseOecdResponse(CHINE, "<html>Service unavailable</html>");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Service unavailable");
  });
});
