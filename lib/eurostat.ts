import { z } from "zod";
import { LOOKBACK_PERIODS, type EurostatMapping } from "@/config/eurostat-series";

export const EUROSTAT_SOURCE = "Eurostat";

const BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

// ---------------------------------------------------------------------------
// Schéma — Eurostat sert du JSON-stat 2.0, pas un tableau plat comme FRED
// ---------------------------------------------------------------------------

/**
 * `value` est une carte « index aplati → nombre ». Une observation manquante n'est pas à zéro
 * ni à null : sa clé est simplement **absente**. C'est ce qui permet de l'écarter sans jamais
 * la remplacer.
 *
 * `size` donne la taille de chaque dimension dans l'ordre de `id`. C'est lui qui permet de
 * vérifier qu'une seule série a été demandée.
 */
const jsonStatSchema = z.object({
  value: z.record(z.string(), z.number().nullable()),
  id: z.array(z.string()),
  size: z.array(z.number()),
  dimension: z.record(
    z.string(),
    z.object({
      label: z.string().optional(),
      category: z.object({
        index: z.record(z.string(), z.number()).optional(),
        label: z.record(z.string(), z.string()).optional(),
      }),
    }),
  ),
});

export type EurostatPoint = { date: string; value: number };

export type EurostatFetchResult =
  /** Eurostat a répondu et la réponse est exploitable. `points` peut être vide. */
  | { ok: true; points: EurostatPoint[]; unitLabel: string | null }
  /** Rien n'est écrit. La dernière valeur valide reste en place. */
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------------

/**
 * Normalise une période Eurostat en date ISO : `2026-07` → `2026-07-01`,
 * `2026-Q2` → `2026-04-01`, `2026` → `2026-01-01`.
 *
 * Le **premier jour de la période**, comme FRED date ses séries mensuelles — c'est ce qui rend
 * les tolérances de retard de publication déjà calibrées valables telles quelles.
 */
export function periodToDate(period: string): string | null {
  const monthly = /^(\d{4})-(\d{2})$/.exec(period);
  if (monthly) return `${monthly[1]}-${monthly[2]}-01`;

  const quarterly = /^(\d{4})-Q([1-4])$/.exec(period);
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

/**
 * Un appel, une série, une fois par jour. Les dimensions viennent telles quelles de la
 * configuration : ce module n'en interprète aucune, il les sérialise.
 */
export function buildEurostatUrl(mapping: EurostatMapping): string {
  const params = new URLSearchParams({ format: "JSON", lang: "EN" });
  for (const [key, value] of Object.entries(mapping.dimensions)) params.set(key, value);
  params.set("lastTimePeriod", String(LOOKBACK_PERIODS[mapping.cadence]));
  return `${BASE_URL}/${mapping.dataset}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Transforme une réponse JSON-stat en points exploitables, ou en échec explicite.
 *
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques — c'est ici
 * que se jouent les deux règles qui protègent des chiffres faux :
 *
 * 1. **Une dimension laissée ouverte fait rejeter toute la réponse.** Si une dimension autre
 *    que le temps a une taille supérieure à 1, c'est qu'elle n'a pas été fixée : Eurostat sert
 *    alors plusieurs séries mélangées, et la première valeur venue serait un chiffre plausible
 *    et faux. On nomme la dimension fautive plutôt que de deviner.
 * 2. **Une valeur hors bornes fait rejeter toute la réponse**, pas seulement le point fautif :
 *    si l'unité n'est pas celle qu'on croit, c'est la série entière qui est fausse.
 */
export function parseEurostatResponse(
  mapping: EurostatMapping,
  payload: unknown,
): EurostatFetchResult {
  const parsed = jsonStatSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }
  const data = parsed.data;

  const timeAxis = data.id.indexOf("time");
  if (timeAxis === -1) {
    return { ok: false, error: "réponse sans dimension « time » : série inexploitable" };
  }

  // Garde-fou n° 1 : toute dimension autre que le temps doit être réduite à une seule valeur.
  const open = data.id
    .map((name, i) => ({ name, size: data.size[i] }))
    .filter((d) => d.name !== "time" && d.size !== 1);
  if (open.length > 0) {
    const named = open.map((d) => `${d.name} (${d.size} valeurs)`).join(", ");
    return {
      ok: false,
      error:
        `dimension non fixée : ${named}. La réponse mélange plusieurs séries — ` +
        `compléter « dimensions » dans config/eurostat-series.ts, série non écrite`,
    };
  }

  const index = data.dimension.time?.category.index;
  if (!index) {
    return { ok: false, error: "réponse sans index de périodes : série inexploitable" };
  }

  // index : période → position. On l'inverse pour lire les clés de `value`.
  const periodAt = new Map<number, string>();
  for (const [period, position] of Object.entries(index)) periodAt.set(position, period);

  const points: EurostatPoint[] = [];
  for (const [flatIndex, value] of Object.entries(data.value)) {
    // Une observation manquante peut être absente ou explicitement nulle : les deux sont
    // écartées, aucune n'est remplacée par zéro.
    if (value === null || !Number.isFinite(value)) continue;

    const period = periodAt.get(Number(flatIndex));
    if (period === undefined) continue;
    const date = periodToDate(period);
    if (date === null) continue;

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes en ${period} : ${value} attendu dans [${min} ; ${max}] — ` +
          `dimensions probablement mal choisies, série non écrite`,
      };
    }

    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));

  const unitDimension = Object.keys(mapping.dimensions).includes("unit")
    ? data.dimension.unit
    : undefined;
  const unitLabel = unitDimension
    ? (Object.values(unitDimension.category.label ?? {})[0] ?? null)
    : null;

  return { ok: true, points, unitLabel };
}

/** Appelle Eurostat pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchEurostatSeries(
  mapping: EurostatMapping,
): Promise<EurostatFetchResult> {
  let response: Response;
  try {
    response = await fetch(buildEurostatUrl(mapping), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${(error as Error).message}` };
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

  return parseEurostatResponse(mapping, payload);
}
