import type { Echeance } from "@/lib/types";
import { getDriver } from "@/lib/content";
import { formatDateShort } from "@/lib/format";

/**
 * Le rappel de calendrier (DESIGN.md) : au-dessus du bloc 5, pour qu'on ne pose pas un guet sur
 * un événement déjà oublié. N'apparaît que dans le portail — ce n'est pas un contenu de
 * lecture.
 */
export function CalendarReminder({ echeances }: { echeances: Echeance[] }) {
  if (echeances.length === 0) return null;

  return (
    <div className="rounded-rc bg-repos px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="text-13 font-semibold text-encre">Échéances de la semaine</p>
        <span className="text-11 text-tenu">
          {echeances.length} à venir
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {echeances.map((e, i) => (
          <li key={`${e.date}-${i}`} className="flex items-baseline gap-2 text-12-5">
            <span className="shrink-0 font-mono text-10-5 text-tenu">
              {formatDateShort(e.date)}
            </span>
            <span className="min-w-0 text-doux">{e.libelle}</span>
            <span className="ml-auto shrink-0 rounded-rc border border-trait bg-page px-1.5 py-0.5 text-10-5 uppercase tracking-wide text-doux">
              {getDriver(e.driverId)?.label ?? e.driverId}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
