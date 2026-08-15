import type { Note } from "./types";
import { getNotes } from "./content";
import { isoWeekRange } from "./iso-week";

/** Les notes les plus récentes, pour l'étagère de l'écran d'accueil. */
export function getRecentNotes(limit: number): Note[] {
  return [...getNotes()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export type FeedItem =
  | { kind: "note"; note: Note }
  /** Une semaine dont l'hebdo n'a pas paru — une discipline rompue, montrée plutôt que tue. */
  | { kind: "gap"; isoWeek: string };

/**
 * Le fil chronologique complet de `/notes` : toutes les notes, de la plus récente à la plus
 * ancienne, sans arborescence par semaine. Comme les semaines ne se chevauchent jamais, les
 * parcourir de la plus récente à la plus ancienne — et, à l'intérieur de chacune, l'hebdo
 * (ou son absence) avant les spéciales, elles-mêmes en ordre antéchronologique — produit
 * exactement le même ordre qu'un tri global par date : pas besoin de les mélanger après coup.
 */
export function buildNotesFeed(): FeedItem[] {
  const notes = getNotes();
  if (notes.length === 0) return [];

  const weeks = [...new Set(notes.map((n) => n.isoWeek))].sort();
  const range = isoWeekRange(weeks[0], weeks[weeks.length - 1]);
  const currentWeek = range[range.length - 1];

  const items: FeedItem[] = [];
  for (const isoWeek of [...range].reverse()) {
    const thisWeek = notes.filter((n) => n.isoWeek === isoWeek);
    const hebdo = thisWeek.find((n) => n.kind === "hebdo") ?? null;
    const specials = thisWeek
      .filter((n) => n.kind === "speciale")
      .sort((a, b) => b.date.localeCompare(a.date));

    if (hebdo) {
      items.push({ kind: "note", note: hebdo });
    } else if (isoWeek !== currentWeek) {
      items.push({ kind: "gap", isoWeek });
    }
    // La semaine en cours sans hebdo n'est ni une note ni un trou : elle n'est simplement pas
    // encore due, donc elle ne produit aucune ligne.

    for (const special of specials) {
      items.push({ kind: "note", note: special });
    }
  }
  return items;
}
