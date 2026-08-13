import { describe, expect, it } from "vitest";
import { zoneAncestors, zoneMatches } from "./zones";

describe("zoneAncestors", () => {
  it("remonte fr jusqu'à global en passant par ez", () => {
    expect(zoneAncestors("fr")).toEqual(["fr", "ez", "global"]);
  });

  it("remonte cn jusqu'à global en passant par em", () => {
    expect(zoneAncestors("cn")).toEqual(["cn", "em", "global"]);
  });

  it("s'arrête à elle-même pour global", () => {
    expect(zoneAncestors("global")).toEqual(["global"]);
  });
});

describe("zoneMatches", () => {
  it("un contenu taggé fr est visible en sélectionnant fr", () => {
    expect(zoneMatches(["fr"], "fr")).toBe(true);
  });

  it("un contenu taggé ez est visible en sélectionnant fr (héritage)", () => {
    expect(zoneMatches(["ez"], "fr")).toBe(true);
  });

  it("un contenu taggé global est visible en sélectionnant n'importe quelle zone", () => {
    expect(zoneMatches(["global"], "de")).toBe(true);
    expect(zoneMatches(["global"], "in")).toBe(true);
  });

  it("un contenu taggé fr n'est PAS visible en sélectionnant ez (pas de remontée inverse)", () => {
    expect(zoneMatches(["fr"], "ez")).toBe(false);
  });

  it("un contenu taggé de n'est pas visible en sélectionnant fr (zones sœurs)", () => {
    expect(zoneMatches(["de"], "fr")).toBe(false);
  });

  it("un contenu taggé cn est visible en sélectionnant em (héritage cn ⊂ em)", () => {
    expect(zoneMatches(["cn"], "em")).toBe(false); // em est l'ancêtre de cn, pas l'inverse
  });

  it("un contenu taggé em est visible en sélectionnant cn (héritage cn ⊂ em)", () => {
    expect(zoneMatches(["em"], "cn")).toBe(true);
  });

  it("gère plusieurs zones taggées, une seule doit correspondre", () => {
    expect(zoneMatches(["us", "jp"], "jp")).toBe(true);
    expect(zoneMatches(["us", "jp"], "fr")).toBe(false);
  });
});
