import { describe, expect, it } from "vitest";
import { buildImfUrl, parseImfResponse, periodToIsoDate } from "./imf";
import type { ImfMapping } from "@/config/imf-series";

const CHINE: ImfMapping = {
  target: { kind: "macro", id: "cn-cpi" },
  flow: "CPI",
  agency: "IMF.STA",
  version: "5.0.0",
  key: "CHN.CPI._T.YOY_PCH_PA_PT.M",
  country: "CHN",
  transformation: "YOY_PCH_PA_PT",
  zone: "cn",
  plausible: { min: -10, max: 20 },
  enabled: true,
};

function xml(series: string): string {
  return (
    `<?xml version='1.0' encoding='UTF-8'?><message:StructureSpecificData xmlns:message="x">` +
    `<message:DataSet PUBLISHER="IMF" FULL_DESCRIPTION="a &amp; b"><Group INDEX_TYPE="CPI"/>${series}` +
    `</message:DataSet></message:StructureSpecificData>`
  );
}

const SERIE = (obs: string, over = "") =>
  `<Series COUNTRY="CHN" INDEX_TYPE="CPI" COICOP_1999="_T" TYPE_OF_TRANSFORMATION="YOY_PCH_PA_PT" FREQUENCY="M"${over}>${obs}</Series>`;

describe("buildImfUrl", () => {
  it("désigne le dataflow par agence et identifiant, et demande les dernières observations", () => {
    const url = new URL(buildImfUrl(CHINE));
    expect(url.origin + url.pathname).toBe(
      "https://api.imf.org/external/sdmx/2.1/data/IMF.STA,CPI/CHN.CPI._T.YOY_PCH_PA_PT.M",
    );
    expect(url.searchParams.get("lastNObservations")).toBe("40");
  });
});

describe("periodToIsoDate", () => {
  it("lit la période mensuelle IMF « 2026-M06 »", () => {
    expect(periodToIsoDate("2026-M06")).toBe("2026-06-01");
    expect(periodToIsoDate("2026-M12")).toBe("2026-12-01");
  });

  it("refuse les autres formes plutôt que de les deviner", () => {
    expect(periodToIsoDate("2026-06")).toBeNull();
    expect(periodToIsoDate("2026-M13")).toBeNull();
    expect(periodToIsoDate("2026-Q1")).toBeNull();
  });
});

describe("parseImfResponse", () => {
  it("lit les observations et arrondit les décimales de calcul de la source à deux", () => {
    const body = xml(
      SERIE(
        '<Obs TIME_PERIOD="2026-M07" OBS_VALUE="0.5000077355673652" DERIVATION_TYPE="O"/>' +
          '<Obs TIME_PERIOD="2026-M06" OBS_VALUE="1.000065040145302" DERIVATION_TYPE="O"/>',
      ),
    );
    expect(parseImfResponse(CHINE, body)).toEqual({
      ok: true,
      points: [
        { date: "2026-06-01", value: 1 },
        { date: "2026-07-01", value: 0.5 },
      ],
    });
  });

  it("écarte une valeur manquante sans la remplacer par zéro", () => {
    const body = xml(
      SERIE('<Obs TIME_PERIOD="2026-M06" OBS_VALUE=""/><Obs TIME_PERIOD="2026-M07" OBS_VALUE="0.8"/>'),
    );
    expect(parseImfResponse(CHINE, body)).toEqual({
      ok: true,
      points: [{ date: "2026-07-01", value: 0.8 }],
    });
  });

  it("traite un jeu de données sans série comme un succès sans point", () => {
    expect(parseImfResponse(CHINE, xml(""))).toEqual({ ok: true, points: [] });
  });

  it("rejette une réponse qui n'est pas du SDMX, en citant son début", () => {
    const res = parseImfResponse(CHINE, "<html><body>Service unavailable</body></html>");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Service unavailable");
  });

  it("rejette un autre pays que celui attendu", () => {
    const body = xml(SERIE('<Obs TIME_PERIOD="2026-M07" OBS_VALUE="4.4"/>').replace('COUNTRY="CHN"', 'COUNTRY="IND"'));
    const res = parseImfResponse(CHINE, body);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("« IND » dans la réponse, « CHN » attendu");
  });

  it("rejette une série en niveau d'indice : ce serait la série entière qui est fausse", () => {
    const body = xml(
      SERIE('<Obs TIME_PERIOD="2026-M07" OBS_VALUE="101.2"/>').replace(
        'TYPE_OF_TRANSFORMATION="YOY_PCH_PA_PT"',
        'TYPE_OF_TRANSFORMATION="IX"',
      ),
    );
    const res = parseImfResponse(CHINE, body);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("transformation « IX »");
  });

  it("rejette toute la réponse sur une valeur hors bornes", () => {
    const body = xml(
      SERIE('<Obs TIME_PERIOD="2026-M06" OBS_VALUE="1"/><Obs TIME_PERIOD="2026-M07" OBS_VALUE="400"/>'),
    );
    const res = parseImfResponse(CHINE, body);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("hors bornes");
  });

  it("ignore une période qu'il ne reconnaît pas", () => {
    const body = xml(
      SERIE('<Obs TIME_PERIOD="2026-Q2" OBS_VALUE="9"/><Obs TIME_PERIOD="2026-M07" OBS_VALUE="0.8"/>'),
    );
    expect(parseImfResponse(CHINE, body)).toEqual({
      ok: true,
      points: [{ date: "2026-07-01", value: 0.8 }],
    });
  });
});
