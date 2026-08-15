import Link from "next/link";
import { getRecentNotes } from "@/lib/notes-feed";
import { getChangeExcerpt, getRevisingDriversByNote } from "@/lib/content";
import { NoteCard } from "./NoteCard";

const SHELF_SIZE = 6;

/**
 * Couche 2 : une étagère de fraîcheur, pas une archive — quatre à six notes maximum. Rangée
 * horizontale sur mobile avec débord visible (78 % de la fenêtre), grille de trois colonnes
 * sur desktop, jamais de carrousel. `scroll-snap-type` natif, aucun JavaScript de défilement.
 */
export function NotesShelf() {
  const notes = getRecentNotes(SHELF_SIZE);
  if (notes.length === 0) return null;

  const revisionsBySlug = getRevisingDriversByNote();

  return (
    <section className="mt-10">
      <Link
        href="/notes"
        className="group flex items-baseline gap-1.5 text-ink hover:text-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-deep"
      >
        <h2 className="font-display text-22 font-extrabold">Notes</h2>
        <span aria-hidden="true" className="font-display text-22 font-extrabold text-mute group-hover:text-deep">
          ›
        </span>
      </Link>

      <ul
        aria-label="Notes récentes"
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:snap-none md:grid-cols-3 md:overflow-visible"
      >
        {notes.map((note) => (
          <li key={note.slug} className="w-[78vw] shrink-0 snap-start md:w-auto">
            <NoteCard
              note={note}
              excerpt={getChangeExcerpt(note.slug)}
              drivers={revisionsBySlug.get(note.slug) ?? []}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
