import { notFound } from "next/navigation";
import Link from "next/link";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ORDER, formatInstrumentValue, instrumentPerformances } from "@/lib/marches";
import { getInstrumentsByAssetClass, getObservations } from "@/lib/data";
import { zoneMatches, ZONE_LABELS } from "@/lib/zones";
import type { AssetClass } from "@/lib/types";
import { InstrumentTable, type InstrumentRow } from "@/components/marches/InstrumentTable";
import { EmptyState } from "@/components/states/EmptyState";

function isAssetClass(value: string): value is AssetClass {
  return (ASSET_CLASS_ORDER as string[]).includes(value);
}

export default async function AssetClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetClass: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { assetClass: raw } = await params;
  if (!isAssetClass(raw)) notFound();
  const assetClass = raw;

  const searchParamsResolved = await searchParams;
  const zone = parseZone(searchParamsResolved[ZONE_PARAM]);

  const instruments = getInstrumentsByAssetClass(assetClass);

  const rows: InstrumentRow[] = instruments.map((instrument) => {
    const obs = [...getObservations(instrument.id)].sort((a, b) => a.date.localeCompare(b.date));
    const latest = obs.at(-1) ?? null;
    const perf = instrumentPerformances(instrument);
    return {
      id: instrument.id,
      label: instrument.label,
      href: `/marches/${assetClass}/${instrument.id}?${ZONE_PARAM}=${zone}`,
      value: latest ? formatInstrumentValue(instrument, latest.value) : null,
      date: latest?.date ?? null,
      fetchedAt: latest?.fetchedAt ?? null,
      source: latest?.source ?? "",
      ytd: perf.ytd,
      oneMonth: perf.oneMonth,
      note: instrument.note,
      inZone: zoneMatches(instrument.zones, zone),
    };
  });

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href={`/marches?${ZONE_PARAM}=${zone}`}
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Toutes les classes
      </Link>
      <p className="font-mono text-11 uppercase tracking-wider text-mute">Marchés</p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">
        {ASSET_CLASS_LABELS[assetClass]}
      </h1>
      <p className="mt-2 max-w-[64ch] text-15 text-mute">
        Les instruments de {ZONE_LABELS[zone]} sont remontés en premier. Cliquez un en-tête de
        colonne pour trier autrement.
      </p>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            title="Aucun instrument suivi dans cette classe"
            description="La couverture de cette classe d'actifs n'a pas encore été configurée dans le seed."
          />
        ) : (
          <InstrumentTable rows={rows} zoneLabel={ZONE_LABELS[zone]} />
        )}
      </div>
    </div>
  );
}
