import Link from "next/link";
import { getTrends } from "@/lib/content";
import { formatDateLong } from "@/lib/format";
import { TREND_STATUS_CLASS, TREND_STATUS_LABEL, TREND_TRAJECTORY } from "@/lib/trend-labels";

/**
 * Couche 3 des Notes : l'index thématique des tendances de fond. Ce qu'on consulte une fois
 * par mois, pas tous les jours — d'où sa place en troisième position, jamais en avant.
 */
export default function TrendsIndexPage() {
  const trends = [...getTrends()].sort((a, b) => {
    const lastA = [...a.statusHistory].sort((x, y) => x.date.localeCompare(y.date)).at(-1);
    const lastB = [...b.statusHistory].sort((x, y) => x.date.localeCompare(y.date)).at(-1);
    return (lastB?.date ?? "").localeCompare(lastA?.date ?? "");
  });

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <Link
        href="/notes"
        className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← Retour aux notes
      </Link>

      <p className="text-11 uppercase tracking-cap text-tenu">Notes</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Tendances de fond</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Ce qui est durablement vrai, par opposition aux drivers, qui sont les incertitudes
        actives. Une tendance se lit sur des années : son intérêt est de voir si elle tient ou
        si elle s&rsquo;érode sans qu&rsquo;on le remarque.
      </p>

      <ul className="mt-6 flex flex-col gap-2.5">
        {trends.map((trend) => {
          const last = [...trend.statusHistory]
            .sort((a, b) => a.date.localeCompare(b.date))
            .at(-1);
          return (
            <li key={trend.id}>
              {/* Grille `1fr auto` : le titre et son contexte à gauche, la pastille de statut
                  et la trajectoire à droite (DESIGN.md). */}
              <Link
                href={`/notes/tendances/${trend.id}`}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-rc border border-trait bg-page px-4 py-3.5 transition-colors hover:border-trait-f active:scale-[.99]"
              >
                <span className="min-w-0">
                  <span className="block text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">
                    {trend.title}
                  </span>
                  <span className="mt-1 block text-12 text-tenu">
                    {trend.statusHistory.length} passage
                    {trend.statusHistory.length > 1 ? "s" : ""}
                    {last && ` · dernier le ${formatDateLong(last.date)}`}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-rp px-2 py-0.5 text-9-5 font-semibold uppercase tracking-cap ${TREND_STATUS_CLASS[trend.status]}`}
                  >
                    {TREND_STATUS_LABEL[trend.status]}
                  </span>
                  <span className="text-11 text-tenu">{TREND_TRAJECTORY[trend.status]}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
