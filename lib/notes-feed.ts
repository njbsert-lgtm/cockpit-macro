import type { Note } from "./types";
import { getNotes } from "./content";

/** Les notes les plus récentes, pour l'étagère de l'écran d'accueil. */
export function getRecentNotes(limit: number): Note[] {
  return [...getNotes()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export type FeedItem = { kind: "note"; note: Note };

/**
 * Le fil chronologique complet de `/notes` : toutes les notes, de la plus récente à la plus
 * ancienne, sans arborescence par semaine. Comme les semaines ne se chevauchent jamais, les
 * parcourir de la plus récente à la plus ancienne — et, à l'intérieur de chacune, l'hebdo avant
 * les spéciales, elles-mêmes en ordre antéchronologique — produit exactement le même ordre qu'un
 * tri global par date : pas besoin de les mélanger après coup.
 *
 * Une semaine sans hebdo ne produit aucune ligne : le fil ne montre que ce qui a été publié.
 */
export function buildNotesFeed(): FeedItem[] {
  const notes = getNotes();
  if (notes.length === 0) return [];

  const weeks = [...new Set(notes.map((n) => n.isoWeek))].sort().reverse();

  const items: FeedItem[] = [];
  for (const isoWeek of weeks) {
    const thisWeek = notes.filter((n) => n.isoWeek === isoWeek);
    const hebdo = thisWeek.find((n) => n.kind === "hebdo") ?? null;
    const specials = thisWeek
      .filter((n) => n.kind === "speciale")
      .sort((a, b) => b.date.localeCompare(a.date));

    if (hebdo) items.push({ kind: "note", note: hebdo });
    for (const special of specials) {
      items.push({ kind: "note", note: special });
    }
  }
  return items;
}
