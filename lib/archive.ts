import type { Note } from "./types";
import { getNotes } from "./content";
import { isoWeekRange } from "./iso-week";

export type ArchiveWeek = {
  isoWeek: string;
  /** Aucune hebdo n'a paru cette semaine, pour personne — un vrai trou dans l'archive. */
  isGap: boolean;
  /** La semaine en cours : son hebdo n'est pas encore due, ce n'est pas un trou. */
  isCurrentWeek: boolean;
  hebdo: Note | null;
  specials: Note[];
};

/**
 * Colonne vertébrale hebdomadaire de l'archive, du plus ancien au plus récent, avec les
 * spéciales indentées sous leur semaine. Les notes ne se filtrent plus par zone — l'archive
 * montre tout, donc le seul trou possible est l'absence réelle de hebdo cette semaine-là,
 * distincte de la semaine en cours dont l'hebdo n'est simplement pas encore parue.
 */
export function buildArchiveWeeks(): ArchiveWeek[] {
  const notes = getNotes();
  if (notes.length === 0) return [];

  const weeks = [...new Set(notes.map((e) => e.isoWeek))].sort();
  const range = isoWeekRange(weeks[0], weeks[weeks.length - 1]);
  const currentWeek = range[range.length - 1];

  return range.map((isoWeek) => {
    const thisWeek = notes.filter((e) => e.isoWeek === isoWeek);
    const hebdo = thisWeek.find((e) => e.kind === "hebdo") ?? null;
    const specials = thisWeek
      .filter((e) => e.kind === "speciale")
      .sort((a, b) => a.date.localeCompare(b.date));
    const isCurrentWeek = isoWeek === currentWeek;

    return {
      isoWeek,
      isGap: !hebdo && !isCurrentWeek,
      isCurrentWeek,
      hebdo,
      specials,
    };
  });
}
