/**
 * Utilitaires sur les identifiants de semaine ISO au format '2026-S33'.
 *
 * L'arithmétique de comparaison et de parcours (`compareIsoWeek`, `nextIsoWeek`,
 * `isoWeekRange`) reste simplifiée : le corpus ne couvre qu'une poignée de semaines
 * consécutives dans la même année civile, sans année à 53 semaines ni chevauchement.
 *
 * En revanche `isoWeekOf` et `isoWeekBounds` **appliquent la vraie règle ISO 8601** — semaine
 * du lundi au dimanche, semaine 1 contenant le premier jeudi de l'année. Elles convertissent
 * des dates réelles, et un raccourci du type « jours depuis dimanche » se tromperait
 * silencieusement : une note du samedi tomberait dans la semaine suivante et son `comparesTo`
 * pointerait à côté.
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

/** Lundi = 0 … dimanche = 6. `Date.getUTCDay()` fait commencer la semaine au dimanche. */
function jourIso(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

/**
 * La semaine ISO d'une date, selon ISO 8601 : la semaine appartient à l'année de son **jeudi**,
 * et la semaine 1 est celle qui contient le premier jeudi de l'année.
 *
 * C'est ce qui garantit qu'une note du samedi appartient à la même semaine que les séances
 * qu'elle couvre — vendredi et samedi sont dans la même semaine ISO.
 */
export function isoWeekOf(isoDate: string): string {
  const jeudi = new Date(`${isoDate}T00:00:00Z`);
  jeudi.setUTCDate(jeudi.getUTCDate() - jourIso(jeudi) + 3);

  const annee = jeudi.getUTCFullYear();
  // Le 4 janvier est toujours en semaine 1, quelle que soit l'année.
  const jeudiSemaine1 = new Date(Date.UTC(annee, 0, 4));
  jeudiSemaine1.setUTCDate(jeudiSemaine1.getUTCDate() - jourIso(jeudiSemaine1) + 3);

  const semaine = 1 + Math.round((jeudi.getTime() - jeudiSemaine1.getTime()) / (7 * 86_400_000));
  return formatIsoWeek(annee, semaine);
}

/** Le lundi et le dimanche d'une semaine ISO, en dates. */
export function isoWeekBounds(isoWeek: string): { debut: string; fin: string } {
  const { year, week } = parseIsoWeek(isoWeek);

  const lundiSemaine1 = new Date(Date.UTC(year, 0, 4));
  lundiSemaine1.setUTCDate(lundiSemaine1.getUTCDate() - jourIso(lundiSemaine1));

  const lundi = new Date(lundiSemaine1);
  lundi.setUTCDate(lundiSemaine1.getUTCDate() + (week - 1) * 7);

  const dimanche = new Date(lundi);
  dimanche.setUTCDate(lundi.getUTCDate() + 6);

  return { debut: lundi.toISOString().slice(0, 10), fin: dimanche.toISOString().slice(0, 10) };
}
