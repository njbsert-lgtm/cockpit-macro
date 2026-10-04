import type { ImfMapping } from "@/config/imf-series";
import { describeFetchError, fetchWithTimeout } from "./http";

const BASE_URL = "https://api.imf.org/external/sdmx/2.1/data";

// Trois ans et quelques mois de relevés mensuels : une série « sur trois ans » (CLAUDE.md, Onglet
// Macro). `lastNObservations` plutôt qu'une période de début : c'est la forme confirmée par appel
// réel, et elle ne dépend pas du format de période que l'IMF accepterait en entrée.
const LAST_OBSERVATIONS = 40;

export function buildImfUrl(mapping: ImfMapping): string {
  const params = new URLSearchParams({ lastNObservations: String(LAST_OBSERVATIONS) });
  return `${BASE_URL}/${mapping.agency},${mapping.flow}/${mapping.key}?${params.toString()}`;
}

/** `2026-M06` → `2026-06-01`, au premier jour du mois comme les autres sources. */
export function periodToIsoDate(period: string): string | null {
  const m = /^(\d{4})-M(0[1-9]|1[0-2])$/.exec(period);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

/** Les attributs d'une balise XML, sans dépendance : `NOM="valeur"`, entités décodées. */
function attributs(balise: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of balise.matchAll(/([A-Za-z_][\w:.-]*)="([^"]*)"/g)) {
    out[m[1]] = m[2]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }
  return out;
}

export type ImfPoint = { date: string; value: number };

export type ImfFetchResult = { ok: true; points: ImfPoint[] } | { ok: false; error: string };

/**
 * Transforme la réponse XML SDMX de l'IMF en points exploitables, ou en échec explicite. Séparée
 * de l'appel réseau pour être testable sur des charges utiles synthétiques.
 *
 * Une réponse qui n'est pas un jeu de données SDMX est rejetée en citant son début. Un jeu de
 * données **sans série** est un succès sans point : rien n'a été publié sur la fenêtre.
 */
export function parseImfResponse(mapping: ImfMapping, xml: string): ImfFetchResult {
  if (!xml.includes("StructureSpecificData")) {
    const apercu = xml.trim().slice(0, 120).replace(/\s+/g, " ");
    return { ok: false, error: `réponse malformée — jeu de données SDMX attendu (début : « ${apercu} »)` };
  }

  const series = [...xml.matchAll(/<Series\b([^>]*?)\/?>([\s\S]*?)(?=<Series\b|<\/message:DataSet>|<\/Series>)/g)];
  const points: ImfPoint[] = [];

  for (const [, rawAttrs, body] of series) {
    const attrs = attributs(rawAttrs);
    if (attrs.COUNTRY !== mapping.country) {
      return {
        ok: false,
        error: `pays « ${attrs.COUNTRY} » dans la réponse, « ${mapping.country} » attendu — clé SDMX probablement erronée`,
      };
    }
    if (attrs.TYPE_OF_TRANSFORMATION !== mapping.transformation) {
      return {
        ok: false,
        error: `transformation « ${attrs.TYPE_OF_TRANSFORMATION} » dans la réponse, « ${mapping.transformation} » attendue — la série n'est pas celle qu'on croit`,
      };
    }

    for (const obs of body.matchAll(/<Obs\b([^>]*?)\/?>/g)) {
      const o = attributs(obs[1]);
      const raw = o.OBS_VALUE;
      if (raw === undefined || raw.trim() === "") continue; // valeur manquante, jamais un zéro
      const brut = Number(raw);
      if (!Number.isFinite(brut)) continue;

      const date = periodToIsoDate(o.TIME_PERIOD ?? "");
      if (date === null) continue; // période inattendue : ignorée plutôt que devinée

      // La source publie son calcul avec ses décimales de travail (« 1.000065040145302 ») :
      // deux décimales suffisent, et c'est la précision que les autres taux d'inflation portent.
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
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/** Appelle l'API IMF pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchImfSeries(mapping: ImfMapping): Promise<ImfFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildImfUrl(mapping), {
      headers: { Accept: "application/xml" },
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

  if (!response.ok) return { ok: false, error: `HTTP ${response.status} — ${response.statusText}` };
  return parseImfResponse(mapping, text);
}
