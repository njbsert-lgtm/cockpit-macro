import { describe, expect, it } from "vitest";
import type { Outlook } from "@/lib/types";
import { millesimeChoisi, millesimesDisponibles } from "./outlook-millesime";

const o = (millesime: number) => ({ millesime }) as Outlook;

describe("millésime des outlooks", () => {
  const deux = [o(2026), o(2027), o(2026)];
  it("liste les millésimes, le plus récent d'abord", () => {
    expect(millesimesDisponibles(deux)).toEqual([2027, 2026]);
  });
  it("retient le plus récent par défaut", () => {
    expect(millesimeChoisi(deux, undefined)).toBe(2027);
  });
  it("suit l'URL quand le millésime existe", () => {
    expect(millesimeChoisi(deux, "2026")).toBe(2026);
  });
  it("retombe sur le défaut pour une valeur inconnue ou mal formée", () => {
    expect(millesimeChoisi(deux, "2031")).toBe(2027);
    expect(millesimeChoisi(deux, "abc")).toBe(2027);
    expect(millesimeChoisi(deux, ["2026", "2027"])).toBe(2026);
  });
  it("ne propose rien sans outlook", () => {
    expect(millesimeChoisi([], "2026")).toBeNull();
  });
});
