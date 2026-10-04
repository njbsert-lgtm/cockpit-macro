import { describe, expect, it } from "vitest";
import { buildBisUrl, parseBisResponse, parseCsv, periodToIsoDate } from "./bis";
import type { BisMapping } from "@/config/bis-series";

const MENSUEL: BisMapping = {
  target: { kind: "macro", id: "cn-policy-rate" },
  flow: "WS_CBPOL",
  version: "1.0",
  key: "M.CN",
  areaColumn: "REF_AREA",
  area: "CN",
  frequency: "monthly",
  zone: "cn",
  plausible: { min: 0, max: 15 },
  enabled: true,
};

const TRIMESTRIEL: BisMapping = {
  target: { kind: "macro", id: "jp-debt-gdp" },
  flow: "WS_TC",
  version: "2.0",
  key: "Q.JP.G.A.N.770.A",
  areaColumn: "BORROWERS_CTY",
  area: "JP",
  frequency: "quarterly",
  zone: "jp",
  plausible: { min: 50, max: 400 },
  enabled: true,
};

const NOW = new Date("2026-10-04T06:00:00Z");

describe("buildBisUrl", () => {
  it("demande du CSV — l'API v2 refuse jsondata — avec une période de début mensuelle", () => {
    const url = new URL(buildBisUrl(MENSUEL, NOW));
    expect(url.origin + url.pathname).toBe("https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/M.CN");
    expect(url.searchParams.get("format")).toBe("csv");
    expect(url.searchParams.get("startPeriod")).toBe("2023-06");
  });

  it("exprime la période de début d'une série trimestrielle en trimestre", () => {
    const url = new URL(buildBisUrl(TRIMESTRIEL, NOW));
    expect(url.pathname.endsWith("/WS_TC/2.0/Q.JP.G.A.N.770.A")).toBe(true);
    expect(url.searchParams.get("startPeriod")).toBe("2022-Q4");
  });
});

describe("parseCsv", () => {
  it("garde les virgules, guillemets doublés et sauts de ligne d'un champ entre guillemets", () => {
    const rows = parseCsv('a,b,c\n1,"x, ""y""\nz",3\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", 'x, "y"\nz', "3"],
    ]);
  });

  it("accepte les fins de ligne Windows et ignore les lignes vides", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("periodToIsoDate", () => {
  it("date au premier jour de la période, comme Eurostat et l'ONS", () => {
    expect(periodToIsoDate("2026-06")).toBe("2026-06-01");
    expect(periodToIsoDate("2026-Q1")).toBe("2026-01-01");
    expect(periodToIsoDate("2025-Q4")).toBe("2025-10-01");
  });

  it("refuse ce qu'il ne reconnaît pas plutôt que de le deviner", () => {
    expect(periodToIsoDate("2026")).toBeNull();
    expect(periodToIsoDate("2026-13")).toBeNull();
    expect(periodToIsoDate("2026-M06")).toBeNull();
  });
});

const ENTETE = "FREQ,REF_AREA,TITLE,TIME_PERIOD,OBS_VALUE,OBS_STATUS";

describe("parseBisResponse", () => {
  it("lit une réponse conforme, triée par date", () => {
    const csv = [
      ENTETE,
      'M,CN," Central bank, policy rates",2026-08,3,A',
      'M,CN," Central bank, policy rates",2026-07,3,A',
    ].join("\n");
    expect(parseBisResponse(MENSUEL, csv)).toEqual({
      ok: true,
      points: [
        { date: "2026-07-01", value: 3 },
        { date: "2026-08-01", value: 3 },
      ],
    });
  });

  it("lit une série trimestrielle sur sa colonne de pays propre", () => {
    const csv = "FREQ,BORROWERS_CTY,TIME_PERIOD,OBS_VALUE\nQ,JP,2026-Q1,193.6\n";
    expect(parseBisResponse(TRIMESTRIEL, csv)).toEqual({
      ok: true,
      points: [{ date: "2026-01-01", value: 193.6 }],
    });
  });

  it("écarte une valeur manquante sans la remplacer par zéro", () => {
    const csv = [ENTETE, "M,CN,t,2026-07,,A", "M,CN,t,2026-08,3,A"].join("\n");
    expect(parseBisResponse(MENSUEL, csv)).toEqual({
      ok: true,
      points: [{ date: "2026-08-01", value: 3 }],
    });
  });

  it("traite un en-tête seul comme un succès sans point", () => {
    expect(parseBisResponse(MENSUEL, `${ENTETE}\n`)).toEqual({ ok: true, points: [] });
  });

  it("rejette une réponse qui n'est pas du CSV, en citant son début", () => {
    const xml = '<?xml version="1.0" ?><message:Error><com:Text>Unsupported format</com:Text></message:Error>';
    const res = parseBisResponse(MENSUEL, xml);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Unsupported format");
  });

  it("rejette une réponse vide", () => {
    expect(parseBisResponse(MENSUEL, "")).toMatchObject({ ok: false });
  });

  it("rejette un autre pays que celui attendu — clé SDMX erronée", () => {
    const res = parseBisResponse(MENSUEL, [ENTETE, "M,IN,t,2026-08,5.25,A"].join("\n"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("« IN » dans la réponse, « CN » attendu");
  });

  it("rejette toute la réponse sur une valeur hors bornes, sans écrire les autres", () => {
    const res = parseBisResponse(MENSUEL, [ENTETE, "M,CN,t,2026-07,3,A", "M,CN,t,2026-08,300,A"].join("\n"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("hors bornes");
  });

  it("ignore une période qu'il ne reconnaît pas", () => {
    const csv = [ENTETE, "M,CN,t,2026-M07,3,A", "M,CN,t,2026-08,3,A"].join("\n");
    expect(parseBisResponse(MENSUEL, csv)).toEqual({
      ok: true,
      points: [{ date: "2026-08-01", value: 3 }],
    });
  });
});
