import { STALENESS_TOLERANCE, type FredCadence } from "@/config/fred-series";

/**
 * Le **retard de publication** — un signal distinct de la fraîcheur, et à ne pas confondre
 * avec elle.
 *
 * La fraîcheur (`lib/freshness.ts`) répond à « notre copie est-elle récente ? » et se calcule
 * sur `fetchedAt`. Elle reste verte le week-end parce que le cron re-confirme chaque jour.
 *
 * Le retard répond à une autre question : « la source a-t-elle cessé de publier ? ». Il se
 * calcule sur la date de l'observation, et il existe parce que la fraîcheur ne le verrait
 * pas : si FRED répond correctement mais que le BLS saute une publication de CPI, notre copie
 * reste fraîche et personne ne s'en aperçoit.
 *
 * Il s'affiche sur l'indicateur concerné et **ne fait jamais rougir le point de la barre
 * persistante** : ce n'est pas un problème de collecte, et un point rouge pour une raison sur
 * laquelle le lecteur ne peut rien agir finit par être ignoré.
 */

const DAY = 24 * 60 * 60 * 1000;

function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

/**
 * Jours ouvrés entre deux dates, samedis et dimanches exclus, bornes comprises côté départ.
 *
 * Pas de calendrier de fériés : nous ne l'avons pas, et l'inventer serait de la donnée
 * fabriquée. La tolérance de trois jours ouvrés absorbe un férié isolé comme un pont, tout en
 * laissant voir une source qui s'est vraiment tue.
 */
export function businessDaysBetween(from: string, to: string): number {
  const start = parseDate(from);
  const end = parseDate(to);
  if (end <= start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function calendarDaysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY));
}

export type PublicationDelay = {
  late: boolean;
  /** L'écart mesuré, dans l'unité de la cadence. */
  elapsed: number;
  tolerated: number;
  unit: "business-days" | "calendar-days";
};

/**
 * Une série est-elle en retard de publication ? `latestObservationDate` est la date du
 * dernier point connu, pas celle du dernier relevé.
 */
export function publicationDelay(
  latestObservationDate: string | null,
  cadence: FredCadence,
  now: Date = new Date(),
): PublicationDelay | null {
  if (!latestObservationDate) return null;

  const { unit, max } = STALENESS_TOLERANCE[cadence];
  const today = now.toISOString().slice(0, 10);
  const elapsed =
    unit === "business-days"
      ? businessDaysBetween(latestObservationDate, today)
      : calendarDaysBetween(latestObservationDate, today);

  return { late: elapsed > max, elapsed, tolerated: max, unit };
}

/** Phrase affichable, ou `null` quand la série est à l'heure — on ne dit rien pour rien dire. */
export function describePublicationDelay(delay: PublicationDelay | null): string | null {
  if (!delay || !delay.late) return null;
  const unit = delay.unit === "business-days" ? "jours ouvrés" : "jours";
  return `Aucune publication depuis ${delay.elapsed} ${unit}, au-delà des ${delay.tolerated} attendus pour cette cadence.`;
}
