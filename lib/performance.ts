import type { Instrument, Observation } from "./types";

function sortedByDate(obs: Observation[]): Observation[] {
  return [...obs].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestObservation(obs: Observation[]): Observation | null {
  if (obs.length === 0) return null;
  return sortedByDate(obs).at(-1) ?? null;
}

/** La dernière observation à la date donnée ou avant. `null` si la série ne remonte pas jusque-là. */
export function observationOnOrBefore(
  obs: Observation[],
  targetDate: string,
): Observation | null {
  const before = sortedByDate(obs).filter((o) => o.date <= targetDate);
  return before.at(-1) ?? null;
}

export type Performance = { pct: number; fromDate: string; fromValue: number };

/**
 * Performance en pourcentage entre l'observation la plus proche de `fromDate` (à cette date
 * ou avant) et la dernière observation disponible. `null` si l'un des deux points manque —
 * jamais une valeur inventée.
 */
export function performanceSince(
  obs: Observation[],
  fromDate: string,
): Performance | null {
  const latest = latestObservation(obs);
  const from = observationOnOrBefore(obs, fromDate);
  if (!latest || !from || from.date === latest.date) return null;
  return {
    pct: ((latest.value - from.value) / from.value) * 100,
    fromDate: from.date,
    fromValue: from.value,
  };
}

/**
 * Écart depuis le 1er janvier, basé sur `Instrument.ytdBasis` (clôture du 31 décembre, saisie
 * à la main) plutôt que sur une observation de la série.
 *
 * Rend l'écart **absolu** et l'écart **relatif**, comme `dailyChange` : c'est l'appelant qui
 * choisit lequel afficher, selon l'unité de l'instrument. Un taux se lit en points de base —
 * dire qu'un 10 ans à 4,50 % « gagne 12,5 % » sur une base à 4,00 % n'informe personne, alors
 * que « +50 bps » se lit immédiatement.
 *
 * `null` si la base n'a pas encore été saisie — les deux spreads n'en ont pas — ou si aucune
 * observation n'existe. Jamais un zéro à la place.
 */
export type YtdChange = { absolute: number; pct: number; basis: number; toDate: string };

export function ytdChange(instrument: Instrument, obs: Observation[]): YtdChange | null {
  const latest = latestObservation(obs);
  if (instrument.ytdBasis === null || instrument.ytdBasis === 0 || !latest) return null;
  return {
    absolute: latest.value - instrument.ytdBasis,
    pct: ((latest.value - instrument.ytdBasis) / instrument.ytdBasis) * 100,
    basis: instrument.ytdBasis,
    toDate: latest.date,
  };
}

/** Le seul écart relatif, pour les appelants qui n'affichent qu'un pourcentage. */
export function ytdPerformance(
  instrument: Instrument,
  obs: Observation[],
): number | null {
  return ytdChange(instrument, obs)?.pct ?? null;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Performance sur 1 mois glissant, ancrée sur la dernière observation disponible. */
export function oneMonthPerformance(obs: Observation[]): Performance | null {
  const latest = latestObservation(obs);
  if (!latest) return null;
  return performanceSince(obs, addDays(latest.date, -30));
}

/** Performance sur 1 an glissant, ancrée sur la dernière observation disponible. */
export function oneYearPerformance(obs: Observation[]): Performance | null {
  const latest = latestObservation(obs);
  if (!latest) return null;
  return performanceSince(obs, addDays(latest.date, -365));
}

/** Nombre de jours calendaires entre deux dates ISO. */
function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Au-delà de cet écart, deux clôtures ne se suivent plus : ce n'est plus une variation de
 * séance mais un saut au-dessus d'un trou. Sept jours laissent passer un week-end prolongé
 * par un jour férié — le cas que le seed exerce — sans laisser passer un mois d'absence.
 */
export const MAX_SESSION_GAP_DAYS = 7;

export type DailyChange = {
  absolute: number; // dans l'unité de l'instrument : points d'indice, dollars, points de taux
  pct: number; // variation relative, en %
  direction: "up" | "down" | "flat";
  fromDate: string;
  fromValue: number;
  toDate: string;
  toValue: number;
};

/**
 * Variation entre la dernière clôture et la précédente. `null` dans deux cas, jamais
 * remplacée par un tiret ni par zéro : la série n'a qu'une clôture, ou l'écart entre les deux
 * dernières dépasse `MAX_SESSION_GAP_DAYS`. Comparer une clôture à une autre vieille d'un mois
 * et appeler le résultat « variation du jour » serait faux — l'appelant doit alors se rabattre
 * sur la dernière valeur connue et sa date.
 */
export function dailyChange(
  obs: Observation[],
  maxGapDays: number = MAX_SESSION_GAP_DAYS,
): DailyChange | null {
  const sorted = sortedByDate(obs);
  const to = sorted.at(-1);
  const from = sorted.at(-2);
  if (!to || !from) return null;
  if (from.value === 0) return null;
  if (daysBetween(from.date, to.date) > maxGapDays) return null;

  const absolute = to.value - from.value;
  return {
    absolute,
    pct: (absolute / Math.abs(from.value)) * 100,
    direction: absolute > 0 ? "up" : absolute < 0 ? "down" : "flat",
    fromDate: from.date,
    fromValue: from.value,
    toDate: to.date,
    toValue: to.value,
  };
}
