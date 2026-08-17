import type { VeilleItem } from "@/lib/types";
import { getDriver } from "@/lib/content";
import { ZONE_LABELS } from "@/lib/zones";
import { CHANNEL_LABELS } from "@/lib/veille/labels";
import { REQUIRED_BLOCKS, BLOCK_TITLES } from "@/lib/notes";
import { formatDateTime } from "@/lib/format";
import { verserItem, archiverItem, ignorerItem } from "@/app/triage/actions";

const PASTILLE = "rounded-rc border border-trait bg-repos px-1.5 py-0.5 text-10-5 uppercase tracking-wide text-doux";
const BUTTON = "min-h-11 rounded-rb border border-trait bg-repos px-3 text-12-5 text-doux hover:border-trait-f hover:text-encre";

export function TriageItemRow({ item }: { item: VeilleItem }) {
  const hasTags = item.driverRefs.length > 0 || item.channels.length > 0 || item.zones.length > 0;

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3.5">
      <div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-14-5 font-bold leading-snug text-encre hover:text-encre"
        >
          {item.title}
        </a>
        <p className="mt-1 text-11 text-tenu">
          {item.source} · {formatDateTime(item.publishedAt)}
        </p>
      </div>

      {hasTags && (
        <ul aria-label="Rattachements" className="flex flex-wrap gap-1.5">
          {item.driverRefs.map((id) => (
            <li key={`driver-${id}`} className={PASTILLE}>
              {getDriver(id)?.label ?? id}
            </li>
          ))}
          {item.channels.map((channel) => (
            <li key={`channel-${channel}`} className={PASTILLE}>
              {CHANNEL_LABELS[channel]}
            </li>
          ))}
          {item.zones.map((zone) => (
            <li key={`zone-${zone}`} className={`${PASTILLE} text-tenu`}>
              {ZONE_LABELS[zone]}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <details className="min-w-0 grow basis-full sm:basis-auto">
          <summary
            className={`${BUTTON} inline-flex cursor-pointer items-center gap-1 [&::-webkit-details-marker]:hidden`}
          >
            Verser dans une note →
          </summary>
          <form
            action={verserItem.bind(null, item.id)}
            className="mt-2 flex flex-col gap-2 rounded-rc border border-trait bg-repos p-3 sm:flex-row sm:items-end"
          >
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Bloc</span>
              <select
                name="block"
                required
                defaultValue=""
                className="min-h-11 rounded-rb border border-trait bg-page px-2 text-12-5 text-encre"
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {REQUIRED_BLOCKS.hebdo.map((block) => (
                  <option key={block} value={block}>
                    {BLOCK_TITLES[block]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Note en préparation</span>
              <input
                name="draftNoteSlug"
                required
                placeholder="2026-S34"
                pattern="\d{4}-S\d{2}(-E\d+)?"
                title="Format attendu : AAAA-Sxx ou AAAA-Sxx-En"
                className="min-h-11 rounded-rb border border-trait bg-page px-2 text-12-5 text-encre"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-rb border border-encre bg-encre px-3 text-12-5 text-white hover:border-trait-f hover:bg-encre"
            >
              Verser
            </button>
          </form>
        </details>

        <form action={archiverItem.bind(null, item.id)}>
          <button type="submit" className={BUTTON}>
            Archiver
          </button>
        </form>

        <form action={ignorerItem.bind(null, item.id)}>
          <button type="submit" className={BUTTON}>
            Ignorer
          </button>
        </form>
      </div>
    </div>
  );
}
