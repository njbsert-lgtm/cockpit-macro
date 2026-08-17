import Link from "next/link";
import type { Note, VeilleChannel } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import {
  ALL_CHANNELS,
  CHANNEL_BG,
  CHANNEL_LABELS,
  CHANNEL_TEXT,
  dominantChannel,
} from "@/lib/channels";

export type NoteCardDriver = { id: string; label: string };

function isToday(iso: string, now: Date): boolean {
  return iso === now.toISOString().slice(0, 10);
}

/**
 * Les cinq points de canal du pied : allumés à la couleur des canaux traversés, éteints en
 * `--eteint`. L'ordre est celui de la grille, jamais celui de la note — la position d'un point
 * veut donc toujours dire le même canal, ce qui est ce qui le rend lisible d'une carte à
 * l'autre.
 */
function ChannelDots({ channels }: { channels: VeilleChannel[] }) {
  const lit = new Set(channels);
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {ALL_CHANNELS.map((c) => (
        <span
          key={c}
          className={`h-1.5 w-1.5 rounded-rp ${lit.has(c) ? CHANNEL_BG[c] : "bg-eteint"}`}
        />
      ))}
    </span>
  );
}

/**
 * La carte-article (DESIGN.md) : bande de 4px à la couleur du canal dominant, ligne d'en-tête
 * portant la pastille de canal et la date, titre, accroche, puis un pied poussé en bas par
 * `margin-top:auto` avec les cinq points de canal et le décompte.
 *
 * La bande n'encode plus le type de note — c'est le canal qu'elle porte désormais — donc le
 * libellé « Hebdo » / « Spéciale » reste écrit dans l'en-tête : le cahier des charges interdit
 * qu'une information ne repose que sur une couleur.
 *
 * Toute la carte est un seul lien ; les pastilles restent donc des `<span>`, pas des liens
 * imbriqués.
 */
export function NoteCard({
  note,
  excerpt,
  className = "",
  now = new Date(),
}: {
  note: Note;
  /** Les drivers révisés par la note — servent au filtrage du fil, pas à la carte. */
  drivers?: NoteCardDriver[];
  excerpt: string | null;
  className?: string;
  now?: Date;
}) {
  const dominant = dominantChannel(note.channels);
  const count = note.channels.length;

  return (
    <Link
      href={`/notes/${note.slug}`}
      className={`flex h-full flex-col overflow-hidden rounded-rc border border-trait bg-page transition-colors hover:border-trait-f active:scale-[.99] ${className}`}
    >
      {/* La bande de 4px, à la couleur du canal dominant. Neutre tant que la note n'a déclaré
          aucun canal : jamais une couleur choisie au hasard. */}
      <span
        aria-hidden="true"
        className={`h-1 w-full shrink-0 ${dominant ? CHANNEL_BG[dominant] : "bg-trait"}`}
      />

      <span className="flex flex-1 flex-col p-[15px]">
        <span className="flex items-center gap-2">
          {/* La pastille se comprime avant tout le reste : un libellé de canal long ne doit
              jamais pousser le type et la date l'un sur l'autre. */}
          {dominant && (
            <span
              className={`min-w-0 truncate rounded-rp border border-current px-1.5 py-px text-9-5 font-semibold uppercase tracking-cap ${CHANNEL_TEXT[dominant]}`}
            >
              {CHANNEL_LABELS[dominant]}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
              {note.kind === "hebdo" ? "Hebdo" : "Spéciale"}
            </span>
            {isToday(note.date, now) ? (
              <span
                className={`text-11 font-semibold ${dominant ? CHANNEL_TEXT[dominant] : "text-encre"}`}
              >
                Aujourd&rsquo;hui
              </span>
            ) : (
              <span className="text-11 tabular-nums text-tenu">{formatDateShort(note.date)}</span>
            )}
          </span>
        </span>

        <span className="mt-2 line-clamp-3 text-15-5 font-semibold leading-[1.25] tracking-titre text-encre">
          {note.regimeStatement}
        </span>

        {excerpt && <span className="mt-1.5 line-clamp-2 text-12-5 text-doux">{excerpt}</span>}

        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          <ChannelDots channels={note.channels} />
          {/* Le décompte, ou la semaine ISO tant qu'aucun canal n'est déclaré — plutôt qu'un
              « 0 canal » qui se lirait comme un jugement porté. */}
          <span className="text-11 tabular-nums text-tenu">
            {count > 0 ? `${count} ${count > 1 ? "canaux" : "canal"}` : note.isoWeek}
          </span>
        </span>
      </span>
    </Link>
  );
}
