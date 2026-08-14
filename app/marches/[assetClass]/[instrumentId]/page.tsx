import { notFound } from "next/navigation";
import Link from "next/link";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ORDER, formatInstrumentValue, instrumentPerformances } from "@/lib/marches";
import { getInstrument, getObservations } from "@/lib/data";
import { getDriversForInstrument, getEditions } from "@/lib/content";
import { BRANCH_LABELS } from "@/lib/scenario-labels";
import { formatDateLong } from "@/lib/format";
import type { AssetClass } from "@/lib/types";
import { DataValue } from "@/components/states/DataValue";
import { PerfValue } from "@/components/marches/PerfValue";
import { InstrumentChart } from "@/components/marches/InstrumentChart";

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

  const obs = [...getObservations(instrument.id)].sort((a, b) => a.date.localeCompare(b.date));
  const latest = obs.at(-1) ?? null;
  const perf = instrumentPerformances(instrument);

  const mentions = getEditions()
    .filter((e) => e.instrumentRefs.includes(instrument.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  const drivers = getDriversForInstrument(instrument.id);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href={`/marches/${rawClass}?${ZONE_PARAM}=${zone}`}
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← {ASSET_CLASS_LABELS[rawClass]}
      </Link>

      <p className="font-mono text-11 uppercase tracking-wider text-mute">
        {ASSET_CLASS_LABELS[rawClass]}
      </p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">{instrument.label}</h1>

      <div className="mt-4">
        {latest ? (
          <DataValue
            value={formatInstrumentValue(instrument, latest.value)}
            date={latest.date}
            fetchedAt={latest.fetchedAt}
            source={latest.source}
          />
        ) : (
          <span className="font-mono text-13 italic text-mute">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border border-line bg-card p-4 sm:max-w-md">
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">YTD</dt>
          <dd className="mt-1">
            <PerfValue pct={perf.ytd} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">1 mois</dt>
          <dd className="mt-1">
            <PerfValue pct={perf.oneMonth} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">1 an</dt>
          <dd className="mt-1">
            <PerfValue pct={perf.oneYear} />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <InstrumentChart points={obs.map((o) => ({ date: o.date, value: o.value }))} />
      </div>

      <div className="mt-5 border-l-3 border-line bg-paper px-3.5 py-3">
        <p className="font-mono text-10-5 font-semibold uppercase tracking-wider text-mute">
          Ce qui l&rsquo;a fait bouger
        </p>
        <p className="mt-1 max-w-[64ch] text-14-5 text-ink-2">{instrument.note}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Ce qui le pilote ({drivers.length})
        </h2>
        {drivers.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-mute">
            Aucun driver suivi ne pilote cet instrument. Il bouge pour des raisons qui ne sont
            pas, aujourd&rsquo;hui, une incertitude que l&rsquo;on suit activement.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {drivers.map((driver) => (
              <li key={driver.id}>
                <Link
                  href={`/bulletin/drivers/${driver.id}`}
                  className="block border border-line bg-card px-3.5 py-3 hover:border-deep"
                >
                  <span className="font-display text-14-5 font-bold text-ink">
                    {driver.question}
                  </span>
                  <span className="mt-1 block font-mono text-11 text-mute">
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
        <h2 className="font-display text-xl font-extrabold text-ink">
          Dans le bulletin ({mentions.length})
        </h2>
        {mentions.length === 0 ? (
          <p className="mt-3 max-w-[60ch] text-14-5 text-mute">
            Aucune édition ne mentionne encore cet instrument. Les passages qui le citent
            apparaîtront ici, du plus récent au plus ancien.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {mentions.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/bulletin/${e.slug}`}
                  className="block border border-line-2 bg-card px-3.5 py-2.5 hover:border-deep"
                >
                  <span className="font-display text-14 font-bold text-ink">
                    {e.regimeStatement}
                  </span>
                  <span className="mt-1 block font-mono text-11 text-mute">
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
