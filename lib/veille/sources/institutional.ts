import type { RawVeilleCandidate } from "../filter";
import type { VeilleCollectorContext } from "../collect";
import { INSTITUTIONAL_FEEDS } from "@/config/veille-taxonomy";
import { parseFeed } from "./rss";
import { fetchWithTimeout } from "@/lib/http";

// Communiqué officiel — la source la plus autorisée du dispositif, avant GDELT et EDGAR.
const SOURCE_AUTHORITY = 3;

/**
 * Banques centrales, agences statistiques, énergie, institutions, flux géopolitiques
 * institutionnels — un même parseur RSS/Atom générique pour toute la liste
 * (`INSTITUTIONAL_FEEDS`), puisque seule la liste distingue les sources entre elles.
 */
export async function collectInstitutional(
  ctx: VeilleCollectorContext,
): Promise<{ candidates: RawVeilleCandidate[] }> {
  const candidates: RawVeilleCandidate[] = [];
  const deadline = Date.now() + ctx.budgetMs;

  for (const feed of INSTITUTIONAL_FEEDS) {
    if (Date.now() > deadline) break;

    try {
      const response = await fetchWithTimeout(feed.url, {
        headers: { Accept: "application/rss+xml, application/atom+xml, text/xml" },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const xml = await response.text();
      for (const entry of parseFeed(xml)) {
        candidates.push({
          title: entry.title,
          url: entry.link,
          source: feed.name,
          sourceAuthority: SOURCE_AUTHORITY,
          publishedAt: entry.publishedAt,
          zones: feed.zones,
        });
      }
    } catch {
      // Un flux injoignable ne bloque pas les suivants ; il sera retenté au passage suivant.
    }
  }

  return { candidates };
}
