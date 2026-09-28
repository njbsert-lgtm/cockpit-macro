import { z } from "zod";
import type { AlphaVantageMapping } from "@/config/alpha-vantage-series";
import { describeFetchError, fetchWithTimeout } from "./http";

export const ALPHA_VANTAGE_SOURCE = "Alpha Vantage";

const BASE_URL = "https://www.alphavantage.co/query";

// ---------------------------------------------------------------------------
// Schémas
// ---------------------------------------------------------------------------

/**
 * Alpha Vantage sert l'historique quotidien sous une clé qui porte le nom de la fonction
 * appelée — « Time Series (Daily) » pour `TIME_SERIES_DAILY` — plutôt qu'un nom fixe. Comme
 * pour `sonder-alphavantage-ytd` (`.github/workflows/verification-sources.yml`), la clé est
 * découverte au lieu d'être supposée : un renommage de l'API se traduirait par une réponse
 * malformée journalisée, jamais par un plantage silencieux.
 */
const dailyPointSchema = z.object({ "4. close": z.string() });

const timeSeriesResponseSchema = z
  .object({})
  .catchall(z.unknown())
  .transform((raw, ctx) => {
    const key = Object.keys(raw).find((k) => /Time Series/i.test(k));
    if (!key) {
      ctx.addIssue({ code: "custom", message: "aucune clé « Time Series » dans la réponse" });
      return z.NEVER;
    }
    const series = z.record(z.string(), z.unknown()).safeParse(raw[key]);
    if (!series.success) {
      ctx.addIssue({ code: "custom", message: `clé « ${key} » illisible` });
      return z.NEVER;
    }
    return series.data;
  });

/**
 * Les trois formes d'échec qu'Alpha Vantage sert avec un HTTP 200 — jamais un code d'erreur
 * HTTP, donc invisibles sans un schéma dédié : `Error Message` pour un symbole inconnu,
 * `Note` et `Information` pour un plafond d'appels dépassé (le message exact a changé plus
 * d'une fois côté Alpha Vantage, d'où les trois clés plutôt qu'une seule).
 */
const errorSchema = z.object({
  "Error Message": z.string().optional(),
  Note: z.string().optional(),
  Information: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Résultat d'une collecte
// ---------------------------------------------------------------------------

export type AlphaVantagePoint = { date: string; value: number };

export type AlphaVantageFetchResult =
  | { ok: true; points: AlphaVantagePoint[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Collecte
// ---------------------------------------------------------------------------

// Palier gratuit à 5 appels par minute — le plus serré des quatre sources, plus contraignant
// que Twelve Data (8/min, mais seulement deux symboles actifs). Avec sept symboles et un cron
// borné à 60 s au total (plan Hobby), les espacer correctement pour rester sous 5/min prendrait
// à lui seul plus de temps que tout le budget disponible : le choix assumé est de les appeler
// à la suite, sans délai, et de laisser le contrôle de plausibilité/erreur absorber un éventuel
// refus « Note » les jours où l'un des sept tombe après le cinquième appel de la minute — l'état
// 5 du cahier (dernière valeur connue, datée) plutôt qu'un blocage. Le délai resserré ci-dessous
// (même correction que celle qui a réglé la famine de `wti` sur FRED) garantit au moins qu'un
// seul appel lent ne peut pas à lui seul épuiser le budget du module.
const ALPHA_VANTAGE_CALL_TIMEOUT_MS = 5_000;

/**
 * Un appel, un symbole, une fois par jour — même contrainte que FRED, Twelve Data et Eurostat.
 * `outputsize=compact` sert les cent derniers points, largement assez pour re-confirmer le
 * jour même et rattraper un trou court ; Alpha Vantage ne propose pas de fenêtre par dates
 * comme FRED ou Twelve Data, seulement ce plafond ou l'historique complet.
 */
export function buildDailySeriesUrl(mapping: AlphaVantageMapping, apiKey: string): string {
  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol: mapping.symbol,
    outputsize: "compact",
    apikey: apiKey,
  });
  return `${BASE_URL}?${params.toString()}`;
}

/**
 * Transforme une réponse Alpha Vantage brute en points exploitables, ou en échec explicite.
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques.
 */
export function parseAlphaVantageSeries(
  mapping: AlphaVantageMapping,
  payload: unknown,
): AlphaVantageFetchResult {
  const asError = errorSchema.safeParse(payload);
  if (asError.success) {
    const message =
      asError.data["Error Message"] ?? asError.data.Note ?? asError.data.Information;
    if (message) return { ok: false, error: `Alpha Vantage — ${message}` };
  }

  const parsed = timeSeriesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const points: AlphaVantagePoint[] = [];
  for (const [date, raw] of Object.entries(parsed.data)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const point = dailyPointSchema.safeParse(raw);
    if (!point.success) continue;

    const value = Number(point.data["4. close"]);
    if (!Number.isFinite(value)) continue;

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${date} : ${value} attendu dans [${min} ; ${max}] — ` +
          `symbole probablement différent de « ${mapping.symbol} », série non écrite`,
      };
    }

    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/** Appelle Alpha Vantage pour un symbole. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchAlphaVantageSeries(
  mapping: AlphaVantageMapping,
  apiKey: string,
): Promise<AlphaVantageFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildDailySeriesUrl(mapping, apiKey), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      timeoutMs: ALPHA_VANTAGE_CALL_TIMEOUT_MS,
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

  return parseAlphaVantageSeries(mapping, payload);
}
