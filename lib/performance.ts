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
 * Performance depuis le 1er janvier, basée sur `Instrument.ytdBasis` (clôture du 31 décembre,
 * saisie à la main) plutôt que sur une observation de la série. `null` si la base n'a pas
 * encore été saisie ou si aucune observation n'existe.
 */
export function ytdPerformance(
  instrument: Instrument,
  obs: Observation[],
): number | null {
  const latest = latestObservation(obs);
  if (instrument.ytdBasis === null || !latest) return null;
  return ((latest.value - instrument.ytdBasis) / instrument.ytdBasis) * 100;
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
