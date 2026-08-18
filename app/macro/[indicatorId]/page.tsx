import { notFound } from "next/navigation";
import Link from "next/link";
import { getMacroIndicator } from "@/lib/data";
import { loadMacroObservationsFor } from "@/lib/observations";
import { formatIndicatorValue, METRIC_LABELS, metricOf } from "@/lib/macro";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { ZONE_LABELS } from "@/lib/zones";
import { ZONE_PARAM } from "@/lib/zone-param";
import { DataValue } from "@/components/states/DataValue";
import { HistorySection } from "@/components/charts/HistorySection";

/** Un an de revalidation en heure suffit largement pour une collecte quotidienne. */
export const revalidate = 3600;

export default async function MacroIndicatorPage({
  params,
}: {
  params: Promise<{ indicatorId: string }>;
}) {
  const { indicatorId } = await params;
  const indicator = getMacroIndicator(indicatorId);
  if (!indicator) notFound();

  const obs = [...(await loadMacroObservationsFor(indicator.id))].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = obs.at(-1) ?? null;
  const history = [...obs].reverse();

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <Link
        href={`/macro?${ZONE_PARAM}=${indicator.zone}`}
        className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← {ZONE_LABELS[indicator.zone]}
      </Link>

      <p className="text-11 uppercase tracking-cap text-tenu">
        {ZONE_LABELS[indicator.zone]} · {METRIC_LABELS[metricOf(indicator)] ?? indicator.label}
      </p>
      <h1 className="mt-1 text-27 font-semibold text-encre">{indicator.label}</h1>

      <div className="mt-4">
        {latest ? (
          <DataValue
            value={formatIndicatorValue(indicator, latest.value)}
            date={latest.date}
            fetchedAt={latest.fetchedAt}
            source={latest.source}
          />
        ) : (
          <span className="text-13 italic text-tenu">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      <p className="mt-3 text-11 text-tenu">
        {indicator.nextRelease
          ? `Prochaine publication : ${formatDateLong(indicator.nextRelease)}`
          : "Prochaine date de publication non communiquée"}
      </p>

      <div className="mt-6">
        <HistorySection points={obs.map((o) => ({ date: o.date, value: o.value }))} />
      </div>

      <section className="mt-10">
        <h2 className="text-17 font-semibold text-encre">
          Historique ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-tenu">
            Aucun relevé encore enregistré pour cet indicateur.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-rc border border-trait bg-page">
            <table className="w-full border-collapse text-14-5">
              <thead>
                <tr className="border-b border-trait bg-repos text-left text-10-5 uppercase tracking-cap text-tenu">
                  <th className="px-3.5 py-2 font-semibold">Date</th>
                  <th className="px-3.5 py-2 font-semibold">Valeur</th>
                  <th className="px-3.5 py-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.date} className="border-b border-trait last:border-b-0">
                    <td className="px-3.5 py-2 text-13 text-doux">
                      {formatDateShort(o.date)}
                    </td>
                    <td className="px-3.5 py-2 font-semibold tabular-nums text-encre">
                      {formatIndicatorValue(indicator, o.value)}
                    </td>
                    <td className="px-3.5 py-2 text-12-5 text-tenu">{o.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
