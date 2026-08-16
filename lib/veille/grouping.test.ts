import { describe, expect, it } from "vitest";
import { groupByDay, isCollapsedByDefault } from "./grouping";
import type { VeilleItem } from "@/lib/types";

function item(overrides: Partial<VeilleItem> = {}): VeilleItem {
  return {
    id: "a",
    title: "Titre",
    url: "https://example.org/a",
    source: "Test",
    publishedAt: "2026-08-16T10:00:00Z",
    zones: ["global"],
    driverRefs: [],
    channels: [],
    isSignal: true,
    status: "nouveau",
    attachedToBlock: null,
    draftNoteSlug: null,
    ...overrides,
  };
}

describe("groupByDay", () => {
  it("groupe par date de publication (UTC), du plus récent au plus ancien", () => {
    const groups = groupByDay([
      item({ id: "a", publishedAt: "2026-08-14T08:00:00Z" }),
      item({ id: "b", publishedAt: "2026-08-16T22:00:00Z" }),
      item({ id: "c", publishedAt: "2026-08-16T09:00:00Z" }),
    ]);

    expect(groups.map((g) => g.date)).toEqual(["2026-08-16", "2026-08-14"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("renvoie un tableau vide pour une liste vide", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("isCollapsedByDefault", () => {
  const now = new Date("2026-08-16T12:00:00Z");

  it("ne replie pas un jour à trois jours ou moins", () => {
    expect(isCollapsedByDefault("2026-08-16", now)).toBe(false);
    expect(isCollapsedByDefault("2026-08-13", now)).toBe(false);
  });

  it("replie un jour de plus de trois jours", () => {
    expect(isCollapsedByDefault("2026-08-12", now)).toBe(true);
  });
});
