import { describe, expect, it } from "vitest";
import { buildBojUrl, parseBojResponse } from "./boj";
import type { BojMapping } from "@/config/boj-series";

const MAPPING: BojMapping = {
  target: { kind: "macro", id: "jp-policy-rate" },
  db: "FM01",
  code: "STRDCLUCON",
  zone: "jp",
  plausible: { min: -2, max: 15 },
  enabled: true,
};

describe("buildBojUrl", () => {
  it("construit l'URL avec startDate/endDate au format AAAAMM, jamais une date complète", () => {
    const url = buildBojUrl(MAPPING, new Date("2026-09-28T06:00:00Z"));
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://www.stat-search.boj.or.jp/api/v1/getDataCode");
    expect(parsed.searchParams.get("db")).toBe("FM01");
    expect(parsed.searchParams.get("code")).toBe("STRDCLUCON");
    expect(parsed.searchParams.get("endDate")).toBe("202609");
    expect(parsed.searchParams.get("endDate")).toMatch(/^\d{6}$/);
    expect(parsed.searchParams.get("startDate")).toMatch(/^\d{6}$/);
  });
});

describe("parseBojResponse", () => {
  it("lit une réponse conforme, en ignorant les jours sans marché (null)", () => {
    const payload = {
      RESULTSET: [
        {
          SERIES_CODE: "STRDCLUCON",
          VALUES: {
            SURVEY_DATES: [20260901, 20260902, 20260903],
            VALUES: [null, 0.977, 0.978],
          },
        },
      ],
    };
    const result = parseBojResponse(MAPPING, payload);
    expect(result).toEqual({
      ok: true,
      points: [
        { date: "2026-09-02", value: 0.977 },
        { date: "2026-09-03", value: 0.978 },
      ],
    });
  });

  it("reconnaît une erreur applicative BoJ (STATUS 400) plutôt que de tenter le schéma de succès", () => {
    const payload = {
      STATUS: 400,
      MESSAGEID: "M181008E",
      MESSAGE: "指定した開始期が正しくありません。",
      DATE: "2026-09-29T02:52:09.744+09:00",
    };
    const result = parseBojResponse(MAPPING, payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("400");
  });

  it("rejette toute la réponse si une valeur dépasse les bornes de plausibilité", () => {
    const payload = {
      RESULTSET: [
        {
          SERIES_CODE: "STRDCLUCON",
          VALUES: { SURVEY_DATES: [20260901], VALUES: [97.7] },
        },
      ],
    };
    const result = parseBojResponse(MAPPING, payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("hors bornes");
  });

  it("échoue si le code demandé est absent du RESULTSET", () => {
    const payload = { RESULTSET: [{ SERIES_CODE: "AUTRE", VALUES: { SURVEY_DATES: [], VALUES: [] } }] };
    const result = parseBojResponse(MAPPING, payload);
    expect(result.ok).toBe(false);
  });

  it("échoue sur une réponse qui ne correspond à aucun des deux schémas", () => {
    const result = parseBojResponse(MAPPING, { inattendu: true });
    expect(result.ok).toBe(false);
  });
});
