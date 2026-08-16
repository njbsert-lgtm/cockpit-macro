/**
 * Lecteur RSS/Atom minimal, sans dépendance. Les flux institutionnels visés
 * (`config/veille-taxonomy.ts`) suivent l'un des deux formats standard, et le cahier des
 * charges n'exige que titre, lien et date — pas de quoi justifier un analyseur XML complet.
 */

export type RssEntry = { title: string; link: string; publishedAt: string };

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

/** Atom pose le lien en attribut d'une balise auto-fermante : `<link href="..." />`. */
function extractAtomLink(block: string): string | null {
  const match = block.match(/<link[^>]*\bhref=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function toIso(raw: string | null): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseFeed(xml: string): RssEntry[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];

  const entries: RssEntry[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") ?? extractAtomLink(block);
    // Un item sans date exploitable est écarté plutôt que daté par défaut : un chiffre — ou
    // ici un item — sans date n'est jamais affiché (cahier des charges).
    const publishedAt = toIso(
      extractTag(block, "pubDate") ?? extractTag(block, "published") ?? extractTag(block, "updated"),
    );
    if (title && link && publishedAt) entries.push({ title, link, publishedAt });
  }
  return entries;
}
