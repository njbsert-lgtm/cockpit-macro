import type { Authorship } from "@/lib/types";
import { AUTHORSHIP_LABEL, AUTHORSHIP_TEXT_CLASS } from "@/lib/authorship-labels";

/** L'étiquette de la carte de driver, réappliquée à l'authorship d'un bloc (DESIGN.md). */
export function AuthorshipBadge({ authorship }: { authorship: Authorship }) {
  return (
    <span
      className={`rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap ${AUTHORSHIP_TEXT_CLASS[authorship]}`}
    >
      {AUTHORSHIP_LABEL[authorship]}
    </span>
  );
}
