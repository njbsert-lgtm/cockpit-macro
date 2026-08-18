import { notFound } from "next/navigation";
import Link from "next/link";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_ORDER,
  ASSET_CLASS_PARAM,
  formatInstrumentValue,
  formatYtd,
  instrumentPerformances,
} from "@/lib/marches";
import { getInstrument } from "@/lib/data";
import { loadObservationsFor } from "@/lib/observations";
import { getDriversForInstrument, getNotes } from "@/lib/content";
import { BRANCH_LABELS } from "@/lib/scenario-labels";
import { formatDateLong } from "@/lib/format";
import type { AssetClass } from "@/lib/types";
import { DataValue } from "@/components/states/DataValue";
import { PerfValue } from "@/components/marches/PerfValue";
import { HistorySection } from "@/components/charts/HistorySection";

function isAssetClass(value: string): value is AssetClass {
  return (ASSET_CLASS_ORDER as string[]).includes(value);
}

export default async function InstrumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetClass: string; instrumentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { assetClass: rawClass, instrumentId } = await params;
  if (!isAssetClass(rawClass)) notFound();
  const instrument = getInstrument(instrumentId);
  if (!instrument || instrument.assetClass !== rawClass) notFound();

  const searchParamsResolved = await searchParams;
  const zone = parseZone(searchParamsResolved[ZONE_PARAM]);

  const obs = [...(await loadObservationsFor(instrument.id))].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = obs.at(-1) ?? null;
  const perf = instrumentPerformances(instrument, obs);

  const mentions = getNotes()
    .filter((e) => e.instrumentRefs.includes(instrument.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  const drivers = getDriversForInstrument(instrument.id);

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <Link
        href={`/marches?${ASSET_CLASS_PARAM}=${rawClass}&${ZONE_PARAM}=${zone}`}
        className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← {ASSET_CLASS_LABELS[rawClass]}
      </Link>

      <p className="text-11 uppercase tracking-cap text-tenu">
        {ASSET_CLASS_LABELS[rawClass]}
      </p>
      <h1 className="mt-1 text-27 font-semibold text-encre">{instrument.label}</h1>

      <div className="mt-4">
        {latest ? (
          <DataValue
            value={formatInstrumentValue(instrument, latest.value)}
            date={latest.date}
            fetchedAt={latest.fetchedAt}
            source={latest.source}
          />
        ) : (
          <span className="text-13 italic text-tenu">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-rc border border-trait bg-page p-4 sm:max-w-md">
        <div>
          <dt className="text-10-5 uppercase tracking-cap text-tenu">YTD</dt>
          <dd className="mt-1">
            {/* Un taux se lit en points de base : « +12,5 % » sur une base à 4,00 % serait
                exact et illisible. */}
            <PerfValue pct={perf.ytd} formatted={formatYtd(instrument, obs)} />
          </dd>
        </div>
        <div>
          <dt className="text-10-5 uppercase tracking-cap text-tenu">1 mois</dt>
          <dd className="mt-1">
            <PerfValue pct={perf.oneMonth} />
          </dd>
        </div>
        <div>
          <dt className="text-10-5 uppercase tracking-cap text-tenu">1 an</dt>
          <dd className="mt-1">
            <PerfValue pct={perf.oneYear} />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <HistorySection points={obs.map((o) => ({ date: o.date, value: o.value }))} />
      </div>

      <div className="mt-5 border-l-3 border-trait bg-repos px-3.5 py-3">
        <p className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
          Ce qui l&rsquo;a fait bouger
        </p>
        <p className="mt-1 max-w-[64ch] text-14-5 text-doux">{instrument.note}</p>
      </div>

      <section className="mt-10">
        <h2 className="text-17 font-semibold text-encre">
          Ce qui le pilote ({drivers.length})
        </h2>
        {drivers.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-tenu">
            Aucun driver suivi ne pilote cet instrument. Il bouge pour des raisons qui ne sont
            pas, aujourd&rsquo;hui, une incertitude que l&rsquo;on suit activement.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {drivers.map((driver) => (
              <li key={driver.id}>
                <Link
                  href={`/notes/drivers/${driver.id}`}
                  className="block rounded-rc border border-trait bg-page px-3.5 py-3 hover:border-trait-f"
                >
                  <span className="text-14-5 font-bold text-encre">
                    {driver.question}
                  </span>
                  <span className="mt-1 block text-11 text-tenu">
                    {driver.label} · branche dominante :{" "}
                    {BRANCH_LABELS[driver.dominantBranchId] ?? driver.dominantBranchId} ·
                    révisée le {formatDateLong(driver.lastRevisedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-17 font-semibold text-encre">
          Dans les notes ({mentions.length})
        </h2>
        {mentions.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-tenu">
            Aucune note ne mentionne encore cet instrument. Les passages qui le citent
            apparaîtront ici, du plus récent au plus ancien.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {mentions.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/notes/${e.slug}`}
                  className="block rounded-rc border border-trait bg-page px-3.5 py-2.5 hover:border-trait-f"
                >
                  <span className="text-14-5 font-bold text-encre">
                    {e.regimeStatement}
                  </span>
                  <span className="mt-1 block text-11 text-tenu">
                    {e.slug} · {formatDateLong(e.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
