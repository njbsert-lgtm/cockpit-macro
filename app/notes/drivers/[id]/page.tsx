import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDriver,
  getDrivers,
  getCurrentBranches,
  getNote,
  getNotes,
  getNotesRevising,
  getScenarioVersionsByDriver,
  getTrend,
} from "@/lib/content";
import { getInstrument } from "@/lib/data";
import { loadObservations, observationsOf } from "@/lib/observations";
import { getAlertsForInstrument } from "@/lib/alerts";
import { getReadClient } from "@/lib/supabase";
import { lireAnglesMorts, vueDriver } from "@/lib/angles-morts";
import { AnglesMortsDriver } from "@/components/notes/AnglesMortsDriver";
import { formatDailyChange, formatInstrumentValue } from "@/lib/marches";
import { dailyChange } from "@/lib/performance";
import { estNonCollectee } from "@/lib/provenance";
import { expirer } from "@/lib/guets";
import { formatDateLong, formatJourMois, formatSignedPct } from "@/lib/format";
import { BRANCH_LABELS, BRANCH_ORDER, DRIVER_NON_REVISE, LIKELIHOOD_LABELS } from "@/lib/scenario-labels";
import { DriverBranches, type AncienCran } from "@/components/notes/DriverBranches";
import { ScenarioTrajectory, semaineDeNote } from "@/components/notes/ScenarioTrajectory";
import { GuetLine } from "@/components/notes/GuetLine";
import { SectionHeader } from "@/components/notes/SectionHeader";
import { NonCollecteBadge } from "@/components/states/NonCollecteBadge";
import {
  TREND_NON_REVISEE,
  TREND_STATUS_CLASS,
  TREND_STATUS_LABEL,
  TREND_TRAJECTORY,
  trendEstRevisee,
} from "@/lib/trend-labels";

/**
 * Énumère les drivers au build. Effet de bord voulu, comme pour les notes : cela force le
 * contrôle d'intégrité de tout le graphe pendant `next build`, donc une référence morte fait
 * échouer la compilation au lieu de produire un lien mort.
 */
export function generateStaticParams() {
  return getDrivers().map((d) => ({ id: d.id }));
}

/**
 * La page est pré-rendue, mais elle affiche la valeur du jour des instruments pilotés : sans
 * revalidation, elle figerait les chiffres à la date du build. Une heure suffit largement
 * pour une collecte quotidienne, et le cron révalide lui-même après chaque passage.
 */
