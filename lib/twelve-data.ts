import { z } from "zod";
import { LOOKBACK_DAYS, type TwelveDataMapping } from "@/config/twelve-data-series";
import { describeFetchError, fetchWithTimeout } from "./http";

export const TWELVE_DATA_SOURCE = "Twelve Data";

const TIME_SERIES_URL = "https://api.twelvedata.com/time_series";
const QUOTE_URL = "https://api.twelvedata.com/quote";

// ---------------------------------------------------------------------------
// Schémas
// ---------------------------------------------------------------------------

/**
 * Twelve Data renvoie soit `{ values, status: "ok" }`, soit `{ code, message, status: "error" }`
 * — jamais les deux à la fois, mais sur la même route. Les deux formes sont écrites en un seul
 * schéma discriminé plutôt que de tenter `values` puis se rabattre sur `message` au hasard.
 */
const timeSeriesValueSchema = z.object({
  datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ"),
  close: z.string(),
});

const timeSeriesOkSchema = z.object({
  status: z.literal("ok").optional(),
  values: z.array(timeSeriesValueSchema),
});

const errorSchema = z.object({
  status: z.literal("error"),
  code: z.number().optional(),
  message: z.string(),
});

const quoteOkSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  currency: z.string().optional(),
  close: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Résultat d'une collecte
// ---------------------------------------------------------------------------

export type TwelveDataPoint = { date: string; value: number };

export type TwelveDataFetchResult =
  | { ok: true; points: TwelveDataPoint[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Collecte
// ---------------------------------------------------------------------------

function startDate(cadence: TwelveDataMapping["cadence"], now: Date): string {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS[cadence]);
  return start.toISOString().slice(0, 10);
}

/** Un appel, un symbole, une fois par jour — même contrainte que FRED et Eurostat. */
export function buildTimeSeriesUrl(
  mapping: TwelveDataMapping,
  apiKey: string,
  now: Date = new Date(),
): string {
  const params = new URLSearchParams({
    symbol: mapping.symbol,
    interval: "1day",
    start_date: startDate(mapping.cadence, now),
    order: "ASC",
    apikey: apiKey,
  });
  return `${TIME_SERIES_URL}?${params.toString()}`;
}

/**
 * Transforme une réponse Twelve Data brute en points exploitables, ou en échec explicite.
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques.
 */
export function parseTwelveDataSeries(
  mapping: TwelveDataMapping,
  payload: unknown,
): TwelveDataFetchResult {
  const asError = errorSchema.safeParse(payload);
  if (asError.success) {
    return { ok: false, error: `Twelve Data — ${asError.data.message}` };
  }

  const parsed = timeSeriesOkSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const points: TwelveDataPoint[] = [];
  for (const raw of parsed.data.values) {
    const value = Number(raw.close);
    if (!Number.isFinite(value)) continue;

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${raw.datetime} : ${value} attendu dans [${min} ; ${max}] — ` +
          `symbole probablement différent de « ${mapping.symbol} », série non écrite`,
      };
    }

    points.push({ date: raw.datetime, value });
  }

  return { ok: true, points };
}

/** Appelle Twelve Data pour un symbole. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchTwelveDataSeries(
  mapping: TwelveDataMapping,
  apiKey: string,
  now: Date = new Date(),
): Promise<TwelveDataFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildTimeSeriesUrl(mapping, apiKey, now), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${describeFetchError(error)}` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      error: `HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "corps de réponse illisible : ce n'est pas du JSON" };
  }

  return parseTwelveDataSeries(mapping, payload);
}

// ---------------------------------------------------------------------------
// Métadonnées — pour la vérification à blanc, jamais pour le cron quotidien
// ---------------------------------------------------------------------------

export type MetadataCheck = {
  symbol: string;
  ok: boolean;
  actual?: { name?: string; currency?: string; close?: string };
  problems: string[];
};

/**
 * Confronte la réponse `/quote` réelle à ce que la config déclare. Appelée par
 * `npm run twelve-data:check`, jamais par le cron : elle consommerait un second appel par
 * symbole et par jour, contraire au cahier des charges.
 */
export async function checkSymbolMetadata(
  mapping: TwelveDataMapping,
  apiKey: string,
): Promise<MetadataCheck> {
  const params = new URLSearchParams({ symbol: mapping.symbol, apikey: apiKey });

  let payload: unknown;
  try {
    const response = await fetchWithTimeout(`${QUOTE_URL}?${params.toString()}`);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        symbol: mapping.symbol,
        ok: false,
        problems: [`HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`],
      };
    }
    payload = await response.json();
  } catch (error) {
    return { symbol: mapping.symbol, ok: false, problems: [(error as Error).message] };
  }

  const asError = errorSchema.safeParse(payload);
  if (asError.success) {
    return { symbol: mapping.symbol, ok: false, problems: [asError.data.message] };
  }

  const parsed = quoteOkSchema.safeParse(payload);
  if (!parsed.success) {
    return { symbol: mapping.symbol, ok: false, problems: ["réponse /quote illisible"] };
  }

  const problems: string[] = [];
  if (mapping.expect.currency && parsed.data.currency !== mapping.expect.currency) {
    problems.push(
      `devise « ${parsed.data.currency ?? "absente"} », la config attend « ${mapping.expect.currency} »`,
    );
  }

  return {
    symbol: mapping.symbol,
    ok: problems.length === 0,
    actual: { name: parsed.data.name, currency: parsed.data.currency, close: parsed.data.close },
    problems,
  };
}
