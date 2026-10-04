import type { OecdMapping } from "@/config/oecd-series";
import { describeFetchError, fetchWithTimeout } from "./http";
import { parseCsv, periodToIsoDate } from "./bis";

const BASE_URL = "https://sdmx.oecd.org/public/rest/data";

// Seize trimestres : quatre ans, de quoi remplir « une série sur trois ans ». `lastNObservations`
// plutôt qu'une période de début : c'est la forme confirmée par appel réel.
const LAST_OBSERVATIONS = 16;

export function buildOecdUrl(mapping: OecdMapping): string {
  const params = new URLSearchParams({
    lastNObservations: String(LAST_OBSERVATIONS),
    format: "csv",
  });
  return `${BASE_URL}/${mapping.agency},${mapping.dataflow},${mapping.version}/${mapping.key}?${params.toString()}`;
}

export type OecdPoint = { date: string; value: number };

export type OecdFetchResult = { ok: true; points: OecdPoint[] } | { ok: false; error: string };

/**
 * Transforme le CSV brut de l'OCDE en points exploitables, ou en échec explicite. Séparée de
 * l'appel réseau pour être testable sur des charges utiles synthétiques.
 *
 * `NoResultsFound` — la réponse de l'OCDE à une clé qui ne désigne rien, **y compris à une clé
 * mal numérotée** — est refusée en le disant : c'est ce message qui a fait croire trois fois que
 * l'OCDE n'avait pas la donnée. Une réponse qui est du CSV mais sans ligne est, elle, un succès sans
 * point : rien n'a été publié sur la fenêtre.
 */
export function parseOecdResponse(mapping: OecdMapping, text: string): OecdFetchResult {
  if (text.trim() === "NoResultsFound") {
    return {
      ok: false,
      error:
        "NoResultsFound — la clé ne désigne aucune série (treize dimensions, numérotées de 1 à 13 : " +
        "vérifier l'ordre avant de conclure que la donnée n'existe pas)",
    };
  }

  const rows = parseCsv(text);
  const header = rows[0];
  if (!header) return { ok: false, error: "réponse vide : ni en-tête ni ligne" };

  const col = (name: string) => header.indexOf(name);
  const iPeriod = col("TIME_PERIOD");
  const iValue = col("OBS_VALUE");
  const iArea = col("REF_AREA");
  const iTransformation = col("TRANSFORMATION");
  if (iPeriod < 0 || iValue < 0 || iArea < 0 || iTransformation < 0) {
    const apercu = text.trim().slice(0, 120).replace(/\s+/g, " ");
    return {
      ok: false,
      error: `réponse malformée — colonnes TIME_PERIOD, OBS_VALUE, REF_AREA et TRANSFORMATION attendues (début : « ${apercu} »)`,
    };
  }

  const points: OecdPoint[] = [];
  for (const row of rows.slice(1)) {
    if (row[iArea] !== mapping.area) {
      return {
        ok: false,
        error: `pays « ${row[iArea]} » dans la réponse, « ${mapping.area} » attendu — clé SDMX probablement erronée`,
      };
    }
    if (row[iTransformation] !== mapping.transformation) {
      return {
        ok: false,
        error: `transformation « ${row[iTransformation]} » dans la réponse, « ${mapping.transformation} » attendue — la série n'est pas celle qu'on croit`,
      };
    }

    const raw = row[iValue];
    if (raw === undefined || raw.trim() === "") continue; // valeur manquante, jamais un zéro
    const brut = Number(raw);
    if (!Number.isFinite(brut)) continue;

    const date = periodToIsoDate(row[iPeriod] ?? "");
    if (date === null) continue; // période inattendue : ignorée plutôt que devinée

    // La source publie parfois neuf décimales (« 0.726654038 ») : deux suffisent, comme pour les
    // autres taux de croissance. C'est de la présentation d'un nombre déjà publié, pas un recalcul.
    const value = Math.round(brut * 100) / 100;

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

/** Appelle l'API OCDE pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchOecdSeries(mapping: OecdMapping): Promise<OecdFetchResult> {
  let response: Response;
  try {
    // Aucun en-tête posé : le format se demande dans l'URL (`format=csv`). L'API répond 500 à
    // certaines requêtes `fetch` que `curl` obtient pour la même URL — cause en cours d'isolation,
    // voir `scripts/oecd-check.mts`.
    response = await fetchWithTimeout(buildOecdUrl(mapping), { cache: "no-store" });
  } catch (error) {
    return { ok: false, error: `appel impossible — ${describeFetchError(error)}` };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: "corps de réponse illisible" };
  }

  // Une clé sans résultat répond `NoResultsFound` avec un code 404 : le corps dit mieux que le code.
  if (!response.ok && text.trim() !== "NoResultsFound") {
    return { ok: false, error: `HTTP ${response.status} — ${response.statusText}` };
  }
  return parseOecdResponse(mapping, text);
}
