import { Suspense } from "react";
import { DEFAULT_ZONE, parseZone, ZONE_PARAM } from "@/lib/zone-param";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_PARAM,
  formatDailyChange,
  formatInstrumentValue,
  formatYtd,
  getRatesInstruments,
  isRateCountryZone,
  parseAssetClass,
} from "@/lib/marches";
import { getInstrumentsByAssetClass } from "@/lib/data";
import { loadObservations, observationsOf, type ObservationsBySeries } from "@/lib/observations";
import { dailyChange, latestObservation, MAX_SESSION_GAP_DAYS, ytdChange } from "@/lib/performance";
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
    const ytd = ytdChange(instrument, obs);
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
      ytd: formatYtd(instrument, obs),
      // Un écart exactement nul reste « flat » : il ne se peint ni en vert ni en rouge.
      ytdDirection: ytd === null ? null : ytd.absolute > 0 ? "up" : ytd.absolute < 0 ? "down" : "flat",
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
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Marchés</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">
        {ASSET_CLASS_LABELS[assetClass]}
      </h1>
      {isCurve && (
        <p className="mt-1 text-12-5 text-tenu">
          Courbe {ZONE_LABELS[zone]} — 6 mois à 20 ans.
        </p>
      )}

      <FilterRows assetClass={assetClass} zone={zone} />

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title={
              assetClass === "rates"
                ? `Aucun instrument de cette classe pour ${ZONE_LABELS[zone]}`
                : "Aucun instrument suivi dans cette classe"
            }
            description={
              assetClass === "rates"
                ? "Choisissez « Toutes » dans la rangée des zones pour voir l'ensemble des instruments suivis, ou une autre classe d'actifs."
                : "Choisissez une autre classe d'actifs dans la rangée au-dessus."
            }
          />
        ) : (
          <InstrumentList rows={rows} />
        )}
      </div>

      <p className="mt-3 text-11 text-tenu">
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
  const assetClass = parseAssetClass(params[ASSET_CLASS_PARAM]);
  // Seules les obligations ont une notion de zone : une courbe souveraine appartient à un
  // émetteur. Un indice actions, une devise ou une matière première sont mondiaux — les
  // filtrer par pays revenait à masquer une partie de la liste sans rien apprendre. Les trois
  // autres classes sont donc figées sur la vue d'ensemble, et un `?zone=` traînant dans l'URL
  // est ignoré plutôt que d'appliquer un filtre qui n'a plus de commande à l'écran.
  const zone = assetClass === "rates" ? parseZone(params[ZONE_PARAM]) : DEFAULT_ZONE;

  return (
    <Suspense key={`${assetClass}-${zone}`} fallback={<MarchesSkeleton />}>
      <MarchesContent assetClass={assetClass} zone={zone} />
    </Suspense>
  );
}
