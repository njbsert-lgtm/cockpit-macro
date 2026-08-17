import Link from "next/link";
import { getRecentNotes } from "@/lib/notes-feed";
import { getChangeExcerpt } from "@/lib/content";
import { NoteCard } from "./NoteCard";
import { SectionHeader } from "./SectionHeader";

const SHELF_SIZE = 6;

/**
 * Couche 2 : une étagère de fraîcheur, pas une archive — quatre à six notes maximum.
 *
 * Carrousel à débordement pleine largeur (DESIGN.md) : cartes à `flex: 0 0 262px`, snap natif,
 * barre de défilement masquée, et une **carte d'appel** de 132px en fin de rangée qui mène à
 * l'archive. Aucun JavaScript de défilement.
 *
 * Sur desktop la rangée devient une grille de trois cartes : le défilement horizontal est une
 * contrainte de petit écran, pas un parti pris esthétique.
 */
export function NotesShelf() {
  const notes = getRecentNotes(SHELF_SIZE);
  if (notes.length === 0) return null;

  return (
    <section className="mt-7">
      <SectionHeader
        title="Notes"
        href="/notes"
        count={`${notes.length} récentes`}
        note="Les plus récentes en tête ; l’archive complète remonte semaine par semaine."
      />

      <ul
        aria-label="Notes récentes"
        className="sans-barre -mx-4.5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4.5 pt-0.5 pb-3.5 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {notes.map((note) => (
          <li key={note.slug} className="w-[262px] shrink-0 snap-start md:w-auto">
            <NoteCard note={note} excerpt={getChangeExcerpt(note.slug)} className="h-full" />
          </li>
        ))}
        <li className="w-[132px] shrink-0 snap-start md:hidden">
          <Link
            href="/notes"
            className="flex h-full items-center justify-center rounded-rc border border-dashed border-trait-f bg-repos px-3 text-center text-12-5 text-doux transition-colors hover:text-encre"
          >
            Voir toute l&rsquo;archive ›
          </Link>
        </li>
      </ul>
    </section>
  );
}
