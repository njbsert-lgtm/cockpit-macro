import { Suspense } from "react";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_PARAM,
  formatDailyChange,
  formatInstrumentValue,
  getRatesInstruments,
  isRateCountryZone,
  parseAssetClass,
} from "@/lib/marches";
import { getInstrumentsByAssetClass } from "@/lib/data";
import { loadObservations, observationsOf, type ObservationsBySeries } from "@/lib/observations";
import { dailyChange, latestObservation, MAX_SESSION_GAP_DAYS } from "@/lib/performance";
import { freshnessTier } from "@/lib/freshness";
import { ZONE_LABELS } from "@/lib/zones";
import { formatDateLong } from "@/lib/format";
import type { AssetClass, Instrument, Zone } from "@/lib/types";
import { FilterRows } from "@/components/marches/FilterRows";
import { InstrumentList, type InstrumentRow } from "@/components/marches/InstrumentList";
import { MarchesSkeleton } from "@/components/marches/MarchesSkeleton";
import { EmptyState } from "@/components/states/EmptyState";

async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function instrumentsFor(assetClass: AssetClass, zone: Zone): Instrument[] {
  // Obligations : `getRatesInstruments` choisit elle-même entre la courbe complète d'un pays
  // et un point de repère (le 10 ans) par pays pour Toutes / Zone euro / Émergents — sinon la
  // liste plate mélangerait 65 maturités de neuf pays.
  return assetClass === "rates"
    ? getRatesInstruments(zone)
    : getInstrumentsByAssetClass(assetClass, zone);
}

function buildRows(
  assetClass: AssetClass,
  zone: Zone,
  instruments: Instrument[],
  bySeries: ObservationsBySeries,
): InstrumentRow[] {
  // `isCurve` ne sert qu'à l'affichage : le pays est déjà porté par le libellé
  // (« OAT 6 mois ») et par la rangée de zones au-dessus, répéter « France » sur les sept
  // lignes n'ajouterait rien.
  const isCurve = assetClass === "rates" && isRateCountryZone(zone);

  return instruments.map((instrument) => {
    const obs = observationsOf(bySeries, instrument.id);
    const latest = latestObservation(obs);
    const change = dailyChange(obs);
    const sorted = [...obs].sort((a, b) => a.date.localeCompare(b.date));
    const previous = sorted.at(-2) ?? null;

    return {
      id: instrument.id,
      label: instrument.label,
      href: `/marches/${assetClass}/${instrument.id}?${ZONE_PARAM}=${zone}`,
      value: latest ? formatInstrumentValue(instrument, latest.value) : null,
      date: latest?.date ?? null,
      tier: freshnessTier(latest?.fetchedAt),
      change: change ? formatDailyChange(instrument, change) : null,
      direction: change?.direction ?? null,
      changeUnavailableReason: change
        ? null
        : previous
          ? `Variation de séance non calculable : la clôture précédente date du ${formatDateLong(previous.date)}, au-delà des ${MAX_SESSION_GAP_DAYS} jours qui séparent deux séances consécutives.`
          : "Variation de séance non calculable : la série ne compte qu'une seule clôture.",
      zoneTag: isCurve ? null : instrument.zones[0] ? ZONE_LABELS[instrument.zones[0]] : null,
    };
  });
}

async function MarchesContent({ assetClass, zone }: { assetClass: AssetClass; zone: Zone }) {
  await simulateLoad();

  const instruments = instrumentsFor(assetClass, zone);
  const bySeries = await loadObservations(instruments.map((i) => i.id));
  const rows = buildRows(assetClass, zone, instruments, bySeries);
  const isCurve = assetClass === "rates" && isRateCountryZone(zone);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <p className="font-mono text-11 uppercase tracking-wider text-mute">Marchés</p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">
        {ASSET_CLASS_LABELS[assetClass]}
      </h1>
      {isCurve && (
        <p className="mt-1 font-mono text-12-5 text-mute">
          Courbe {ZONE_LABELS[zone]} — 6 mois à 20 ans.
        </p>
      )}

      <FilterRows assetClass={assetClass} zone={zone} />

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title={`Aucun instrument de cette classe pour ${ZONE_LABELS[zone]}`}
            description="Choisissez « Toutes » dans la rangée des zones pour voir l'ensemble des instruments suivis, ou une autre classe d'actifs."
          />
        ) : (
          <InstrumentList rows={rows} />
        )}
      </div>

      <p className="mt-3 font-mono text-11 text-mute">
        Variation entre les deux dernières clôtures. Les taux et les spreads sont exprimés en
        points de base, les autres instruments en pourcentage.
      </p>
    </div>
  );
}

export default async function MarchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = parseZone(params[ZONE_PARAM]);
  const assetClass = parseAssetClass(params[ASSET_CLASS_PARAM]);

  return (
    <Suspense key={`${assetClass}-${zone}`} fallback={<MarchesSkeleton />}>
      <MarchesContent assetClass={assetClass} zone={zone} />
    </Suspense>
  );
}
