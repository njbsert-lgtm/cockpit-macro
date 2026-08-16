import { BLOCK_NAMES, type BlockName } from "@/lib/notes";
import type { VeilleItem } from "@/lib/types";

/**
 * La jonction entre une note et les items versés depuis `/triage` qui y sont cités
 * (`Note.veilleItemRefs`, résolus en `VeilleItem[]` par `lib/veille/queries.ts`).
 *
 * Logique pure et testable, séparée du rendu MDX (`components/notes/mdx-blocks.tsx`), qui se
 * contente de l'appeler.
 */

/**
 * Les items dont `attachedToBlock` résout à l'un des blocs analytiques, groupés par bloc —
 * ce sont les pièces à conviction affichées en pied de chaque bloc. Un `attachedToBlock` qui
 * ne correspond à aucun bloc connu (donnée corrompue, jamais produite par `/triage` lui-même)
 * est ignoré plutôt que de casser le rendu.
 */
export function groupEvidenceByBlock(items: VeilleItem[]): Map<BlockName, VeilleItem[]> {
  const known = new Set<string>(BLOCK_NAMES);
  const byBlock = new Map<BlockName, VeilleItem[]>();

  for (const item of items) {
    if (!item.attachedToBlock || !known.has(item.attachedToBlock)) continue;
    const block = item.attachedToBlock as BlockName;
    const list = byBlock.get(block) ?? [];
    list.push(item);
    byBlock.set(block, list);
  }

  return byBlock;
}

/** Le fil de la semaine : chronologique, du plus ancien au plus récent. */
export function sortChronologically(items: VeilleItem[]): VeilleItem[] {
  return [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}
