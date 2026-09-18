import { describe, expect, it } from "vitest";
import { buildEstatUrl, parseEstatResponse } from "./estat";
import type { EstatMapping } from "@/config/estat-series";

const cpi: EstatMapping = {
  target: { kind: "macro", id: "jp-cpi" },
  statsDataId: "0004052037",
  filters: { tab: "3", cat01: "0001", area: "00000" },
  timeScheme: "time",
  cadence: "monthly",
  zone: "jp",
  plausible: { min: -5, max: 25 },
  expect: {},
  enabled: true,
};

const wages: EstatMapping = {
  target: { kind: "macro", id: "jp-wages" },
  statsDataId: "0003138222",
  filters: { tab: "3062", cat02: "TL", cat03: "T", cat04: "00", area: "00000" },
  timeScheme: "cat01Month",
  cadence: "monthly",
  zone: "jp",
  plausible: { min: -15, max: 15 },
  expect: {},
  enabled: true,
};

function ok(value: unknown) {
  return { GET_STATS_DATA: { RESULT: { STATUS: 0 }, STATISTICAL_DATA: { DATA_INF: { VALUE: value } } } };
}

describe("buildEstatUrl", () => {
  it("sérialise appId, statsDataId, metaGetFlg=N et les dimensions fixées en paramètres cd*", () => {
    const url = new URL(buildEstatUrl(cpi, "APPID", new Date("2026-09-18T00:00:00Z")));
    expect(url.origin + url.pathname).toBe("https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData");
    expect(url.searchParams.get("appId")).toBe("APPID");
    expect(url.searchParams.get("statsDataId")).toBe("0004052037");
    expect(url.searchParams.get("metaGetFlg")).toBe("N");
    expect(url.searchParams.get("cdTab")).toBe("3");
    expect(url.searchParams.get("cdCat01")).toBe("0001");
    expect(url.searchParams.get("cdArea")).toBe("00000");
  });

  it("ne fixe jamais cat01 pour une série cat01Month : c'est la dimension qui porte le mois", () => {
    const url = new URL(buildEstatUrl(wages, "APPID", new Date("2026-09-18T00:00:00Z")));
    expect(url.searchParams.has("cdCat01")).toBe(false);
    expect(url.searchParams.get("cdTab")).toBe("3062");
  });

  it("calcule cdTimeFrom en arrière depuis aujourd'hui, pour le schéma « time » seulement", () => {
    const urlTime = new URL(buildEstatUrl(cpi, "APPID", new Date("2026-09-18T00:00:00Z")));
    expect(urlTime.searchParams.get("cdTimeFrom")).toBe("2020000101");
  });

  it("n'envoie jamais cdTimeFrom pour une série cat01Month : la table le rejette (STATUS 1), vérifié par appel réel", () => {
    const urlCat01 = new URL(buildEstatUrl(wages, "APPID", new Date("2026-09-18T00:00:00Z")));
    expect(urlCat01.searchParams.has("cdTimeFrom")).toBe(false);
  });
});

describe("parseEstatResponse — schéma « time » (AAAA00MMMM)", () => {
  it("lit une valeur mensuelle, au premier du mois", () => {
    const r = parseEstatResponse(
      cpi,
      ok([{ "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000808", "$": "3.9" }]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-08-01", value: 3.9 }]);
  });

  it("ignore une année fiscale (AAAA100000), qui ne correspond pas au motif mensuel", () => {
    const r = parseEstatResponse(
      cpi,
      ok([
        { "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2025100000", "$": "999" },
        { "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000707", "$": "3.8" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-07-01", value: 3.8 }]);
  });

  it("accepte une réponse à une seule ligne servie comme objet nu plutôt que tableau", () => {
    const r = parseEstatResponse(
      cpi,
      ok({ "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000808", "$": "3.9" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-08-01", value: 3.9 }]);
  });

  it("trie du plus ancien au plus récent même si la source les renvoie dans le désordre", () => {
    const r = parseEstatResponse(
      cpi,
      ok([
        { "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000808", "$": "3.9" },
        { "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000707", "$": "3.8" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points.map((p) => p.date)).toEqual(["2026-07-01", "2026-08-01"]);
  });
});

describe("parseEstatResponse — schéma « cat01Month » (année seule + mois en cat01)", () => {
  it("compose la date depuis @time (année) et @cat01 (mois)", () => {
    const r = parseEstatResponse(
      wages,
      ok([
        {
          "@tab": "3062",
          "@cat01": "101",
          "@cat02": "TL",
          "@cat03": "T",
          "@cat04": "00",
          "@area": "00000",
          "@time": "2026000000",
          "$": "-1.3",
        },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2026-01-01", value: -1.3 }]);
  });

  it("ignore les agrégats trimestriels (cat01 94-97), qui ne désignent aucun mois", () => {
    const r = parseEstatResponse(
      wages,
      ok([
        { "@tab": "3062", "@cat02": "TL", "@cat03": "T", "@cat04": "00", "@area": "00000", "@cat01": "94", "@time": "2026000000", "$": "5" },
        { "@tab": "3062", "@cat02": "TL", "@cat03": "T", "@cat04": "00", "@area": "00000", "@cat01": "112", "@time": "2025000000", "$": "0.4" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([{ date: "2025-12-01", value: 0.4 }]);
  });

  it("ne vérifie jamais cat01 comme dimension fixée : elle porte le mois par construction", () => {
    const r = parseEstatResponse(
      wages,
      ok([
        { "@tab": "3062", "@cat02": "TL", "@cat03": "T", "@cat04": "00", "@area": "00000", "@cat01": "101", "@time": "2026000000", "$": "-1.3" },
        { "@tab": "3062", "@cat02": "TL", "@cat03": "T", "@cat04": "00", "@area": "00000", "@cat01": "102", "@time": "2026000000", "$": "0.5" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toHaveLength(2);
  });
});

describe("parseEstatResponse — garde-fous", () => {
  it("rejette une réponse dont RESULT.STATUS n'est pas nul", () => {
    const r = parseEstatResponse(cpi, {
      GET_STATS_DATA: { RESULT: { STATUS: 100, ERROR_MSG: "パラメータが不正です" } },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("STATUS 100");
    expect(r.error).toContain("パラメータが不正です");
  });

  it("traite une réponse sans DATA_INF comme un succès vide, pas une panne", () => {
    const r = parseEstatResponse(cpi, { GET_STATS_DATA: { RESULT: { STATUS: 0 } } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });

  it("rejette toute la réponse si une dimension fixée ne correspond pas au code demandé", () => {
    const r = parseEstatResponse(
      cpi,
      ok([{ "@tab": "3", "@cat01": "0002", "@area": "00000", "@time": "2026000808", "$": "3.9" }]),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("cat01");
    expect(r.error).toContain("non fixée");
  });

  it("rejette toute la réponse si une valeur dépasse les bornes de plausibilité", () => {
    const r = parseEstatResponse(
      cpi,
      ok([{ "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000808", "$": "9999" }]),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("hors bornes");
  });

  it("écarte une valeur non numérique sans faire échouer toute la réponse", () => {
    const r = parseEstatResponse(
      cpi,
      ok([{ "@tab": "3", "@cat01": "0001", "@area": "00000", "@time": "2026000808", "$": "***" }]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.points).toEqual([]);
  });

  it("rejette une réponse malformée avec un message qui nomme le champ fautif", () => {
    const r = parseEstatResponse(cpi, { GET_STATS_DATA: { RESULT: {} } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("réponse malformée");
  });
});
