import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Note } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { getNote, getNoteBody, getTrend } from "@/lib/content";
import { getVeilleItemsByIds } from "@/lib/veille/queries";
import {
  CHANNEL_BORDER,
  CHANNEL_LABELS,
  CHANNEL_TEXT,
  dominantChannel,
} from "@/lib/channels";
import { createNoteMdxComponents } from "./mdx-blocks";
import { KeyIndicators } from "./KeyIndicators";

/**
 * La page de lecture d'une note (DESIGN.md) — filet, pas aplat.
 *
 * En-tête : métadonnées (type, semaine, date), pastille du canal dominant, puis le titre, qui
 * est la phrase de régime ; rien ne la répète en dessous. Le corps n'est pas enfermé dans une
 * carte : un filet de 3px à la couleur du canal court le long des blocs, dont les pastilles
 * d'emoji sont tirées dans la marge. Une note sans canal déclaré garde un filet `--trait` et
 * aucune pastille — jamais une couleur choisie au hasard.
 */
export async function NoteBlocks({ note }: { note: Note }) {
  const comparesTo = note.comparesTo ? getNote(note.comparesTo) : null;
  const body = getNoteBody(note.slug);
  const veilleItems = await getVeilleItemsByIds(note.veilleItemRefs);
  const dominant = dominantChannel(note.channels);
  const tone = dominant ? CHANNEL_TEXT[dominant] : "text-tenu";

  // Le corps est validé au chargement du corpus : s'il manque ici, c'est une incohérence
  // interne, pas une note mal écrite.
  const { content } = await compileMDX({
    source: body ?? "",
    components: createNoteMdxComponents(veilleItems, note.sources, note.guets, note.slug, tone),
    options: { parseFrontmatter: false },
  });

  return (
    <article>
      <header>
        <p className="flex flex-wrap items-baseline gap-x-2 text-11 text-tenu">
          <span className="text-9-5 font-semibold uppercase tracking-cap">
            {note.kind === "hebdo" ? "Hebdo" : "Spéciale"}
          </span>
          <span>{note.isoWeek}</span>
          <span>· {formatDateLong(note.date)}</span>
        </p>
        {dominant && (
          <span
            className={`mt-3 inline-block rounded-rp border border-current px-2 py-px text-9-5 font-semibold uppercase tracking-cap ${CHANNEL_TEXT[dominant]}`}
          >
            {CHANNEL_LABELS[dominant]}
          </span>
        )}
        <h1 className="mt-2 text-26 font-bold leading-[1.14] tracking-note text-encre">
          {note.regimeStatement}
        </h1>
        {comparesTo && (
          <p className="mt-2 text-11 text-tenu">
            Comparée à{" "}
            <Link
              href={`/notes/${comparesTo.slug}`}
              className="underline decoration-trait underline-offset-4 hover:text-encre"
            >
              {comparesTo.slug}
            </Link>{" "}
            du {formatDateLong(comparesTo.date)}
          </p>
        )}
        {note.trigger && (
          <p className="mt-3 border-l-3 border-k-choc bg-k-choc/11 px-3 py-2 text-13 text-doux">
            <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">
              Seuil déclenché
            </span>{" "}
            — {note.trigger}
          </p>
        )}
        <div className="mt-5">
          <KeyIndicators indicators={note.keyIndicators} />
        </div>
      </header>

      <div
        className={`mt-7 ml-3 border-l-3 pl-[18px] md:ml-0 ${dominant ? CHANNEL_BORDER[dominant] : "border-trait"}`}
      >
        {content}
      </div>

      {/* Les sources vivent dans le bloc qu'elles étayent. Le pied ne garde que les tendances
          touchées, qui concernent la note entière. */}
      {note.trendRefs.length > 0 && (
        <footer className="mt-7 border-t border-trait pt-4">
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
