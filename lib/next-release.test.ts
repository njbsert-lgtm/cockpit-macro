import { describe, expect, it } from "vitest";
import { resolveNextRelease } from "./next-release";

describe("resolveNextRelease", () => {
  it("laisse passer une date encore à venir", () => {
    expect(resolveNextRelease("2026-10-14", "2026-09-19")).toBe("2026-10-14");
  });

  it("laisse passer une date qui est aujourd'hui", () => {
    expect(resolveNextRelease("2026-09-19", "2026-09-19")).toBe("2026-09-19");
  });

  it("efface une date déjà dépassée plutôt que de la présenter comme à venir", () => {
    // C'est le bug d'origine : une date saisie à la main dans le seed, jamais resynchronisée,
    // continuait de s'afficher comme une échéance future longtemps après être passée.
    expect(resolveNextRelease("2026-08-01", "2026-09-19")).toBeNull();
  });

  it("laisse null tel quel", () => {
    expect(resolveNextRelease(null, "2026-09-19")).toBeNull();
  });
});
