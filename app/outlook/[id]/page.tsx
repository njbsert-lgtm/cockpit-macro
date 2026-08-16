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
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href="/outlook"
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Retour aux outlooks
      </Link>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-paper font-mono text-13 font-bold text-ink"
        >
          {outlook.bankMonogram}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-11 uppercase tracking-wider text-mute">
            {outlook.bank} · {outlook.periodCovered}
          </p>
          <h1 className="font-display text-22 font-extrabold leading-tight text-ink">{outlook.title}</h1>
        </div>
      </div>
      <p className="mt-2 font-mono text-11 text-mute">Publié le {formatDateLong(outlook.publishedAt)}</p>

      <div className="mt-6 max-w-[68ch] whitespace-pre-line text-15 leading-relaxed text-ink-2">
        {outlook.summary}
      </div>

      {outlook.highlights.length > 0 && (
        <div className="mt-6">
          <h2 className="font-mono text-11 uppercase tracking-wider text-mute">Points majeurs</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {outlook.highlights.map((highlight, i) => (
              <li key={i} className="border-l-2 border-line-2 pl-3 text-14-5 leading-snug text-ink-2">
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(drivers.length > 0 || trends.length > 0) && (
        <div className="mt-6">
          <h2 className="font-mono text-11 uppercase tracking-wider text-mute">Drivers et tendances repris</h2>
          <ul aria-label="Drivers et tendances repris" className="mt-2.5 flex flex-wrap gap-1.5">
            {drivers.map((driver) => (
              <li key={`driver-${driver.id}`}>
                <Link
                  href={`/notes/drivers/${driver.id}`}
                  className="inline-block border border-line bg-paper px-1.5 py-0.5 font-mono text-10-5 uppercase tracking-wide text-ink-2 hover:border-deep hover:text-deep"
                >
                  {driver.label}
                </Link>
              </li>
            ))}
            {trends.map((trend) => (
              <li key={`trend-${trend.id}`}>
                <Link
                  href={`/notes/tendances/${trend.id}`}
                  className="inline-block border border-line bg-paper px-1.5 py-0.5 font-mono text-10-5 uppercase tracking-wide text-ink-2 hover:border-deep hover:text-deep"
                >
                  {trend.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 border-t border-line pt-4">
        <a
          href={outlook.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-12-5 text-deep underline decoration-line-2 underline-offset-4 hover:decoration-deep"
        >
          Voir le document original →
        </a>
      </p>
    </div>
  );
}