export const revalidate = 3600;

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = getDriver(id);
  if (!driver) notFound();

  const versions = getScenarioVersionsByDriver(driver.id);
  const current = getCurrentBranches(driver.id);
  const branchOrder = BRANCH_ORDER[driver.id] ?? current.map((b) => b.branchId);
  const ordered = branchOrder
    .map((b) => current.find((c) => c.branchId === b))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  // La dernière révision garde la trace de l'ancien cran de chaque branche qu'elle a déplacée :
  // « était faible en S41 », et un repère sur la jauge.
  const anciensCrans: Record<string, AncienCran> = {};
  for (const b of current) {
    if (!b.likelihoodChangedFrom || b.noteSlug !== driver.lastRevisedIn) continue;
    const reference = getNote(b.noteSlug)?.comparesTo;
    if (reference) anciensCrans[b.branchId] = { from: b.likelihoodChangedFrom, semaine: semaineDeNote(reference) };
  }

  // Les guets encore ouverts sur ce driver, toutes notes confondues : la question à trancher se
  // lit à côté du prix. Un guet remonté n'apparaît qu'une fois, sous sa note d'origine.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const guetsOuverts = [
    ...new Map(
      getNotes()
        .flatMap((n) => expirer(n.guets, aujourdhui))
        .filter((g) => g.driverId === driver.id && g.statut === "ouvert")
        .map((g) => [g.id, g]),
    ).values(),
  ].sort((a, b) => a.noteSlug.localeCompare(b.noteSlug));

  const revisions = getNotesRevising(driver.id);
  // Chargé avant le rendu : la liste des instruments pilotés est construite dans le JSX, où
  // l'on ne peut pas attendre une promesse par ligne.
  const bySeries = await loadObservations(driver.instrumentRefs);
  const anglesMorts = vueDriver(await lireAnglesMorts(getReadClient()), driver.id, new Date());

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/notes"
          className="inline-flex min-h-11 items-center text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
        >
          ← Notes
        </Link>
        {driver.lastRevisedIn && driver.lastRevisedAt ? (
          <Link
            href={`/notes/${driver.lastRevisedIn}`}
            className="inline-flex min-h-11 items-center text-11 text-tenu hover:text-encre"
          >
            révisé le {formatJourMois(driver.lastRevisedAt)} · {semaineDeNote(driver.lastRevisedIn)}
          </Link>
        ) : (
          <span className="text-11 text-tenu">{DRIVER_NON_REVISE}</span>
        )}
      </div>

      {/* 1 — La question et la branche dominante (nommée dans la carte des branches) */}
      <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
        Driver · {driver.label}
        {driver.retiredAt && " · retiré"}
      </p>
      <h1 className="mt-1.5 max-w-[28ch] text-22 font-bold leading-[1.2] tracking-titre text-pretty text-encre">
        {driver.question}
      </h1>
      {driver.retiredAt && (
        <p className="mt-3 border-l-3 border-trait-f bg-repos px-3.5 py-2.5 text-13 text-doux">
          Ce driver a été retiré le {formatDateLong(driver.retiredAt)} : il ne figure plus en
          en-tête des notes. Sa page reste consultable — on ne supprime pas une lecture
          passée.
        </p>
      )}

      {/* 2 — Les trois branches */}
      <div className="mt-4">
        {driver.dominantBranchId && ordered.length > 0 ? (
          <DriverBranches
            branches={ordered}
            dominantBranchId={driver.dominantBranchId}
            anciensCrans={anciensCrans}
          />
        ) : (
          <div className="rounded-rc bg-repos p-4">
            <p className="text-14-5 font-semibold text-encre">{DRIVER_NON_REVISE}</p>
            <p className="mt-1 text-12-5 text-doux">
              Aucune note publiée n&rsquo;a encore tranché entre ses trois branches : la prochaine
              révision en posera la première version.
            </p>
          </div>
        )}
      </div>

      {/* 3 — La trajectoire */}
      <div className="mt-7">
        <SectionHeader title="Trajectoire" count={(() => {
            const n = new Set(versions.map((v) => v.noteSlug)).size;
            return n === 0 ? "aucune note" : `${n} note${n > 1 ? "s" : ""}`;
          })()} />
      </div>
      <div className="mt-3">
        <ScenarioTrajectory versions={versions} branchOrder={branchOrder} />
      </div>

      {/* 4 — Les instruments pilotés */}
      <div className="mt-7">
        <SectionHeader title="Instruments pilotés" count="séance" />
      </div>
      <div className="mt-3 overflow-hidden rounded-rc border border-trait">
        <ul className="grid grid-cols-3 gap-px bg-trait">
          {driver.instrumentRefs.map((instrumentId) => {
            const instrument = getInstrument(instrumentId)!;
            const obs = observationsOf(bySeries, instrumentId);
            const latest = [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
            const nonCollecte = estNonCollectee(latest ?? undefined);
            const change = nonCollecte ? null : dailyChange(obs);
            return (
              <li key={instrumentId} className="bg-page">
                <Link
                  href={`/marches/${instrument.assetClass}/${instrumentId}`}
                  className="block min-h-11 px-3 py-2.5 transition-colors hover:bg-repos"
                >
                  <span className="block truncate text-9-5 font-semibold uppercase tracking-cap text-tenu">
                    {instrument.label}
                  </span>
                  {change ? (
                    <span
                      className={`mt-1 block text-13 font-semibold tabular-nums ${
                        change.direction === "up" ? "text-hausse" : change.direction === "down" ? "text-baisse" : "text-tenu"
                      }`}
                    >
                      {formatDailyChange(instrument, change)}
                    </span>
                  ) : latest ? (
                    <>
                      <span className="mt-1 block text-13 font-semibold tabular-nums text-encre">
                        {formatInstrumentValue(instrument, latest.value)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-10-5 text-tenu">
                        {nonCollecte && <NonCollecteBadge />}
                        le {formatJourMois(latest.date)}
                      </span>
                    </>
                  ) : (
                    <span className="mt-1 block text-13 italic text-tenu">aucun relevé</span>
                  )}
                </Link>
              </li>
            );
          })}
          {Array.from({ length: (3 - (driver.instrumentRefs.length % 3)) % 3 }, (_, i) => (
            <li key={`vide-${i}`} aria-hidden="true" className="bg-page" />
          ))}
        </ul>
      </div>
      {driver.instrumentRefs.flatMap((id) => getAlertsForInstrument(id)).length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {driver.instrumentRefs.flatMap((instrumentId) =>
            getAlertsForInstrument(instrumentId).map(({ rule, event, nonCollecte }) => (
              <li
                key={`${event.ruleId}-${event.firedAt}`}
                className="border-l-3 border-k-choc bg-k-choc/11 px-3 py-1.5 text-13 text-doux"
              >
                <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">Alerte</span>{" "}
                {nonCollecte && (
                  <>
                    <NonCollecteBadge />{" "}
                  </>
                )}
                {rule.label} — {event.direction === "up" ? "hausse" : "baisse"} de{" "}
                {rule.measure === "percent"
                  ? formatSignedPct(event.direction === "up" ? event.observed : -event.observed)
                  : `${event.observed} bps`}{" "}
                le {formatDateLong(event.toDate)}
                {event.noteSlug && (
                  <>
                    {" · "}
                    <Link
                      href={`/notes/${event.noteSlug}`}
                      className="text-encre underline decoration-trait underline-offset-4"
                    >
                      {event.noteSlug}
                    </Link>
                  </>
                )}
              </li>
            )),
          )}
        </ul>
      )}

      {/* 4bis — Le guet ouvert : la question à trancher, lue avec le prix */}
      {guetsOuverts.length > 0 && (
        <>
          <div className="mt-7">
            <SectionHeader
              title={guetsOuverts.length > 1 ? "Guets ouverts" : "Guet ouvert"}
              count={`depuis ${semaineDeNote(guetsOuverts[0].noteSlug)}`}
            />
          </div>
          <ul className="mt-3 rounded-rc border border-trait bg-page px-4 py-3.5">
            {guetsOuverts.map((g) => (
              <GuetLine key={g.id} guet={g} />
            ))}
          </ul>
        </>
      )}

      {/* 5 — Les tendances de fond */}
      <div className="mt-7">
        <SectionHeader title="Les tendances qu’il touche" />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {driver.trendRefs.map((trendId) => {
          const trend = getTrend(trendId)!;
          const canInvalidate = trend.driverRefs.includes(driver.id);
          return (
            <li key={trendId}>
              {/* La forme de la ligne de tendance (DESIGN.md) — jamais une carte haute, pour
                  qu'une tendance ne se confonde pas avec un driver. */}
              <Link
                href={`/notes/tendances/${trendId}`}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-rc border border-trait bg-page px-4 py-3.5 transition-colors hover:border-trait-f active:scale-[.99]"
              >
                <span className="min-w-0">
                  <span className="block text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">
                    {trend.title}
                  </span>
                  <span className="mt-1 block text-12 text-tenu">
                    {canInvalidate
                      ? "Ce driver pourrait la faire tomber"
                      : "Ce driver l’alimente, sans pouvoir l’invalider"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {trendEstRevisee(trend) ? (
                    <>
                      <span
                        className={`rounded-rp px-2 py-0.5 text-9-5 font-semibold uppercase tracking-cap ${TREND_STATUS_CLASS[trend.status]}`}
                      >
                        {TREND_STATUS_LABEL[trend.status]}
                      </span>
                      <span className="text-11 text-tenu">{TREND_TRAJECTORY[trend.status]}</span>
                    </>
                  ) : (
                    <span className="max-w-[12ch] text-right text-11 leading-snug text-tenu">{TREND_NON_REVISEE}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 6 — Les notes qui l'ont révisé */}
      <div className="mt-7">
        <SectionHeader title="Les notes qui l’ont révisé" />
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {revisions.map((note) => {
          const revised = versions.filter((v) => v.noteSlug === note.slug);
          return (
            <li key={note.slug}>
              <Link
                href={`/notes/${note.slug}`}
                className="block rounded-rc border border-trait bg-page px-4 py-3 transition-colors hover:border-trait-f active:scale-[.99]"
              >
                <span className="block text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">
                  {note.regimeStatement}
                </span>
                <span className="mt-1 block text-11 text-tenu">
                  {note.slug} · {formatDateLong(note.date)} ·{" "}
                  {revised
                    .map(
                      (v) =>
                        `${BRANCH_LABELS[v.branchId] ?? v.branchId} → ${LIKELIHOOD_LABELS[v.likelihood].toLowerCase()}`,
                    )
                    .join(" ; ")}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* 7 — Les angles morts : ce que ce driver n'a pas su accueillir */}
      <AnglesMortsDriver vue={anglesMorts} />
    </div>
  );
}
