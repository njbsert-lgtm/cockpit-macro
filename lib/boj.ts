import { z } from "zod";
import type { BojMapping } from "@/config/boj-series";
import { describeFetchError, fetchWithTimeout } from "./http";

const BASE_URL = "https://www.stat-search.boj.or.jp/api/v1/getDataCode";

// Un an d'historique quotidien suffit très largement — même ordre de grandeur que côté BoE.
const LOOKBACK_MONTHS = 13;

/** `AAAAMM`, seul format accepté par `startDate`/`endDate` — voir le commentaire de tête de
 * `config/boj-series.ts` sur le piège d'une date complète, rejetée avec `STATUS: 400`. */
function yearMonth(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildBojUrl(mapping: BojMapping, now: Date): string {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - LOOKBACK_MONTHS, 1));
  const params = new URLSearchParams({
    db: mapping.db,
    code: mapping.code,
    format: "json",
    lang: "en",
    startDate: yearMonth(from),
    endDate: yearMonth(now),
  });
  return `${BASE_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Schéma — `RESULTSET` porte un élément par code demandé ; un seul ici, jamais plusieurs. Les
// dates de `SURVEY_DATES` sont numériques (AAAAMMJJ), les valeurs nombre ou `null` (jour sans
// marché, jamais un zéro).
// ---------------------------------------------------------------------------

const successSchema = z.object({
  RESULTSET: z.array(
    z.object({
      SERIES_CODE: z.string(),
      VALUES: z.object({
        SURVEY_DATES: z.array(z.number()),
        VALUES: z.array(z.number().nullable()),
      }),
    }),
  ),
});

// Confirmé par appel réel : `{ STATUS: 400, MESSAGEID: "...", MESSAGE: "...", DATE: "..." }`.
const errorSchema = z.object({
  STATUS: z.number(),
  MESSAGE: z.string().optional(),
});

export type BojPoint = { date: string; value: number };

export type BojFetchResult = { ok: true; points: BojPoint[] } | { ok: false; error: string };

function toIsoDate(surveyDate: number): string | null {
  const digits = String(surveyDate);
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/**
 * Transforme la réponse brute de l'API BoJ en points exploitables, ou en échec explicite.
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques.
 */
export function parseBojResponse(mapping: BojMapping, payload: unknown): BojFetchResult {
  const asError = errorSchema.safeParse(payload);
  if (asError.success) {
    return {
      ok: false,
      error: `API BoJ — statut ${asError.data.STATUS}${asError.data.MESSAGE ? ` : ${asError.data.MESSAGE}` : ""}`,
    };
  }

  const parsed = successSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const series = parsed.data.RESULTSET.find((s) => s.SERIES_CODE === mapping.code);
  if (!series) {
    return { ok: false, error: `code « ${mapping.code} » absent de la réponse` };
  }

  const { SURVEY_DATES, VALUES } = series.VALUES;
  if (SURVEY_DATES.length !== VALUES.length) {
    return {
      ok: false,
      error: `dates et valeurs de longueurs différentes (${SURVEY_DATES.length} vs ${VALUES.length})`,
    };
  }

  const points: BojPoint[] = [];
  for (let i = 0; i < SURVEY_DATES.length; i++) {
    const value = VALUES[i];
    if (value === null) continue; // jour sans marché, jamais remplacé par zéro

    const date = toIsoDate(SURVEY_DATES[i]);
    if (date === null) continue; // format de date inattendu : ignoré plutôt que deviné

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${date} : ${value} attendu dans [${min} ; ${max}] — ` +
          `identifiant probablement erroné, série non écrite`,
      };
    }

    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/**
 * Appelle l'API BoJ pour une série. Ne lève jamais : toute panne devient un échec typé.
 *
 * Le corps est tenté quel que soit le code HTTP : une erreur applicative BoJ (`STATUS: 400`,
 * voir `errorSchema`) porte un corps JSON exploitable qu'il ne faut pas jeter au seul motif d'un
 * statut non-200 — `parseBojResponse` distingue elle-même l'erreur du succès.
 */
export async function fetchBojSeries(mapping: BojMapping, now: Date): Promise<BojFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildBojUrl(mapping, now), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${describeFetchError(error)}` };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) return { ok: false, error: `HTTP ${response.status} — ${response.statusText}` };
    return { ok: false, error: "corps de réponse illisible : ce n'est pas du JSON" };
  }

  return parseBojResponse(mapping, payload);
}
