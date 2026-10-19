import { describe, expect, it } from "vitest";
import { OUTLOOKS } from "@/content/outlooks";
import highlights from "./__fixtures__/outlook-highlights.json";

describe("migration highlights → points", () => {
  it("reprend chaque point majeur mot pour mot, dans le même ordre", () => {
    for (const outlook of OUTLOOKS) {
      const avant = (highlights as Record<string, string[]>)[outlook.id];
      expect(avant, outlook.id).toBeDefined();
      expect(outlook.points.map((p) => p.texte), outlook.id).toEqual(avant);
    }
  });

  it("donne un thème déclaré à chaque point", () => {
    for (const outlook of OUTLOOKS) {
      const themes = new Set(outlook.themes.map((t) => t.id));
      for (const p of outlook.points) expect(themes.has(p.themeId), `${outlook.id}/${p.id}`).toBe(true);
    }
  });

  it("laisse « n.p. » ce que le document ne tranche pas", () => {
    const jpm = OUTLOOKS.find((o) => o.id === "jpmorgan-mid-2026")!;
    expect(jpm.positionnement.actions).toBeNull();
    expect(jpm.positionnement.orMatieres?.sens).toBe("renforcer");
  });
});
