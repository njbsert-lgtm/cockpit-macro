import { BLOCK_TITLES } from "@/lib/note-blocks";
import type { Authorship, Echeance, Guet } from "@/lib/types";
import type { Decisions } from "@/lib/redaction/publication";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { ValidationPill } from "./ValidationPill";
import { CalendarReminder } from "./CalendarReminder";
import { GuetDecisionLine } from "./GuetDecisionLine";

/**
 * Le bloc 5, en dépliant comme les autres — mais son contenu n'est jamais un textarea : ce
 * sont les guets, tranchés un par un, et le rappel de calendrier qui les précède.
 */
export function GuetsPanel({
  slug,
  guets,
  decisions,
  authorship,
  echeances,
}: {
  slug: string;
  guets: Guet[];
  decisions: Decisions["guets"];
  authorship: Authorship;
  echeances: Echeance[];
}) {
  const valide = authorship !== "ia";
  return (
    <details className="rounded-rc border border-trait bg-page">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <ValidationPill ok={valide} />
          <span className="truncate text-14-5 font-semibold text-encre">
            {BLOCK_TITLES.CeQueJeSurveille}
          </span>
        </span>
        <AuthorshipBadge authorship={authorship} />
      </summary>
      <div className="flex flex-col gap-3 border-t border-trait bg-repos px-4 py-3">
        <CalendarReminder echeances={echeances} />
        {guets.length === 0 ? (
          <p className="text-12-5 text-doux">Aucun guet cette semaine.</p>
        ) : (
          <ul>
            {guets.map((g) => (
              <GuetDecisionLine key={g.id} slug={slug} guet={g} decision={decisions[g.id]} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
