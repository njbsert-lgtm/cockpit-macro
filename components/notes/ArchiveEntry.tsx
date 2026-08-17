"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Note } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { CHANNEL_BG, dominantChannel } from "@/lib/channels";
import { blockStates } from "@/lib/notes-archive";
import type { BlockName } from "@/lib/note-blocks";

/**
 * Une pastille ronde de 17px par bloc : pleine verte si le bloc est validé, en pointillés
 * `--k-choc` sinon (DESIGN.md).
 *
 * C'est la seule occurrence où le vert qualifie autre chose qu'un chiffre. DESIGN.md le
 * prescrit explicitement, et l'objet n'est ni un contenu éditorial ni une performance : c'est
 * l'état de complétude d'un gabarit. Le titre du bloc reste écrit à côté.
 */
function BlockPill({ present }: { present: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-rp text-9-5 ${
        present
          ? "bg-hausse text-white"
          : "border border-dashed border-k-choc text-k-choc"
      }`}
    >
      {present ? "✓" : ""}
    </span>
  );
}

/**
 * Une entrée d'archive : grille `4px 1fr` dont la colonne de gauche porte la couleur du canal,
 * un en-tête dépliant qui révèle l'état des blocs obligatoires, puis deux boutons d'action.
 */
export function ArchiveEntry({
  note,
  excerpt,
  blocks,
}: {
  note: Note;
  excerpt: string | null;
  blocks: BlockName[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const dominant = dominantChannel(note.channels);
  const states = blockStates(note, blocks);
  const done = states.filter((s) => s.present).length;
  const complete = done === states.length;

  return (
    <div className="grid grid-cols-[4px_1fr] overflow-hidden rounded-rc border border-trait bg-page">
      <span aria-hidden="true" className={dominant ? CHANNEL_BG[dominant] : "bg-trait"} />

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full min-h-11 items-start justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
                {note.kind === "hebdo" ? "Hebdo" : "Spéciale"}
              </span>
              <span className="text-11 tabular-nums text-tenu">
                {note.isoWeek} · {formatDateShort(note.date)}
              </span>
            </span>
            <span className="mt-1 block text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">
              {note.regimeStatement}
            </span>
            {excerpt && <span className="mt-1 line-clamp-2 text-12-5 text-doux">{excerpt}</span>}
          </span>

          <span className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-rp px-2 py-0.5 text-11 font-semibold tabular-nums ${
                complete ? "bg-hausse/11 text-hausse" : "bg-k-choc/11 text-k-choc"
              }`}
            >
              {done}/{states.length}
            </span>
            <span
              aria-hidden="true"
              className={`text-12 text-tenu transition-transform ${open ? "rotate-90" : ""}`}
            >
              ›
            </span>
          </span>
        </button>

        {open && (
          <div id={panelId} className="border-t border-trait bg-repos px-4 py-3">
            <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
              Blocs obligatoires
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {states.map((s) => (
                <li key={s.name} className="flex items-center gap-2 text-12-5 text-doux">
                  <BlockPill present={s.present} />
                  {s.title}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/notes/${note.slug}`}
                className="inline-flex min-h-11 items-center rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white transition-colors hover:border-trait-f"
              >
                Ouvrir la note
              </Link>
              {note.comparesTo && (
                <Link
                  href={`/notes/${note.comparesTo}`}
                  className="inline-flex min-h-11 items-center rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
                >
                  Comparée à {note.comparesTo}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
