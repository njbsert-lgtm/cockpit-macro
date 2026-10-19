import { describe, expect, it } from "vitest";
import { DEBUT_DU_SUIVI } from "@/config/suivi";

/**
 * Le seul test qui lit le corpus réel — et il n'en lit aucune donnée. Il ne nomme ni slug, ni
 * nombre de notes, ni statut : il vérifie que le corpus assemblé ne lève pas (c'est
 * `lib/content.ts` qui contrôle tout le graphe à l'import). Les tests de règles, eux, vivent sur des graphes et des
 * fixtures synthétiques : une note publiée ne doit jamais pouvoir les casser.
 */
describe("le corpus réel", () => {
  it("s'assemble sans lever, et chaque note comparée existe ou est la note retirée du début du suivi", async () => {
    const { getNotes } = await import("./content");
    const notes = getNotes();
    expect(notes.length).toBeGreaterThan(0);

    const slugs = new Set(notes.map((n) => n.slug));
    for (const n of notes) {
      if (n.comparesTo === null) continue;
      const retiree = n.slug === DEBUT_DU_SUIVI.slug && n.comparesTo === DEBUT_DU_SUIVI.precedentePurgee;
      expect(slugs.has(n.comparesTo) || retiree, `${n.slug} → ${n.comparesTo}`).toBe(true);
    }
  });
});
