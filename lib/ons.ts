import { z } from "zod";
import type { OnsMapping } from "@/config/ons-series";
import { describeFetchError, fetchWithTimeout } from "./http";

export const ONS_SOURCE = "ONS";

const BASE_URL = "https://api.ons.gov.uk/timeseries";

// ---------------------------------------------------------------------------
// Schéma — l'API ONS sert une série à la fois (contrairement à Eurostat), avec un tableau par
// cadence : `months`, `quarters`, `years`. Pas de dimension à fixer, donc pas du risque de
// mélange qu'Eurostat impose — le seul risque ici est de lire le mauvais tableau.
// ---------------------------------------------------------------------------

const onsPointSchema = z.object({
  date: z.string(),
  // Chaîne chez ONS, comme chez FRED — une valeur provisoire ou manquante y est une chaîne
  // vide, jamais un zéro : la passe sémantique l'écarte, jamais un `Number()` qui ferait NaN.
  value: z.string(),
});

const onsResponseSchema = z.object({
  months: z.array(onsPointSchema).optional(),
  quarters: z.array(onsPointSchema).optional(),
  years: z.array(onsPointSchema).optional(),
  description: z.object({ unit: z.string().optional() }).optional(),
});

export type OnsPoint = { date: string; value: number };

export type OnsFetchResult =
  | { ok: true; points: OnsPoint[]; unitLabel: string | null }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Périodes — ONS date « 2026 JUL », « 2026 Q3 », « 2026 ». Même principe qu'Eurostat : le
// premier jour de la période, pour rester compatible avec les tolérances de retard déjà
// calibrées sur cette convention.
// ---------------------------------------------------------------------------

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

export function periodToDate(period: string): string | null {
  const monthly = /^(\d{4}) ([A-Z]{3})$/.exec(period);
  if (monthly && MONTHS[monthly[2]]) return `${monthly[1]}-${MONTHS[monthly[2]]}-01`;

  const quarterly = /^(\d{4}) Q([1-4])$/.exec(period);
  if (quarterly) {
    const month = String((Number(quarterly[2]) - 1) * 3 + 1).padStart(2, "0");
    return `${quarterly[1]}-${month}-01`;
  }

  const annual = /^(\d{4})$/.exec(period);
  if (annual) return `${annual[1]}-01-01`;

  return null;
}

// ---------------------------------------------------------------------------
// Requête
// ---------------------------------------------------------------------------

/** Un appel, une série, une fois par jour — même contrainte que FRED et Eurostat. Sans clé. */
export function buildOnsUrl(mapping: OnsMapping): string {
  return `${BASE_URL}/${mapping.timeseriesId}/dataset/${mapping.datasetId}/data`;
}

function arrayFor(payload: z.infer<typeof onsResponseSchema>, cadence: OnsMapping["cadence"]) {
  if (cadence === "monthly") return payload.months;
  if (cadence === "quarterly") return payload.quarters;
  if (cadence === "annual") return payload.years;
  return undefined;
}

/**
 * Transforme une réponse ONS brute en points exploitables, ou en échec explicite. Séparée de
 * l'appel réseau pour être testable sur des charges utiles synthétiques.
 */
export function parseOnsResponse(mapping: OnsMapping, payload: unknown): OnsFetchResult {
  const parsed = onsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const series = arrayFor(parsed.data, mapping.cadence);
  if (series === undefined) {
    return {
      ok: false,
      error: `la réponse ne porte pas de tableau « ${mapping.cadence === "monthly" ? "months" : mapping.cadence === "quarterly" ? "quarters" : "years"} » — cadence probablement mal déclarée`,
    };
  }

  const points: OnsPoint[] = [];
  for (const entry of series) {
    if (entry.value.trim() === "") continue; // provisoire ou manquant, jamais remplacé par zéro
    const value = Number(entry.value);
    if (!Number.isFinite(value)) continue;

    const date = periodToDate(entry.date);
    if (date === null) continue;

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes en ${entry.date} : ${value} attendu dans [${min} ; ${max}] — ` +
          `identifiant probablement erroné, série non écrite`,
      };
    }

    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));

  return { ok: true, points, unitLabel: parsed.data.description?.unit ?? null };
}

/** Appelle l'API ONS pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchOnsSeries(mapping: OnsMapping): Promise<OnsFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildOnsUrl(mapping), {
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

  return parseOnsResponse(mapping, payload);
}
