import { notFound } from "next/navigation";
import Link from "next/link";
import { getDriver, getTrend, getTrends } from "@/lib/content";
import { formatDateLong } from "@/lib/format";
import {
  TREND_STATUS_CLASS as STATUS_CLASS,
  TREND_STATUS_DOT as STATUS_DOT,
  TREND_STATUS_LABEL as STATUS_LABEL,
  TREND_TRAJECTORY,
} from "@/lib/trend-labels";

/** Énumère les tendances au build — même effet de bord voulu que pour les drivers. */
export function generateStaticParams() {
  return getTrends().map((t) => ({ id: t.id }));
}

export default async function TrendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trend = getTrend(id);
  if (!trend) notFound();

  const history = [...trend.statusHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <Link
        href="/notes"
        className="mb-4 inline-flex min-h-11 items-center text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← Notes
      </Link>

      <p className="text-11 uppercase tracking-cap text-tenu">Tendance de fond</p>
      <h1 className="mt-1.5 max-w-[36ch] text-27 font-bold leading-tight text-encre">
        {trend.title}
      </h1>
      <p className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-rp px-2 py-0.5 text-9-5 font-semibold uppercase tracking-cap ${STATUS_CLASS[trend.status]}`}
        >
          {STATUS_LABEL[trend.status]}
        </span>
        <span className="text-11 text-tenu">{TREND_TRAJECTORY[trend.status]}</span>
      </p>

      <p className="mt-4 max-w-[70ch] text-15 text-doux">{trend.thesis}</p>

      {/* Ligne d'alerte (DESIGN.md) : ce qui ferait tomber la tendance. */}
      <p className="mt-4 max-w-[70ch] border-l-3 border-k-choc bg-k-choc/11 px-3 py-2 text-13 text-doux">
        <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">
          Invalidée si
        </span>{" "}
        — {trend.invalidatedBy}
      </p>

      <section className="mt-6 max-w-[70ch]">
        <h2 className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
          Les drivers qui pourraient la faire tomber
        </h2>
        {trend.driverRefs.length === 0 ? (
          <p className="mt-2 text-14-5 text-doux">
            Aucun driver suivi ne peut l&rsquo;invalider aujourd&rsquo;hui. C&rsquo;est ce qui
            la rend confortable — et ce qui la rendrait dangereuse si elle se mettait à
            s&rsquo;éroder sans qu&rsquo;on sache quoi surveiller.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {trend.driverRefs.map((driverId) => {
              const driver = getDriver(driverId)!;
              return (
                <li key={driverId}>
                  <Link
                    href={`/notes/drivers/${driverId}`}
                    className="block rounded-rc border border-trait bg-page px-3 py-2 hover:border-trait-f"
                  >
                    <span className="block text-13 font-semibold text-encre">
                      {driver.label}
                    </span>
                    <span className="mt-0.5 block text-11 text-tenu">
                      {driver.question}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="text-17 font-semibold tracking-titre text-encre">
          Chronologie ({history.length} passage{history.length > 1 ? "s" : ""})
        </h2>
        {/* La frise (DESIGN.md) : filet de 1px, un point de 10px par passage à la couleur du
            statut de ce jour-là — c'est ce qui laisse voir une tendance s'éroder. */}
        <ol className="mt-4 flex flex-col gap-4 border-l border-trait pl-4">
          {history.map((h, i) => (
            <li key={i} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-rp ${STATUS_DOT[h.status]}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-11 text-tenu">{formatDateLong(h.date)}</span>
                <span
                  className={`rounded-rp px-2 py-0.5 text-9-5 font-semibold uppercase tracking-cap ${STATUS_CLASS[h.status]}`}
                >
                  {STATUS_LABEL[h.status]}
                </span>
                <Link
                  href={`/notes/${h.noteSlug}`}
                  className="text-11 text-encre underline decoration-trait underline-offset-4"
                >
                  {h.noteSlug}
                </Link>
              </div>
              <p className="mt-1.5 max-w-[64ch] text-14-5 text-doux">{h.why}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
