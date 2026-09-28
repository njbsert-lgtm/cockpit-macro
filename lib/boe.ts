import type { BoeMapping } from "@/config/boe-series";
import { describeFetchError, fetchWithTimeout } from "./http";

const BASE_URL = "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp";

// Un an d'historique quotidien suffit largement à couvrir les réunions du MPC — huit par an —
// sans jamais coûter un appel démesuré. Même ordre de grandeur que `LOOKBACK_DAYS["business-
// daily"]` chez FRED (400 j).
const LOOKBACK_DAYS = 400;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NUMBER: Record<string, string> = Object.fromEntries(
  MONTHS.map((m, i) => [m, String(i + 1).padStart(2, "0")]),
);

function formatBoeDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${dd}/${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

export type BoePoint = { date: string; value: number };

export type BoeFetchResult =
  | { ok: true; points: BoePoint[] }
  | { ok: false; error: string };

/** L'URL du CSV pour une série, sur la fenêtre `[now - LOOKBACK_DAYS ; now]`. */
export function buildBoeUrl(mapping: BoeMapping, now: Date): string {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS);
  const params = new URLSearchParams({
    "csv.x": "yes",
    Datefrom: formatBoeDate(from),
    Dateto: formatBoeDate(now),
    SeriesCodes: mapping.seriesCode,
    UsingCodes: "Y",
    CSVF: "TN",
  });
  return `${BASE_URL}?${params.toString()}`;
}

const LINE_PATTERN = /^(\d{2}) ([A-Za-z]{3}) (\d{4}),(-?[\d.]+)$/;

/**
 * Transforme le CSV brut de la BoE en points exploitables, ou en échec explicite. Séparée de
 * l'appel réseau pour être testable sur des charges utiles synthétiques, même principe que
 * `parseOnsResponse` (`lib/ons.ts`).
 */
export function parseBoeCsv(mapping: BoeMapping, body: string): BoeFetchResult {
  const lines = body.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { ok: true, points: [] };

  const header = lines[0];
  if (!header.startsWith("DATE,")) {
    return { ok: false, error: `réponse inattendue — en-tête « ${header.slice(0, 120)} »` };
  }

  const points: BoePoint[] = [];
  for (const line of lines.slice(1)) {
    const match = LINE_PATTERN.exec(line.trim());
    if (!match) continue; // ligne malformée : ignorée, jamais bloquante pour le reste de la série
    const [, dd, mon, yyyy, rawValue] = match;
    const month = MONTH_NUMBER[mon];
    if (!month) continue; // mois non reconnu : même prudence

    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${dd}/${mon}/${yyyy} : ${value} attendu dans [${min} ; ${max}] ` +
          `— identifiant probablement erroné, série non écrite`,
      };
    }

    points.push({ date: `${yyyy}-${month}-${dd}`, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/** Appelle l'IADB de la BoE pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchBoeSeries(mapping: BoeMapping, now: Date): Promise<BoeFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildBoeUrl(mapping, now), { cache: "no-store" });
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

  const body = await response.text();
  return parseBoeCsv(mapping, body);
}
