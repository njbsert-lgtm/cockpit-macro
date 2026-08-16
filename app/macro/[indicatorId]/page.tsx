import { notFound } from "next/navigation";
import Link from "next/link";
import { getMacroIndicator } from "@/lib/data";
import { loadMacroObservationsFor } from "@/lib/observations";
import { formatIndicatorValue, METRIC_LABELS, metricOf } from "@/lib/macro";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { ZONE_LABELS } from "@/lib/zones";
import { ZONE_PARAM } from "@/lib/zone-param";
import { DataValue } from "@/components/states/DataValue";
import { HistoryChart } from "@/components/charts/HistoryChart";

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
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href={`/macro?${ZONE_PARAM}=${indicator.zone}`}
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← {ZONE_LABELS[indicator.zone]}
      </Link>

      <p className="font-mono text-11 uppercase tracking-wider text-mute">
        {ZONE_LABELS[indicator.zone]} · {METRIC_LABELS[metricOf(indicator)] ?? indicator.label}
      </p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">{indicator.label}</h1>

      <div className="mt-4">
        {latest ? (
          <DataValue
            value={formatIndicatorValue(indicator, latest.value)}
            date={latest.date}
            fetchedAt={latest.fetchedAt}
            source={latest.source}
          />
        ) : (
          <span className="font-mono text-13 italic text-mute">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      <p className="mt-3 font-mono text-11 text-mute">
        {indicator.nextRelease
          ? `Prochaine publication : ${formatDateLong(indicator.nextRelease)}`
          : "Prochaine date de publication non communiquée"}
      </p>

      <div className="mt-6">
        <HistoryChart points={obs.map((o) => ({ date: o.date, value: o.value }))} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Historique ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-mute">
            Aucun relevé encore enregistré pour cet indicateur.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-line bg-card">
            <table className="w-full border-collapse text-14-5">
              <thead>
                <tr className="border-b border-line bg-paper text-left font-mono text-10-5 uppercase tracking-wider text-mute">
                  <th className="px-3.5 py-2 font-semibold">Date</th>
                  <th className="px-3.5 py-2 font-semibold">Valeur</th>
                  <th className="px-3.5 py-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.date} className="border-b border-line-2 last:border-b-0">
                    <td className="px-3.5 py-2 font-mono text-13 text-ink-2">
                      {formatDateShort(o.date)}
                    </td>
                    <td className="px-3.5 py-2 font-mono font-semibold tabular-nums text-ink">
                      {formatIndicatorValue(indicator, o.value)}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-12-5 text-mute">{o.source}</td>
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
