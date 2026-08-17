import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Note } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { getNote, getNoteBody, getTrend } from "@/lib/content";
import { getVeilleItemsByIds } from "@/lib/veille/queries";
import { createNoteMdxComponents } from "./mdx-blocks";

export async function NoteBlocks({ note }: { note: Note }) {
  const comparesTo = note.comparesTo ? getNote(note.comparesTo) : null;
  const body = getNoteBody(note.slug);
  const veilleItems = await getVeilleItemsByIds(note.veilleItemRefs);

  // Le corps est validé au chargement du corpus : s'il manque ici, c'est une incohérence
  // interne, pas une note mal écrite.
  const { content } = await compileMDX({
    source: body ?? "",
    components: createNoteMdxComponents(veilleItems, note.sources),
    options: { parseFrontmatter: false },
  });

  return (
    <article className="rounded-rc border border-trait bg-page">
      <header className="border-b border-trait px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-10-5 font-semibold uppercase tracking-cap px-2 py-1 ${
              note.kind === "hebdo" ? "bg-encre text-white" : "bg-k-choc/11 text-k-choc"
            }`}
          >
            {note.kind === "hebdo" ? "Note hebdomadaire" : "Note spéciale"}
          </span>
          <span className="text-12 text-tenu">{note.slug}</span>
          <span className="text-12 text-tenu">· {formatDateLong(note.date)}</span>
        </div>
        {note.trigger && (
          <p className="mt-2.5 border-l-3 border-k-choc bg-k-choc/11 px-3 py-2 text-13 text-doux">
            <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">
              Seuil déclenché
            </span>{" "}
            — {note.trigger}
          </p>
        )}
        {comparesTo && (
          <p className="mt-2 text-11 text-tenu">
            Comparée à{" "}
            <Link href={`/notes/${comparesTo.slug}`} className="underline decoration-trait underline-offset-4">
              {comparesTo.slug}
            </Link>{" "}
            du {formatDateLong(comparesTo.date)}
          </p>
        )}
      </header>

      <div className="px-4 md:px-5">{content}</div>

      {/* Les sources ne sont plus listées ici : elles vivent désormais dans le bloc qu'elles
          étayent, pour qu'on sache quelle affirmation vient d'où. Le pied ne garde que les
          tendances touchées, qui concernent la note entière. */}
      {note.trendRefs.length > 0 && (
        <footer className="border-t border-trait px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
              Tendances touchées
            </span>
            {note.trendRefs.map((id) => {
              const trend = getTrend(id);
              if (!trend) return null;
              return (
                <Link
                  key={id}
                  href={`/notes/tendances/${id}`}
                  className="rounded-rp border border-trait bg-repos px-2 py-0.5 text-11 text-doux transition-colors hover:border-trait-f hover:text-encre"
                >
                  {trend.title}
                </Link>
              );
            })}
          </div>
        </footer>
      )}
    </article>
  );
}
