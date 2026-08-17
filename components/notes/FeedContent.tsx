import { getActiveDrivers, getChangeExcerpt, getRevisingDriversByNote } from "@/lib/content";
import { buildNotesFeed } from "@/lib/notes-feed";
import { NotesFeedList, type FeedListItem } from "./NotesFeedList";

async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/** `/notes` : le fil chronologique complet, de la plus récente à la plus ancienne. */
export async function FeedContent() {
  await simulateLoad();

  const feed = buildNotesFeed();
  const revisionsBySlug = getRevisingDriversByNote();
  const drivers = getActiveDrivers();

  const items: FeedListItem[] = feed.map((item) =>
    item.kind === "gap"
      ? item
      : {
          kind: "note",
          note: item.note,
          excerpt: getChangeExcerpt(item.note.slug),
          drivers: revisionsBySlug.get(item.note.slug) ?? [],
        },
  );

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Notes</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Toutes les notes</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        De la plus récente à la plus ancienne, hebdos et spéciales confondues. Une semaine sans
        hebdo apparaît comme une ligne discrète plutôt que de disparaître du fil.
      </p>

      <div className="mt-6">
        <NotesFeedList items={items} drivers={drivers.map((d) => ({ id: d.id, label: d.label }))} />
      </div>
    </div>
  );
}
