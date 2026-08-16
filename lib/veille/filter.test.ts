import { describe, expect, it } from "vitest";
import { applyKeywordGate, rankAndCap, stableId, toVeilleItem, type FilteredVeilleCandidate } from "./filter";
import type { RawVeilleCandidate } from "./filter";

function raw(overrides: Partial<RawVeilleCandidate> = {}): RawVeilleCandidate {
  return {
    title: "Un titre neutre sans mot-clé",
    url: "https://example.org/a",
    source: "Test",
    sourceAuthority: 1,
    publishedAt: "2026-08-16T00:00:00Z",
    zones: ["global"],
    ...overrides,
  };
}

describe("applyKeywordGate", () => {
  it("écarte un candidat qui ne cite ni driver ni canal", () => {
    expect(applyKeywordGate(raw())).toBeNull();
  });

  it("retient un candidat qui cite un mot-clé de driver, dans le titre", () => {
    const gated = applyKeywordGate(raw({ title: "Ormuz : un pétrolier attaqué" }));
    expect(gated?.driverRefs).toEqual(["iran"]);
    expect(gated?.channels).toEqual([]);
  });

  it("retient un candidat qui ne cite qu'un canal de transmission, sans driver", () => {
    const gated = applyKeywordGate(raw({ title: "Le positionnement CFTC vire net short" }));
    expect(gated?.driverRefs).toEqual([]);
    expect(gated?.channels).toEqual(["positionnement"]);
  });

  it("fusionne le driverRefs pré-attaché par le collecteur avec ceux détectés dans le titre", () => {
    const gated = applyKeywordGate(
      raw({ title: "Nvidia — dépôt 8-K du 2026-08-15", driverRefs: ["ai"] }),
    );
    expect(gated?.driverRefs).toEqual(["ai"]);
  });

  it("ne compte chaque driver qu'une fois même cité plusieurs fois", () => {
    const gated = applyKeywordGate(
      raw({ title: "Powell et la Fed : la Fed maintient son cap", driverRefs: ["rates"] }),
    );
    expect(gated?.driverRefs).toEqual(["rates"]);
  });
});

describe("rankAndCap", () => {
  const base: FilteredVeilleCandidate = {
    ...raw(),
    driverRefs: ["rates"],
    channels: [],
    relevance: 1,
  };

  it("classe par autorité de source d'abord", () => {
    const low = { ...base, url: "low", sourceAuthority: 1, relevance: 5 };
    const high = { ...base, url: "high", sourceAuthority: 3, relevance: 1 };
    const ranked = rankAndCap([low, high], 10);
    expect(ranked.map((c) => c.url)).toEqual(["high", "low"]);
  });

  it("départage par correspondance thématique à autorité égale", () => {
    const lessRelevant = { ...base, url: "less", relevance: 1 };
    const moreRelevant = { ...base, url: "more", relevance: 3 };
    const ranked = rankAndCap([lessRelevant, moreRelevant], 10);
    expect(ranked.map((c) => c.url)).toEqual(["more", "less"]);
  });

  it("ne retient rien quand le nombre de places restantes est nul ou négatif", () => {
    expect(rankAndCap([base], 0)).toHaveLength(0);
    expect(rankAndCap([base], -5)).toHaveLength(0);
  });
});

describe("stableId", () => {
  it("est stable pour une même paire (source, url)", () => {
    expect(stableId("Fed", "https://fed.gov/x")).toBe(stableId("Fed", "https://fed.gov/x"));
  });

  it("diffère si l'url change", () => {
    expect(stableId("Fed", "https://fed.gov/x")).not.toBe(stableId("Fed", "https://fed.gov/y"));
  });
});

describe("toVeilleItem", () => {
  it("initialise un item survivant à la passe 1 comme nouveau signal, sans note ni bloc", () => {
    const gated = applyKeywordGate(raw({ title: "La BCE relève son taux directeur" }));
    const item = toVeilleItem(gated!);

    expect(item.status).toBe("nouveau");
    expect(item.isSignal).toBe(true);
    expect(item.attachedToBlock).toBeNull();
    expect(item.draftNoteSlug).toBeNull();
    expect(item.id).toBe(stableId("Test", "https://example.org/a"));
  });
});
