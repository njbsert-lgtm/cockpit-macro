import type { VeilleDayGroup } from "@/lib/veille/grouping";
import { formatDateLong } from "@/lib/format";
import { TriageItemRow } from "./TriageItemRow";

/**
 * `<details>` natif, sans JavaScript : replié par défaut au-delà de trois jours (cahier des
 * charges), ouvert sinon. Le lecteur d'écran l'annonce déjà comme un groupe expansible ; pas
 * besoin d'`aria-expanded` à la main.
 */
export function TriageDayGroup({
  group,
  collapsedByDefault,
}: {
  group: VeilleDayGroup;
  collapsedByDefault: boolean;
}) {
  const label = formatDateLong(group.date);

  return (
    <details open={!collapsedByDefault} className="border border-line bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-15 font-bold text-ink">{label}</span>
        <span className="font-mono text-11 text-mute">
          {group.items.length} item{group.items.length > 1 ? "s" : ""}
        </span>
      </summary>
      <ul aria-label={`Items du ${label}`} className="divide-y divide-line border-t border-line">
        {group.items.map((item) => (
          <li key={item.id}>
            <TriageItemRow item={item} />
          </li>
        ))}
      </ul>
    </details>
  );
}
