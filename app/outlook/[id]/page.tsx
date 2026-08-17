import { notFound } from "next/navigation";
import Link from "next/link";
import { getDriver, getOutlook, getOutlooks, getTrend } from "@/lib/content";
import { formatDateLong } from "@/lib/format";

/**
 * Énumère les outlooks au build — même effet de bord voulu que pour les notes et les drivers :
 * une référence morte dans `driverRefs`/`trendRefs` fait échouer `next build`, pas le rendu.
 */
export function generateStaticParams() {
  return getOutlooks().map((outlook) => ({ id: outlook.id }));
}

export default async function OutlookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outlook = getOutlook(id);
  if (!outlook) notFound();

  const drivers = outlook.driverRefs.map((ref) => getDriver(ref)).filter((d) => d !== null);
  const trends = outlook.trendRefs.map((ref) => getTrend(ref)).filter((t) => t !== null);

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <Link
        href="/outlook"
        className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← Retour aux outlooks
      </Link>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-rc border border-trait bg-repos text-13 font-bold text-encre"
        >
          {outlook.bankMonogram}
        </span>
        <div className="min-w-0">
          <p className="text-11 uppercase tracking-cap text-tenu">
            {outlook.bank} · {outlook.periodCovered}
          </p>
          <h1 className="text-17 font-semibold leading-tight text-encre">{outlook.title}</h1>
        </div>
      </div>
      <p className="mt-2 text-11 text-tenu">Publié le {formatDateLong(outlook.publishedAt)}</p>

      <div className="mt-6 max-w-[68ch] whitespace-pre-line text-15 leading-relaxed text-doux">
        {outlook.summary}
      </div>

      {outlook.highlights.length > 0 && (
        <div className="mt-6">
          <h2 className="text-11 uppercase tracking-cap text-tenu">Points majeurs</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {outlook.highlights.map((highlight, i) => (
              <li key={i} className="border-l-2 border-trait pl-3 text-14-5 leading-snug text-doux">
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(drivers.length > 0 || trends.length > 0) && (
        <div className="mt-6">
          <h2 className="text-11 uppercase tracking-cap text-tenu">Drivers et tendances repris</h2>
          <ul aria-label="Drivers et tendances repris" className="mt-2.5 flex flex-wrap gap-1.5">
            {drivers.map((driver) => (
              <li key={`driver-${driver.id}`}>
                <Link
                  href={`/notes/drivers/${driver.id}`}
                  className="inline-block rounded-rc border border-trait bg-repos px-1.5 py-0.5 text-10-5 uppercase tracking-wide text-doux hover:border-trait-f hover:text-encre"
                >
                  {driver.label}
                </Link>
              </li>
            ))}
            {trends.map((trend) => (
              <li key={`trend-${trend.id}`}>
                <Link
                  href={`/notes/tendances/${trend.id}`}
                  className="inline-block rounded-rc border border-trait bg-repos px-1.5 py-0.5 text-10-5 uppercase tracking-wide text-doux hover:border-trait-f hover:text-encre"
                >
                  {trend.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 border-t border-trait pt-4">
        <a
          href={outlook.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-12-5 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
        >
          Voir le document original →
        </a>
      </p>
    </div>
  );
}
