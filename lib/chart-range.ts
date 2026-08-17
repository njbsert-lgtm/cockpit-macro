/**
 * Les échelles de temporalité d'un graphique de série. Logique pure, testable à part du
 * rendu : c'est elle qui décide de la fenêtre, le composant ne fait que l'appliquer.
 */

export type RangeKey = "5y" | "3y" | "1y" | "ytd" | "6m" | "3m" | "1m" | "1w";

export const RANGE_ORDER: RangeKey[] = ["5y", "3y", "1y", "ytd", "6m", "3m", "1m", "1w"];

export const RANGE_LABELS: Record<RangeKey, string> = {
  "5y": "5 ans",
  "3y": "3 ans",
  "1y": "1 an",
  ytd: "YTD",
  "6m": "6 mois",
  "3m": "3 mois",
  "1m": "1 mois",
  "1w": "1 semaine",
};

export const DEFAULT_RANGE: RangeKey = "1y";

/** Décalage en mois depuis l'ancre. `ytd` ne s'exprime pas ainsi : il a son propre calcul. */
const MONTHS_BACK: Record<Exclude<RangeKey, "ytd" | "1w">, number> = {
  "5y": 60,
  "3y": 36,
  "1y": 12,
  "6m": 6,
  "3m": 3,
  "1m": 1,
};

export type SeriesPoint = { date: string; value: number };

/**
 * La borne basse d'une fenêtre, ancrée sur **le dernier point de la série** et non sur la date
 * du jour : une série qui a cessé d'être publiée doit continuer à montrer sa dernière année de
 * données, pas un graphique vide qui laisserait croire qu'il n'y a jamais rien eu.
 */
export function rangeStart(range: RangeKey, anchorDate: string): string {
  const anchor = new Date(`${anchorDate}T00:00:00Z`);

  if (range === "ytd") return `${anchor.getUTCFullYear()}-01-01`;

  if (range === "1w") {
    anchor.setUTCDate(anchor.getUTCDate() - 7);
    return anchor.toISOString().slice(0, 10);
  }

  anchor.setUTCMonth(anchor.getUTCMonth() - MONTHS_BACK[range]);
  return anchor.toISOString().slice(0, 10);
}

/** Les points de la fenêtre, bornes comprises. Une série vide reste vide, jamais complétée. */
export function filterByRange(points: SeriesPoint[], range: RangeKey): SeriesPoint[] {
  if (points.length === 0) return [];
  const anchor = points.reduce((max, p) => (p.date > max ? p.date : max), points[0].date);
  const start = rangeStart(range, anchor);
  return points.filter((p) => p.date >= start);
}
