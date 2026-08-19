import { z } from "zod";
import { LOOKBACK_DAYS, type FredMapping } from "@/config/fred-series";
import { describeFetchError, fetchWithTimeout } from "./http";

export const FRED_SOURCE = "FRED";

const FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations";
const FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series";

// ---------------------------------------------------------------------------
// Schémas
// ---------------------------------------------------------------------------

/**
 * `value` est une chaîne chez FRED, et vaut « . » quand l'observation manque. On l'accepte
 * donc comme chaîne au niveau structurel : c'est la passe sémantique qui écarte les trous,
 * jamais un `Number()` qui produirait NaN, ni un `|| 0` qui inscrirait un zéro.
 */
const observationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ"),
  value: z.string(),
});

const observationsResponseSchema = z.object({
  observations: z.array(observationSchema),
});

const seriesMetadataSchema = z.object({
  seriess: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        units: z.string(),
        frequency: z.string(),
        last_updated: z.string().optional(),
      }),
    )
    .min(1),
});

export type FredSeriesMetadata = z.infer<typeof seriesMetadataSchema>["seriess"][number];

// ---------------------------------------------------------------------------
// Résultat d'une collecte
// ---------------------------------------------------------------------------

export type FredPoint = { date: string; value: number };

export type FredFetchResult =
  /** FRED a répondu et la réponse est exploitable. `points` peut être vide : rien de neuf
   *  n'est pas une erreur, c'est le cas normal d'un week-end ou d'une série mensuelle. */
  | { ok: true; points: FredPoint[] }
  /** Rien n'est écrit. La dernière valeur valide reste en place. */
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Collecte
// ---------------------------------------------------------------------------

function observationStart(cadence: FredMapping["cadence"], now: Date): string {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS[cadence]);
  return start.toISOString().slice(0, 10);
}

/**
 * Un appel, une série, une fois par jour — la contrainte du cahier des charges. La
 * transformation d'unité (`pc1`) est un paramètre de la requête, faite par FRED : elle ne
 * coûte pas d'appel supplémentaire.
 */
export function buildObservationsUrl(
  mapping: FredMapping,
  apiKey: string,
  now: Date = new Date(),
): string {
  const params = new URLSearchParams({
    series_id: mapping.seriesId,
    api_key: apiKey,
    file_type: "json",
    units: mapping.units,
    observation_start: observationStart(mapping.cadence, now),
    sort_order: "asc",
  });
  return `${FRED_OBSERVATIONS_URL}?${params.toString()}`;
}

/**
 * Transforme une réponse FRED brute en points exploitables, ou en échec explicite.
 *
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques — c'est
 * ici que se joue la règle « une réponse malformée est journalisée et ignorée, elle n'écrase
 * jamais la dernière valeur valide ».
 */
export function parseFredObservations(mapping: FredMapping, payload: unknown): FredFetchResult {
  const parsed = observationsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const points: FredPoint[] = [];
  for (const raw of parsed.data.observations) {
    // « . » est la marque FRED d'une observation manquante : un jour férié sur une série
    // quotidienne, un mois pas encore publié. On l'écarte, on ne la remplace pas.
    if (raw.value === ".") continue;

    const value = Number(raw.value);
    if (!Number.isFinite(value)) continue;

    // Une valeur hors bornes ne signale pas un point aberrant mais une unité qui n'est pas
    // celle qu'on croit — auquel cas toute la série est fausse, pas ce seul point. On rejette
    // l'ensemble plutôt que d'en stocker une partie.
    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${raw.date} : ${value} attendu dans [${min} ; ${max}] — ` +
          `unité probablement différente de « ${mapping.units} », série non écrite`,
      };
    }

    points.push({ date: raw.date, value });
  }

  return { ok: true, points };
}

/** Appelle FRED pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchFredSeries(
  mapping: FredMapping,
  apiKey: string,
  now: Date = new Date(),
): Promise<FredFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildObservationsUrl(mapping, apiKey, now), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${describeFetchError(error)}` };
  }

  if (!response.ok) {
    // FRED détaille ses refus dans le corps ; le tronquer évite de gonfler la table de santé.
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

  return parseFredObservations(mapping, payload);
}

// ---------------------------------------------------------------------------
// Métadonnées — pour la vérification à blanc, jamais pour le cron quotidien
// ---------------------------------------------------------------------------

export type MetadataCheck = {
  seriesId: string;
  ok: boolean;
  actual?: { title: string; units: string; frequency: string };
  problems: string[];
};

/**
 * Confronte les métadonnées réelles d'une série à ce que la config déclare. Appelée par
 * `npm run fred:check`, jamais par le cron : elle consommerait un second appel par série et
 * par jour, ce que le cahier des charges interdit.
 */
export async function checkSeriesMetadata(
  mapping: FredMapping,
  apiKey: string,
): Promise<MetadataCheck> {
  const params = new URLSearchParams({
    series_id: mapping.seriesId,
    api_key: apiKey,
    file_type: "json",
  });

  let payload: unknown;
  try {
    const response = await fetchWithTimeout(`${FRED_SERIES_URL}?${params.toString()}`);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        seriesId: mapping.seriesId,
        ok: false,
        problems: [`HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`],
      };
    }
    payload = await response.json();
  } catch (error) {
    return { seriesId: mapping.seriesId, ok: false, problems: [(error as Error).message] };
  }

  const parsed = seriesMetadataSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      seriesId: mapping.seriesId,
      ok: false,
      problems: ["métadonnées illisibles — la série n'existe probablement pas"],
    };
  }

  const meta = parsed.data.seriess[0];
  const problems: string[] = [];
  if (mapping.expect.units && !meta.units.includes(mapping.expect.units)) {
    problems.push(`unité « ${meta.units} », la config attend « ${mapping.expect.units} »`);
  }
  if (mapping.expect.frequency && !meta.frequency.includes(mapping.expect.frequency)) {
    problems.push(
      `fréquence « ${meta.frequency} », la config attend « ${mapping.expect.frequency} »`,
    );
  }

  return {
    seriesId: mapping.seriesId,
    ok: problems.length === 0,
    actual: { title: meta.title, units: meta.units, frequency: meta.frequency },
    problems,
  };
}
