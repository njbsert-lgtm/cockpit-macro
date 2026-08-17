import type { Note } from "./types";
import { BLOCK_TITLES, REQUIRED_BLOCKS, type BlockName } from "./note-blocks";

/**
 * L'archive de `/notes`, groupée par mois (DESIGN.md). Logique pure, séparée du rendu :
 * c'est elle qui décide de l'ordre et du regroupement, pas le composant.
 */

export type ArchiveEntry =
  | { kind: "note"; note: Note; excerpt: string | null; blocks: BlockName[] }
  | { kind: "gap"; isoWeek: string };

export type ArchiveMonth = {
  /** AAAA-MM, la clé de tri. */
  key: string;
  label: string;
  entries: ArchiveEntry[];
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function monthKeyOf(entry: ArchiveEntry): string {
  if (entry.kind === "note") return entry.note.date.slice(0, 7);
  // Une semaine sans hebdo n'a pas de date : son année suffit à la ranger au bon endroit,
  // et son mois est celui de la note qui la précède dans le fil, déjà trié.
  return entry.isoWeek.slice(0, 4);
}

export function groupByMonth(entries: ArchiveEntry[]): ArchiveMonth[] {
  const months: ArchiveMonth[] = [];
  let current: ArchiveMonth | null = null;
  let lastNoteMonth = "";

  for (const entry of entries) {
    const key = entry.kind === "note" ? monthKeyOf(entry) : lastNoteMonth || monthKeyOf(entry);
    if (entry.kind === "note") lastNoteMonth = key;

    if (!current || current.key !== key) {
      current = { key, label: labelOf(key), entries: [] };
      months.push(current);
    }
    current.entries.push(entry);
  }
  return months;
}

function labelOf(key: string): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  return MONTH_FORMATTER.format(new Date(`${key}-01T00:00:00Z`));
}

export type BlockState = { name: BlockName; title: string; present: boolean };

/**
 * L'état des blocs obligatoires d'une note : cinq pour une hebdo, trois pour une spéciale —
 * la structure du cahier des charges, pas le découpage en cinq blocs de la maquette.
 */
export function blockStates(note: Note, blocks: BlockName[]): BlockState[] {
  const present = new Set(blocks);
  return REQUIRED_BLOCKS[note.kind].map((name) => ({
    name,
    title: BLOCK_TITLES[name],
    present: present.has(name),
  }));
}
