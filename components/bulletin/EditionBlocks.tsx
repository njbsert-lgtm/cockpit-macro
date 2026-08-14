import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Edition } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { getEdition, getEditionBody, getTrend } from "@/lib/content";
import { editionMdxComponents } from "./mdx-blocks";

export async function EditionBlocks({ edition }: { edition: Edition }) {
  const comparesTo = edition.comparesTo ? getEdition(edition.comparesTo) : null;
  const body = getEditionBody(edition.slug);

  // Le corps est validé au chargement du corpus : s'il manque ici, c'est une incohérence
  // interne, pas une édition mal écrite.
  const { content } = await compileMDX({
    source: body ?? "",
    components: editionMdxComponents,
    options: { parseFrontmatter: false },
  });

  return (
    <article className="border border-line bg-card">
      <header className="border-b border-line px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-mono text-10 font-semibold uppercase tracking-wider px-2 py-1 ${
              edition.kind === "hebdo" ? "bg-deep text-white" : "bg-ochre-bg text-ochre"
            }`}
          >
            {edition.kind === "hebdo" ? "Édition hebdomadaire" : "Édition spéciale"}
          </span>
          <span className="font-mono text-xs text-mute">{edition.slug}</span>
          <span className="font-mono text-xs text-mute">· {formatDateLong(edition.date)}</span>
        </div>
        {edition.trigger && (
          <p className="mt-2.5 border-l-3 border-rust bg-rust-bg px-3 py-2 text-13-5 text-ink-2">
            <span className="font-mono text-10-5 font-semibold uppercase tracking-wider text-rust">
              Seuil déclenché
            </span>{" "}
            — {edition.trigger}
          </p>
        )}
        {comparesTo && (
          <p className="mt-2 font-mono text-11-5 text-mute">
            Comparée à{" "}
            <Link href={`/bulletin/${comparesTo.slug}`} className="underline decoration-line underline-offset-4">
              {comparesTo.slug}
            </Link>{" "}
            du {formatDateLong(comparesTo.date)}
          </p>
        )}
      </header>

      <div className="px-4 md:px-5">{content}</div>

      {(edition.trendRefs.length > 0 || edition.sources.length > 0) && (
        <footer className="border-t border-line px-4 py-4 md:px-5">
          {edition.trendRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-10-5 uppercase tracking-wider text-mute">
                Tendances touchées :
              </span>
              {edition.trendRefs.map((id) => {
                const trend = getTrend(id);
                if (!trend) return null;
                return (
                  <Link
                    key={id}
                    href={`/bulletin/tendances/${id}`}
                    className="border border-line-2 bg-paper px-2 py-1 font-mono text-11 text-ink-2 hover:border-deep hover:text-deep"
                  >
                    {trend.title}
                  </Link>
                );
              })}
            </div>
          )}
          {edition.sources.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-11 text-mute">
              {edition.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-deep hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </footer>
      )}
    </article>
  );
}
