import { describe, expect, it } from "vitest";
import { DEBUT_DU_SUIVI, estPurgee } from "@/config/suivi";

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

  it("chaque note du corpus valide avec les blocs obligatoires de sa propre structure", async () => {
    const { parseNote, readNoteSources } = await import("./notes");
    const { requiredBlocks } = await import("./note-blocks");
    const sources = readNoteSources();
    expect(sources.length).toBeGreaterThan(0);
    for (const { slug, source } of sources) {
      // Lève si la note ne valide plus : c'est ce que ce test garde, quelle que soit la bascule.
      const note = parseNote(slug, source);
      for (const bloc of requiredBlocks(note.meta.kind, note.meta.isoWeek)) {
        expect(note.blocks, `${slug} → ${bloc}`).toContain(bloc);
      }
    }
  });

  it("ne contient plus aucune note, version de scénario ni entrée d'historique retirées à la remise à zéro", async () => {
    const { getNotes, getScenarioVersions, getTrends } = await import("./content");
    expect(getNotes().filter((n) => estPurgee(n.slug))).toEqual([]);
    expect(getScenarioVersions().filter((v) => estPurgee(v.noteSlug))).toEqual([]);
    expect(getTrends().flatMap((t) => t.statusHistory).filter((h) => estPurgee(h.noteSlug))).toEqual([]);
  });
});
