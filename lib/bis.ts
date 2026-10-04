import type { BisMapping } from "@/config/bis-series";
import { describeFetchError, fetchWithTimeout } from "./http";

const BASE_URL = "https://stats.bis.org/api/v2/data/dataflow/BIS";

// Les séries BRI sont mensuelles ou trimestrielles : trois à quatre ans d'historique remplissent
// la fiche d'un indicateur (« une série sur trois ans ») sans alourdir l'appel.
const LOOKBACK_MONTHS: Record<BisMapping["frequency"], number> = { monthly: 40, quarterly: 48 };

function startPeriod(mapping: BisMapping, now: Date): string {
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - LOOKBACK_MONTHS[mapping.frequency], 1),
  );
  const year = from.getUTCFullYear();
  if (mapping.frequency === "quarterly") {
    return `${year}-Q${Math.floor(from.getUTCMonth() / 3) + 1}`;
  }
  return `${year}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * `format=csv` : l'API v2 refuse `jsondata` (code 406) — voir `config/bis-series.ts`.
 */
export function buildBisUrl(mapping: BisMapping, now: Date): string {
  const params = new URLSearchParams({
    startPeriod: startPeriod(mapping, now),
    format: "csv",
  });
  return `${BASE_URL}/${mapping.flow}/${mapping.version}/${mapping.key}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// CSV — un champ peut être entre guillemets et contenir virgules, guillemets doublés et sauts de
// ligne (la description de la cible de la BoJ en porte des dizaines). Un découpage naïf sur la
// virgule décalerait toutes les colonnes d'une ligne sur l'autre.
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

/**
 * Une période BRI en date ISO, au premier jour de la période — même convention qu'Eurostat et
 * l'ONS : `2026-06` → `2026-06-01`, `2026-Q1` → `2026-01-01`.
 */
export function periodToIsoDate(period: string): string | null {
  const monthly = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (monthly) return `${monthly[1]}-${monthly[2]}-01`;
  const quarterly = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarterly) {
    const month = String((Number(quarterly[2]) - 1) * 3 + 1).padStart(2, "0");
    return `${quarterly[1]}-${month}-01`;
  }
  return null;
}

export type BisPoint = { date: string; value: number };

export type BisFetchResult = { ok: true; points: BisPoint[] } | { ok: false; error: string };

/**
 * Transforme le CSV brut de la BRI en points exploitables, ou en échec explicite. Séparée de
 * l'appel réseau pour être testable sur des charges utiles synthétiques.
 *
 * Une réponse qui n'est pas du CSV — l'API répond une erreur en XML, avec un code HTTP — est
 * rejetée en nommant ce qui manque. Une réponse **vide** (en-tête seul) est un succès sans point :
 * rien n'a été publié sur la fenêtre, ce n'est pas une panne.
 */
export function parseBisResponse(mapping: BisMapping, text: string): BisFetchResult {
  const rows = parseCsv(text);
  const header = rows[0];
  if (!header) return { ok: false, error: "réponse vide : ni en-tête ni ligne" };

  const iPeriod = header.indexOf("TIME_PERIOD");
  const iValue = header.indexOf("OBS_VALUE");
  const iArea = header.indexOf(mapping.areaColumn);
  if (iPeriod < 0 || iValue < 0 || iArea < 0) {
    const apercu = text.trim().slice(0, 120).replace(/\s+/g, " ");
    return {
      ok: false,
      error: `réponse malformée — colonnes TIME_PERIOD, OBS_VALUE et ${mapping.areaColumn} attendues (début : « ${apercu} »)`,
    };
  }

  const points: BisPoint[] = [];
  for (const row of rows.slice(1)) {
    const area = row[iArea];
    if (area !== mapping.area) {
      return {
        ok: false,
        error: `pays « ${area} » dans la réponse, « ${mapping.area} » attendu — clé SDMX probablement erronée`,
      };
    }

    const raw = row[iValue];
    if (raw === undefined || raw.trim() === "") continue; // valeur manquante, jamais un zéro
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    const date = periodToIsoDate(row[iPeriod] ?? "");
    if (date === null) continue; // période inattendue : ignorée plutôt que devinée

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes le ${date} : ${value} attendu dans [${min} ; ${max}] — ` +
          `clé probablement erronée, série non écrite`,
      };
    }
    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/** Appelle l'API BRI pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchBisSeries(mapping: BisMapping, now: Date): Promise<BisFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildBisUrl(mapping, now), {
      headers: { Accept: "text/csv" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${describeFetchError(error)}` };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: "corps de réponse illisible" };
  }

  if (!response.ok) {
    // Le corps d'une erreur BRI est du XML : `parseBisResponse` le refuserait, mais le code HTTP
    // dit mieux ce qui s'est passé.
    return { ok: false, error: `HTTP ${response.status} — ${response.statusText}` };
  }
  return parseBisResponse(mapping, text);
}
