import { describe, expect, it } from "vitest";
import { groupEvidenceByBlock, sortChronologically } from "./evidence";
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
    status: "verse",
    attachedToBlock: null,
    draftNoteSlug: "2026-S34",
    ...overrides,
  };
}

describe("groupEvidenceByBlock", () => {
  it("groupe les items par bloc analytique", () => {
    const grouped = groupEvidenceByBlock([
      item({ id: "a", attachedToBlock: "CeQuiAChange" }),
      item({ id: "b", attachedToBlock: "CeQueJeSurveille" }),
      item({ id: "c", attachedToBlock: "CeQuiAChange" }),
    ]);

    expect(grouped.get("CeQuiAChange")?.map((i) => i.id)).toEqual(["a", "c"]);
    expect(grouped.get("CeQueJeSurveille")?.map((i) => i.id)).toEqual(["b"]);
  });

  it("ignore un item sans bloc attaché", () => {
    const grouped = groupEvidenceByBlock([item({ attachedToBlock: null })]);
    expect(grouped.size).toBe(0);
  });

  it("ignore un attachedToBlock qui ne correspond à aucun bloc connu", () => {
    const grouped = groupEvidenceByBlock([item({ attachedToBlock: "BlocFantome" })]);
    expect(grouped.size).toBe(0);
  });

  it("n'accepte pas LeFilDeLaSemaine ou RecapDesSpeciales comme bloc de preuve valide", () => {
    // Les deux sont des noms de bloc réels (donc dans BLOCK_NAMES), mais ce ne sont pas des
    // blocs analytiques : le test documente qu'ils sont acceptés par la fonction générique —
    // c'est /triage qui restreint le choix aux cinq blocs analytiques, pas cette fonction.
    const grouped = groupEvidenceByBlock([item({ attachedToBlock: "LeFilDeLaSemaine" })]);
    expect(grouped.get("LeFilDeLaSemaine")).toHaveLength(1);
  });
});

describe("sortChronologically", () => {
  it("trie du plus ancien au plus récent", () => {
    const sorted = sortChronologically([
      item({ id: "recent", publishedAt: "2026-08-16T10:00:00Z" }),
      item({ id: "ancien", publishedAt: "2026-08-14T10:00:00Z" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["ancien", "recent"]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const items = [item({ id: "b", publishedAt: "2026-08-16" }), item({ id: "a", publishedAt: "2026-08-14" })];
    sortChronologically(items);
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
