import { z } from "zod";
import { LOOKBACK_YEARS, type EstatMapping } from "@/config/estat-series";
import { describeFetchError, fetchWithTimeout } from "./http";

export const ESTAT_SOURCE = "e-Stat";

const BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData";

// ---------------------------------------------------------------------------
// Schéma — chaque ligne de `DATA_INF.VALUE` porte un attribut par dimension (`@tab`, `@cat01`,
// `@area`, `@time`…) plus `@unit` et la valeur elle-même sous `$`. Toutes ces valeurs sont des
// chaînes chez e-Stat, y compris les codes numériques — jamais un nombre JSON natif.
//
// Comme XML->JSON le fait souvent, un résultat à une seule ligne est servi comme un objet nu, un
// résultat à plusieurs lignes comme un tableau : `z.union` accepte les deux, normalisés en
// tableau juste après le parsing.
// ---------------------------------------------------------------------------

const estatValueSchema = z.object({ "@time": z.string(), "$": z.string() }).catchall(z.string());

const estatResponseSchema = z.object({
  GET_STATS_DATA: z.object({
    RESULT: z.object({
      STATUS: z.number(),
      ERROR_MSG: z.string().optional(),
    }),
    STATISTICAL_DATA: z
      .object({
        DATA_INF: z
          .object({
            VALUE: z.union([estatValueSchema, z.array(estatValueSchema)]).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export type EstatPoint = { date: string; value: number };

export type EstatFetchResult =
  /** e-Stat a répondu et la réponse est exploitable. `points` peut être vide. */
  | { ok: true; points: EstatPoint[] }
  /** Rien n'est écrit. La dernière valeur valide reste en place. */
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Temps — deux schémas, voir le commentaire en tête de `config/estat-series.ts`.
// ---------------------------------------------------------------------------

/**
 * `AAAA00MMMM` — le mois répété deux fois dans le code lui-même. Une année fiscale
 * (`AAAA100000`) ou tout autre agrégat non mensuel ne correspond pas au motif et rend `null` :
 * ignoré plutôt que mal interprété.
 */
function timeCodeToDate(code: string): string | null {
  const monthly = /^(\d{4})00(\d{2})\2$/.exec(code);
  if (!monthly) return null;
  return `${monthly[1]}-${monthly[2]}-01`;
}

/** Codes `cat01` désignant un mois (調査月) — janvier à décembre, jamais les agrégats trimestriels. */
const MONTH_CAT01_CODES = new Map(
  Array.from({ length: 12 }, (_, i) => [String(101 + i), String(i + 1).padStart(2, "0")]),
);

/**
 * Le mois vit dans `cat01`, l'année dans `@time` (`AAAA000000`). Un `cat01` hors de
 * `101`…`112` — les agrégats trimestriels `94`…`97`, ou tout autre code — rend `null` :
 * ce n'est pas une panne, seulement une ligne qui ne décrit pas un mois.
 */
function cat01MonthToDate(timeCode: string, cat01: string | undefined): string | null {
  if (cat01 === undefined) return null;
  const month = MONTH_CAT01_CODES.get(cat01);
  if (!month) return null;
  const year = /^(\d{4})000000$/.exec(timeCode)?.[1];
  if (!year) return null;
  return `${year}-${month}-01`;
}

// ---------------------------------------------------------------------------
// Requête
// ---------------------------------------------------------------------------

function cdParamName(dimension: string): string {
  return `cd${dimension.charAt(0).toUpperCase()}${dimension.slice(1)}`;
}

/** Le plancher temporel envoyé à `cdTimeFrom`, au format `AAAA00MMMM` qu'attend ce schéma. */
function timeFloor(now: Date, lookbackYears: number): string {
  return `${now.getFullYear() - lookbackYears}000101`;
}

/**
 * Un appel, une série, une fois par jour. `metaGetFlg=N` : la nomenclature est déjà figée dans
 * `config/estat-series.ts`, la redemander à chaque appel ne ferait que gonfler la réponse.
 *
 * `cdTimeFrom` n'est envoyé **que pour le schéma `"time"`** : vérifié par appel réel, la table
 * des salaires (`cat01Month`, axe « 調査年 » — année seule) renvoie `STATUS 1` (aucune donnée)
 * dès que `cdTimeFrom` est présent, quel que soit son format (`AAAA000000` ou `AAAA`) — y
 * compris sur une requête par ailleurs identique à une requête qui réussit sans lui. Cette
 * table ne supporte donc pas le filtrage temporel par borne : pour `cat01Month`, l'appel
 * rapatrie tout l'historique disponible plutôt que de risquer une réponse vide — un payload
 * de quelques centaines de points mensuels ne pèse rien pour une collecte quotidienne.
 */
export function buildEstatUrl(mapping: EstatMapping, appId: string, now: Date): string {
  const params = new URLSearchParams({
    appId,
    statsDataId: mapping.statsDataId,
    metaGetFlg: "N",
  });
  if (mapping.timeScheme === "time") {
    params.set("cdTimeFrom", timeFloor(now, LOOKBACK_YEARS[mapping.cadence]));
  }
  for (const [dimension, code] of Object.entries(mapping.filters)) {
    params.set(cdParamName(dimension), code);
  }
  return `${BASE_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Transforme une réponse `getStatsData` en points exploitables, ou en échec explicite.
 *
 * Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques. Trois
 * garde-fous, dans l'ordre où ils s'appliquent :
 *
 * 1. **`RESULT.STATUS` non nul** — e-Stat a refusé la requête (identifiant inconnu, appId
 *    invalide, quota dépassé) : rien à lire, on remonte le message tel quel.
 * 2. **Une dimension fixée qui ne correspond pas au code demandé** — même risque que la
 *    dimension non fixée d'Eurostat, vérifié ici ligne par ligne puisque e-Stat ne donne pas de
 *    taille de dimension globale. `cat01` n'est jamais vérifié pour une série `cat01Month` :
 *    c'est la dimension qui porte le mois, elle varie par construction.
 * 3. **Une valeur hors bornes** — fait rejeter toute la réponse, pas seulement le point fautif.
 */
export function parseEstatResponse(mapping: EstatMapping, payload: unknown): EstatFetchResult {
  const parsed = estatResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: `réponse malformée — ${detail}` };
  }

  const { RESULT, STATISTICAL_DATA } = parsed.data.GET_STATS_DATA;
  if (RESULT.STATUS !== 0) {
    return {
      ok: false,
      error: `e-Stat a refusé la requête (STATUS ${RESULT.STATUS}) — ${RESULT.ERROR_MSG ?? "sans message"}`,
    };
  }

  const raw = STATISTICAL_DATA?.DATA_INF?.VALUE;
  const rows = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];

  const points: EstatPoint[] = [];
  for (const row of rows) {
    const mismatch = Object.entries(mapping.filters).find(
      ([dimension, code]) => row[`@${dimension}`] !== undefined && row[`@${dimension}`] !== code,
    );
    if (mismatch) {
      const [dimension, expected] = mismatch;
      return {
        ok: false,
        error:
          `dimension « ${dimension} » non fixée : code ${row[`@${dimension}`]} rencontré, ` +
          `${expected} attendu — série non écrite`,
      };
    }

    const date =
      mapping.timeScheme === "time"
        ? timeCodeToDate(row["@time"])
        : cat01MonthToDate(row["@time"], row["@cat01"]);
    // Un agrégat non mensuel (année fiscale, trimestre) n'est pas une panne : juste une ligne
    // que ce schéma temporel ne décrit pas, écartée sans bruit.
    if (date === null) continue;

    const value = Number(row["$"]);
    if (!Number.isFinite(value)) continue; // valeur manquante ou provisoire, jamais à zéro

    const { min, max } = mapping.plausible;
    if (value < min || value > max) {
      return {
        ok: false,
        error:
          `valeur hors bornes en ${row["@time"]} : ${value} attendu dans [${min} ; ${max}] — ` +
          `dimensions probablement mal choisies, série non écrite`,
      };
    }

    points.push({ date, value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, points };
}

/** Appelle e-Stat pour une série. Ne lève jamais : toute panne devient un échec typé. */
export async function fetchEstatSeries(
  mapping: EstatMapping,
  appId: string,
  now: Date = new Date(),
): Promise<EstatFetchResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(buildEstatUrl(mapping, appId, now), {
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

  return parseEstatResponse(mapping, payload);
}
