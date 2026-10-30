import { fournisseurInstrument } from "@/config/providers";
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

// ---------------------------------------------------------------------------
// Variation hebdomadaire par instrument — J1.2, réutilisée telle quelle par J7.1
// ---------------------------------------------------------------------------

/** Durée de la période, en jours calendaires : celle de « sur la semaine » dans le contrôle des chiffres. */
export const WEEK_DAYS = 7;

export type WeeklyUnit = "bps" | "pct";

export type WeeklyChange = {
  instrumentId: string;
  status: "ok";
  /** Variation recalculée : points de base si `unit` vaut `bps`, pourcentage sinon. */
  value: number;
  unit: WeeklyUnit;
  fromDate: string;
  fromValue: number;
  toDate: string;
  toValue: number;
};

export type WeeklyUnavailable = {
  instrumentId: string;
  status: "indisponible";
  /** `non-suivi` : aucune source ne collecte l'instrument. `donnee-absente` : clôture manquante ou trou. */
  reason: "non-suivi" | "donnee-absente";
  /** Phrase prête à afficher : « non suivi », « donnée absente au 11/09 »… */
  message: string;
};

export type WeeklyResult = WeeklyChange | WeeklyUnavailable;

function jourMois(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Variation sur la semaine d'un instrument, **recalculée** depuis deux clôtures en base — jamais
 * reprise d'une source. Même règle que le contrôle des chiffres (`verdictVariation`) : la borne
 * de fin est la dernière clôture à `dateFin` ou avant (la dernière tout court par défaut), la
 * borne de début la dernière clôture à `fin − 7 jours` ou avant.
 *
 * Pas de trou : chaque borne doit tomber à moins de `MAX_SESSION_GAP_DAYS` jours de sa date
 * nominale. Un week-end ou un férié passe ; une série mensuelle (Bund, OAT, cuivre) ou une
 * collecte interrompue donne « donnée absente au JJ/MM » — la date nominale qui manque.
 *
 * Un taux ou un spread (`unit: "percent"`) se rend en points de base, tout le reste en %.
 * `collecte` dit si l'instrument est réellement collecté (par défaut : un fournisseur actif).
 */
export function weeklyChange(
  instrument: Pick<Instrument, "id" | "unit">,
  obs: Observation[],
  options: { dateFin?: string; collecte?: boolean } = {},
): WeeklyResult {
  const id = instrument.id;
  const collecte = options.collecte ?? fournisseurInstrument(id) !== null;
  if (!collecte) {
    return { instrumentId: id, status: "indisponible", reason: "non-suivi", message: "non suivi" };
  }

  const absent = (date: string | null): WeeklyUnavailable => ({
    instrumentId: id,
    status: "indisponible",
    reason: "donnee-absente",
    message: date ? `donnée absente au ${jourMois(date)}` : "donnée absente",
  });

  const latest = latestObservation(obs);
  // Aucune clôture : sans date de fin donnée, il n'y a pas de date à citer.
  if (!latest) return absent(options.dateFin ?? null);

  const dateFin = options.dateFin ?? latest.date;
  const to = observationOnOrBefore(obs, dateFin);
  if (!to || daysBetween(to.date, dateFin) > MAX_SESSION_GAP_DAYS) return absent(dateFin);

  const dateDebut = addDays(to.date, -WEEK_DAYS);
  const from = observationOnOrBefore(obs, dateDebut);
  if (!from || daysBetween(from.date, dateDebut) > MAX_SESSION_GAP_DAYS || from.value === 0) {
    return absent(dateDebut);
  }

  const unit: WeeklyUnit = instrument.unit === "percent" ? "bps" : "pct";
  const absolute = to.value - from.value;
  return {
    instrumentId: id,
    status: "ok",
    value: unit === "bps" ? absolute * 100 : (absolute / Math.abs(from.value)) * 100,
    unit,
    fromDate: from.date,
    fromValue: from.value,
    toDate: to.date,
    toValue: to.value,
  };
}

/**
 * Une ligne par instrument, dans l'ordre reçu — **jamais de moyenne ni d'agrégat par classe** :
 * la moyenne simple d'indices n'est l'indice de personne. `observations` : clôtures par id.
 */
export function weeklyChanges(
  instruments: Array<Pick<Instrument, "id" | "unit">>,
  observations: Record<string, Observation[]>,
  options: { dateFin?: string; collecte?: (id: string) => boolean } = {},
): WeeklyResult[] {
  return instruments.map((i) =>
    weeklyChange(i, observations[i.id] ?? [], {
      dateFin: options.dateFin,
      collecte: options.collecte ? options.collecte(i.id) : undefined,
    }),
  );
}
