/**
 * Utilitaires sur les identifiants de semaine ISO au format '2026-S33'. Simplifiés pour cette
 * étape : le seed ne couvre qu'une poignée de semaines consécutives dans la même année civile,
 * donc pas besoin de gérer les années à 53 semaines ni le chevauchement d'année.
 */

export function parseIsoWeek(isoWeek: string): { year: number; week: number } {
  const [year, week] = isoWeek.split("-S");
  return { year: Number(year), week: Number(week) };
}

export function formatIsoWeek(year: number, week: number): string {
  return `${year}-S${String(week).padStart(2, "0")}`;
}

export function compareIsoWeek(a: string, b: string): number {
  const pa = parseIsoWeek(a);
  const pb = parseIsoWeek(b);
  return pa.year - pb.year || pa.week - pb.week;
}

export function nextIsoWeek(isoWeek: string): string {
  const { year, week } = parseIsoWeek(isoWeek);
  return formatIsoWeek(year, week + 1);
}

/** Toutes les semaines de `from` à `to` inclus, dans l'ordre chronologique. */
export function isoWeekRange(from: string, to: string): string[] {
  const weeks: string[] = [];
  let current = from;
  let guard = 0;
  while (compareIsoWeek(current, to) <= 0 && guard < 500) {
    weeks.push(current);
    current = nextIsoWeek(current);
    guard += 1;
  }
  return weeks;
}
