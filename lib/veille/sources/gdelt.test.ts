import { describe, expect, it } from "vitest";
import { buildGdeltUrl, GDELT_SOURCE, parseGdeltResponse } from "./gdelt";
import type { GdeltQuery } from "@/config/veille-taxonomy";

const QUERY: GdeltQuery = {
  theme: "conflict",
  country: { fips: "IR", zone: "global", label: "Iran" },
};

describe("buildGdeltUrl", () => {
  it("croise le thème et le pays dans la requête", () => {
    const url = buildGdeltUrl(QUERY);
    expect(url).toContain("sourcecountry%3AIR");
    expect(url).toContain("format=json");
  });
});

describe("parseGdeltResponse", () => {
  it("convertit seendate (AAAAMMJJTHHMMSSZ) en ISO 8601", () => {
    const candidates = parseGdeltResponse(QUERY, {
      articles: [{ url: "https://example.org/a", title: "Tanker attacked near Hormuz", seendate: "20260815T120000Z" }],
    });
    expect(candidates).toEqual([
      {
        title: "Tanker attacked near Hormuz",
        url: "https://example.org/a",
        source: GDELT_SOURCE,
        sourceAuthority: 1,
        publishedAt: "2026-08-15T12:00:00Z",
        zones: ["global"],
      },
    ]);
  });

  it("écarte un article dont seendate ne respecte pas le format attendu", () => {
    const candidates = parseGdeltResponse(QUERY, {
      articles: [{ url: "https://example.org/a", title: "X", seendate: "invalide" }],
    });
    expect(candidates).toHaveLength(0);
  });

  it("renvoie un tableau vide sur une réponse malformée plutôt que de lever", () => {
    expect(parseGdeltResponse(QUERY, { rien: true })).toEqual([]);
    expect(parseGdeltResponse(QUERY, null)).toEqual([]);
  });

  it("traite l'absence de champ articles comme aucun résultat, pas une erreur", () => {
    expect(parseGdeltResponse(QUERY, {})).toEqual([]);
  });
});
