import { describe, expect, it } from "vitest";
import { buildBoeUrl, parseBoeCsv } from "./boe";
import type { BoeMapping } from "@/config/boe-series";

const MAPPING: BoeMapping = {
  target: { kind: "macro", id: "uk-policy-rate" },
  seriesCode: "IUDBEDR",
  zone: "uk",
  plausible: { min: -2, max: 20 },
  enabled: true,
};

describe("buildBoeUrl", () => {
  it("construit l'URL du CSV avec le bon format de date et le bon code de série", () => {
    const url = buildBoeUrl(MAPPING, new Date("2026-09-28T06:00:00Z"));
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp",
    );
    expect(parsed.searchParams.get("SeriesCodes")).toBe("IUDBEDR");
    expect(parsed.searchParams.get("Dateto")).toBe("28/Sep/2026");
    expect(parsed.searchParams.get("csv.x")).toBe("yes");
    expect(parsed.searchParams.get("UsingCodes")).toBe("Y");
  });
});

describe("parseBoeCsv", () => {
  it("lit un CSV conforme, trié par date croissante", () => {
    const body = "DATE,IUDBEDR\n01 Sep 2026,3.75\n02 Sep 2026,3.75\n07 Sep 2026,4.00\n";
    const result = parseBoeCsv(MAPPING, body);
    expect(result).toEqual({
      ok: true,
      points: [
        { date: "2026-09-01", value: 3.75 },
        { date: "2026-09-02", value: 3.75 },
        { date: "2026-09-07", value: 4.0 },
      ],
    });
  });

  it("un taux directeur en palier ne produit qu'une valeur répétée, jamais interpolée", () => {
    const body = "DATE,IUDBEDR\n01 Sep 2026,3.75\n02 Sep 2026,3.75\n03 Sep 2026,3.75\n";
    const result = parseBoeCsv(MAPPING, body);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.points.map((p) => p.value)).toEqual([3.75, 3.75, 3.75]);
  });

  it("rejette toute la réponse si une valeur dépasse les bornes de plausibilité", () => {
    const body = "DATE,IUDBEDR\n01 Sep 2026,3.75\n02 Sep 2026,375\n";
    const result = parseBoeCsv(MAPPING, body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("hors bornes");
  });

  it("rejette une réponse dont l'en-tête n'est pas celui attendu", () => {
    const result = parseBoeCsv(MAPPING, "This API has been decommissioned");
    expect(result.ok).toBe(false);
  });

  it("ignore une ligne malformée sans faire échouer le reste de la série", () => {
    const body = "DATE,IUDBEDR\n01 Sep 2026,3.75\nligne cassée\n02 Sep 2026,3.75\n";
    const result = parseBoeCsv(MAPPING, body);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.points).toHaveLength(2);
  });

  it("traite un CSV vide (hors en-tête) comme un succès sans points", () => {
    const result = parseBoeCsv(MAPPING, "DATE,IUDBEDR\n");
    expect(result).toEqual({ ok: true, points: [] });
  });
});
