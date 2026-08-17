import Link from "next/link";
import type { Note } from "@/lib/types";
import { formatDateShort } from "@/lib/format";

export type NoteCardDriver = { id: string; label: string };

/**
 * La carte-article : sans images, l'ancrage visuel est typographique. Quatre paliers de
 * taille bien distincts — méta ~10 px, accroche ~17 px, extrait ~13 px, pastilles ~9 px —
 * pour que la carte se lise comme un article et non comme une ligne de tableau.
 *
 * Toute la carte est un seul lien ; les pastilles de drivers restent donc des `<span>`, pas
 * des liens imbriqués.
 */
export function NoteCard({
  note,
  drivers,
  excerpt,
  className = "",
}: {
  note: Note;
  /** Les drivers que cette note a effectivement révisés — vide si aucun. */
  drivers: NoteCardDriver[];
  excerpt: string | null;
  className?: string;
}) {
  const isSpeciale = note.kind === "speciale";

  return (
    <Link
      href={`/notes/${note.slug}`}
      className={`flex h-full flex-col overflow-hidden rounded-rc border border-trait bg-page hover:border-trait-f ${className}`}
    >
      {/* Le bandeau encode le type par la couleur ; le libellé texte juste en dessous porte
          la même information en clair, pour ne pas s'appuyer sur la couleur seule. */}
      <span aria-hidden="true" className={`h-1.5 w-full shrink-0 ${isSpeciale ? "bg-k-choc" : "bg-encre"}`} />

      <span className="flex flex-1 flex-col px-3.5 py-3">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-10-5 text-tenu">
          <span
            className={`font-semibold uppercase tracking-cap ${isSpeciale ? "text-k-choc" : "text-doux"}`}
          >
            {isSpeciale ? "Spéciale" : "Hebdo"}
          </span>
          <span>{note.isoWeek}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDateShort(note.date)}</span>
        </span>

        <span className="mt-2 line-clamp-3 text-17 font-semibold leading-snug text-encre">
          {note.regimeStatement}
        </span>

        {excerpt && <span className="mt-2 line-clamp-2 text-13 text-doux">{excerpt}</span>}

        {drivers.length > 0 && (
          <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {drivers.map((d) => (
              <span
                key={d.id}
                className="rounded-rc border border-trait bg-repos px-1.5 py-0.5 text-9-5 uppercase tracking-wide text-doux"
              >
                {d.label}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
