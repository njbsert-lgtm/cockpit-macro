import Link from "next/link";
import { getDriver, getTrends } from "@/lib/content";
import { formatDateLong } from "@/lib/format";
import { TREND_STATUS_CLASS, TREND_STATUS_LABEL } from "@/lib/trend-labels";

/**
 * Couche 3 du Bulletin : l'index thématique des tendances de fond. Ce qu'on consulte une fois
 * par mois, pas tous les jours — d'où sa place en troisième position, jamais en avant.
 */
export default function TrendsIndexPage() {
  const trends = [...getTrends()].sort((a, b) => {
    const lastA = [...a.statusHistory].sort((x, y) => x.date.localeCompare(y.date)).at(-1);
    const lastB = [...b.statusHistory].sort((x, y) => x.date.localeCompare(y.date)).at(-1);
    return (lastB?.date ?? "").localeCompare(lastA?.date ?? "");
  });

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href="/bulletin"
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Retour au bulletin
      </Link>

      <p className="font-mono text-11 uppercase tracking-wider text-mute">Bulletin</p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">Tendances de fond</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-mute">
        Ce qui est durablement vrai, par opposition aux drivers, qui sont les incertitudes
        actives. Une tendance se lit sur des années : son intérêt est de voir si elle tient ou
        si elle s&rsquo;érode sans qu&rsquo;on le remarque.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {trends.map((trend) => {
          const last = [...trend.statusHistory]
            .sort((a, b) => a.date.localeCompare(b.date))
            .at(-1);
          return (
            <li key={trend.id} className="border border-line bg-card">
              <Link
                href={`/bulletin/tendances/${trend.id}`}
                className="block px-4 py-3.5 hover:bg-paper"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 font-mono text-10 font-semibold uppercase tracking-wider ${TREND_STATUS_CLASS[trend.status]}`}
                  >
                    {TREND_STATUS_LABEL[trend.status]}
                  </span>
                  <h2 className="font-display text-16 font-bold text-ink">{trend.title}</h2>
                </div>
                <p className="mt-1.5 max-w-[70ch] text-14 text-ink-2">{trend.thesis}</p>
                <p className="mt-2 font-mono text-11 text-mute">
                  {trend.statusHistory.length} passage
                  {trend.statusHistory.length > 1 ? "s" : ""}
                  {last && ` · dernier le ${formatDateLong(last.date)}`}
                  {" · "}
                  {trend.driverRefs.length === 0
                    ? "aucun driver ne peut l’invalider"
                    : `invalidable par ${trend.driverRefs.map((d) => getDriver(d)!.label).join(", ")}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
