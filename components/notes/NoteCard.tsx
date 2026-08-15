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
      className={`flex h-full flex-col border border-line bg-card hover:border-deep focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-deep ${className}`}
    >
      {/* Le bandeau encode le type par la couleur ; le libellé texte juste en dessous porte
          la même information en clair, pour ne pas s'appuyer sur la couleur seule. */}
      <span aria-hidden="true" className={`h-1.5 w-full shrink-0 ${isSpeciale ? "bg-rust" : "bg-ink"}`} />

      <span className="flex flex-1 flex-col px-3.5 py-3">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-10-5 text-mute">
          <span
            className={`font-semibold uppercase tracking-wider ${isSpeciale ? "text-rust" : "text-ink-2"}`}
          >
            {isSpeciale ? "Spéciale" : "Hebdo"}
          </span>
          <span>{note.isoWeek}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDateShort(note.date)}</span>
        </span>

        <span className="mt-2 line-clamp-3 font-display text-17 font-extrabold leading-snug text-ink">
          {note.regimeStatement}
        </span>

        {excerpt && <span className="mt-2 line-clamp-2 text-13 text-ink-2">{excerpt}</span>}

        {drivers.length > 0 && (
          <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {drivers.map((d) => (
              <span
                key={d.id}
                className="border border-line-2 bg-paper px-1.5 py-0.5 font-mono text-9 uppercase tracking-wide text-ink-2"
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
