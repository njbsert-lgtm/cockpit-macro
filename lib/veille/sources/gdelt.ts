import { z } from "zod";
import type { RawVeilleCandidate } from "../filter";
import type { VeilleCollectorContext } from "../collect";
import { buildGdeltQueries, GDELT_THEME_QUERIES, type GdeltQuery } from "@/config/veille-taxonomy";
import { readCursor, writeCursor } from "../cursor";

// Détection large, non éditorialisée — la source la moins autorisée du dispositif.
const SOURCE_AUTHORITY = 1;
export const GDELT_SOURCE = "GDELT";

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

const articleSchema = z.object({
  url: z.string(),
  title: z.string(),
  seendate: z.string(), // 'AAAAMMJJTHHMMSSZ'
});
const responseSchema = z.object({ articles: z.array(articleSchema).optional() });

function parseSeenDate(raw: string): string | null {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

export function buildGdeltUrl(query: GdeltQuery): string {
  const params = new URLSearchParams({
    query: `${GDELT_THEME_QUERIES[query.theme]} sourcecountry:${query.country.fips}`,
    mode: "artlist",
    maxrecords: "50",
    format: "json",
    sort: "datedesc",
  });
  return `${GDELT_DOC_URL}?${params.toString()}`;
}

/** Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques. */
export function parseGdeltResponse(query: GdeltQuery, payload: unknown): RawVeilleCandidate[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return [];

  const candidates: RawVeilleCandidate[] = [];
  for (const article of parsed.data.articles ?? []) {
    const publishedAt = parseSeenDate(article.seendate);
    if (!publishedAt) continue; // pas de date exploitable, pas d'item stocké
    candidates.push({
      title: article.title,
      url: article.url,
      source: GDELT_SOURCE,
      sourceAuthority: SOURCE_AUTHORITY,
      publishedAt,
      zones: [query.country.zone],
    });
  }
  return candidates;
}

/**
 * Détection large, découpée en requêtes thème × pays traitées une à la fois. Le curseur
 * (`veille_cursor`) retient la position dans la liste, en boucle circulaire : un passage qui
 * s'arrête à mi-parcours faute de budget reprend à la requête suivante le lendemain plutôt que
 * de tout refaire ou de laisser les dernières combinaisons ne jamais être interrogées.
 */
export async function collectGdelt(ctx: VeilleCollectorContext): Promise<{ candidates: RawVeilleCandidate[] }> {
  const queries = buildGdeltQueries();
  if (queries.length === 0) return { candidates: [] };

  let position = (await readCursor(ctx.client, GDELT_SOURCE)) % queries.length;
  const deadline = Date.now() + ctx.budgetMs;
  const candidates: RawVeilleCandidate[] = [];
  let processed = 0;

  while (processed < queries.length && Date.now() < deadline) {
    const query = queries[position];
    try {
      const response = await fetch(buildGdeltUrl(query), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.ok) {
        const payload = await response.json();
        candidates.push(...parseGdeltResponse(query, payload));
      }
    } catch {
      // Une requête ratée n'interrompt pas la boucle ; le curseur avance quand même — elle sera
      // retentée au prochain tour complet plutôt que de bloquer indéfiniment sur elle.
    }
    position = (position + 1) % queries.length;
    processed += 1;
  }

  await writeCursor(ctx.client, GDELT_SOURCE, position);
  return { candidates };
}
