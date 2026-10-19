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
import Link from "next/link";
import { getInstrument, getInstrumentsByAssetClass } from "@/lib/data";
import { getActiveDriversWithBranches, getLatestNote } from "@/lib/content";
import { BRANCH_LABELS, DRIVER_NON_REVISE } from "@/lib/scenario-labels";
import { loadObservations, observationsOf, type ObservationsBySeries } from "@/lib/observations";
import { dailyChange, latestObservation, MAX_SESSION_GAP_DAYS, ytdChange } from "@/lib/performance";
import { freshnessTier } from "@/lib/freshness";
import { estNonCollectee } from "@/lib/provenance";
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
  instruments: Instrument[],
  bySeries: ObservationsBySeries,
  zone: Zone,
  // Ne sert qu'à l'affichage : le pays est déjà porté par le libellé (« OAT 6 mois ») et par la
  // rangée de zones au-dessus, répéter « France » sur les sept lignes n'ajouterait rien.
  isCurve = false,
): InstrumentRow[] {
  return instruments.map((instrument) => {
    const obs = observationsOf(bySeries, instrument.id);
    const latest = latestObservation(obs);
    // Rien ne se calcule sur une valeur saisie à la main : une pastille verte ou un YTD rouge
    // dessinés sur des chiffres inventés se liraient comme de vrais mouvements.
    const nonCollecte = estNonCollectee(latest);
    const change = nonCollecte ? null : dailyChange(obs);
    const ytd = nonCollecte ? null : ytdChange(instrument, obs);
    const sorted = [...obs].sort((a, b) => a.date.localeCompare(b.date));
    const previous = sorted.at(-2) ?? null;

    return {
      id: instrument.id,
      label: instrument.label,
      href: `/marches/${instrument.assetClass}/${instrument.id}?${ZONE_PARAM}=${zone}`,
      value: latest ? formatInstrumentValue(instrument, latest.value) : null,
      date: latest?.date ?? null,
      tier: freshnessTier(latest?.fetchedAt),
      change: change ? formatDailyChange(instrument, change) : null,
      direction: change?.direction ?? null,
      ytd: nonCollecte ? null : formatYtd(instrument, obs),
      nonCollecte,
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
  const isCurve = assetClass === "rates" && isRateCountryZone(zone);
  const rows = buildRows(instruments, bySeries, zone, isCurve);

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

      <VueSegment vue="classes" />
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

/**
 * La vue « Par driver » (maquette 1c) : les instruments rangés sous le driver qu'ils arbitrent
 * (`instrumentRefs`), dans l'ordre d'intensité de la dernière note, avec la branche centrale en
 * tête de groupe — on lit le prix contre le scénario.
 */
async function MarchesParDriver() {
  await simulateLoad();
  const drivers = getActiveDriversWithBranches();
  const ordre = getLatestNote()?.driverOrder ?? [];
  const rang = (id: string) => (ordre.includes(id) ? ordre.indexOf(id) : ordre.length);
  const tries = [...drivers].sort((a, b) => rang(a.driver.id) - rang(b.driver.id));
  const ids = [...new Set(tries.flatMap(({ driver }) => driver.instrumentRefs))];
  const bySeries = await loadObservations(ids);

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Marchés</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Par driver</h1>
      <VueSegment vue="drivers" />

      {tries.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Aucun driver actif"
            description="Les drivers apparaissent avec la première note publiée. Revenez à la vue par classes d'actifs."
          />
        </div>
      ) : (
        tries.map(({ driver, branches }) => {
          const instruments = driver.instrumentRefs
            .map((id) => getInstrument(id))
            .filter((i): i is Instrument => i !== null);
          const centrale = branches.find((b) => b.likelihood === "central");
          return (
            <section key={driver.id} className="mt-6" aria-label={driver.label}>
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/notes/drivers/${driver.id}`}
                  className="group inline-flex min-h-11 items-center gap-1 text-15-5 font-semibold text-encre"
                >
                  {driver.label}
                  <span aria-hidden="true" className="text-tenu transition-transform group-hover:translate-x-0.5">
                    ›
                  </span>
                </Link>
                {centrale ? (
                  <span className="text-11 text-tenu">
                    centrale : {(BRANCH_LABELS[centrale.branchId] ?? centrale.branchId).toLowerCase()}
                  </span>
                ) : (
                  <span className="text-11 text-tenu">{DRIVER_NON_REVISE}</span>
                )}
              </div>
              {instruments.length > 0 ? (
                <InstrumentList rows={buildRows(instruments, bySeries, DEFAULT_ZONE)} />
              ) : (
                <p className="text-12-5 text-tenu">Aucun instrument rattaché à ce driver.</p>
              )}
            </section>
          );
        })
      )}
      <p className="mt-3 text-11 text-tenu">Vraisemblances éditoriales, non implicites de marché.</p>
    </div>
  );
}

/** Le segment « Classes d'actifs | Par driver » : un paramètre d'URL, `?vue=drivers`. */
function VueSegment({ vue }: { vue: "classes" | "drivers" }) {
  const options = [
    { id: "classes", label: "Classes d'actifs", href: "/marches" },
    { id: "drivers", label: "Par driver", href: "/marches?vue=drivers" },
  ] as const;
  return (
    <div className="mt-3 inline-flex rounded-rp bg-repos p-[3px]" role="group" aria-label="Vue">
      {options.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === vue ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-rp px-3.5 text-12 font-medium transition-colors ${
            o.id === vue ? "bg-encre text-page" : "text-doux hover:text-encre"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export default async function MarchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  if (params.vue === "drivers") {
    return (
      <Suspense key="drivers" fallback={<MarchesSkeleton />}>
        <MarchesParDriver />
      </Suspense>
    );
  }
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
