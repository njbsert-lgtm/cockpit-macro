import type { Note, Zone } from "./types";
import { zoneMatches } from "./zones";
import { getNotes } from "./content";
import { isoWeekRange } from "./iso-week";

/** La dernière note — tous types confondus — qui concerne la zone donnée. */
export function getLatestNoteForZone(zone: Zone): Note | null {
  const matching = getNotes().filter((e) => zoneMatches(e.zones, zone));
  if (matching.length === 0) return null;
  return [...matching].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export type ArchiveWeek = {
  isoWeek: string;
  /** Aucune hebdo n'a paru cette semaine, pour personne — un vrai trou dans l'archive. */
  isGap: boolean;
  /** La semaine en cours : son hebdo n'est pas encore due, ce n'est pas un trou. */
  isCurrentWeek: boolean;
  hebdo: Note | null;
  specials: Note[];
  /** Rien, dans cette semaine, ne concerne la zone sélectionnée. */
  emptyForZone: boolean;
};

/**
 * Colonne vertébrale hebdomadaire de l'archive, du plus ancien au plus récent, avec les
 * spéciales indentées sous leur semaine. Le trou (aucune hebdo publiée) est distinct du cas
 * où des notes existent cette semaine-là mais aucune ne concerne la zone sélectionnée — et
 * distinct de la semaine en cours, dont l'hebdo n'est simplement pas encore parue.
 */
export function buildArchiveWeeks(zone: Zone): ArchiveWeek[] {
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
    const zoneFiltered = thisWeek.filter((e) => zoneMatches(e.zones, zone));
    const isCurrentWeek = isoWeek === currentWeek;

    return {
      isoWeek,
      isGap: !hebdo && !isCurrentWeek,
      isCurrentWeek,
      hebdo,
      specials,
      emptyForZone: thisWeek.length > 0 && zoneFiltered.length === 0,
    };
  });
}
