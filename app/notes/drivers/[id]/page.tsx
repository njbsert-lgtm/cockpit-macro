import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDriver,
  getDrivers,
  getCurrentBranches,
  getNotesRevising,
  getScenarioVersionsByDriver,
  getTrend,
} from "@/lib/content";
import { getInstrument } from "@/lib/data";
import { loadObservations, observationsOf } from "@/lib/observations";
import { getAlertsForInstrument } from "@/lib/alerts";
import { formatInstrumentValue } from "@/lib/marches";
import { formatDateLong, formatSignedPct } from "@/lib/format";
import { BRANCH_LABELS, BRANCH_ORDER, LIKELIHOOD_LABELS } from "@/lib/scenario-labels";
import { DriverBranches } from "@/components/notes/DriverBranches";
import { ScenarioTrajectory } from "@/components/notes/ScenarioTrajectory";
import { DataValue } from "@/components/states/DataValue";
import { TREND_STATUS_CLASS, TREND_STATUS_LABEL } from "@/lib/trend-labels";

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-22 font-extrabold text-ink">{children}</h2>
  );
}

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

  const revisions = getNotesRevising(driver.id);
  // Chargé avant le rendu : la liste des instruments pilotés est construite dans le JSX, où
  // l'on ne peut pas attendre une promesse par ligne.
  const bySeries = await loadObservations(driver.instrumentRefs);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href="/notes"
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Retour aux notes
      </Link>

      {/* 1 — La question et la branche dominante */}
      <p className="font-mono text-11 uppercase tracking-wider text-mute">
        Driver · {driver.label}
        {driver.retiredAt && " · retiré"}
      </p>
      <h1 className="mt-1.5 max-w-[28ch] font-display text-28 font-extrabold leading-tight text-ink">
        {driver.question}
      </h1>
      <p className="mt-3 text-16 text-ink-2">
        Aujourd&rsquo;hui, la branche dominante est{" "}
        <strong className="font-semibold text-ink">
          {BRANCH_LABELS[driver.dominantBranchId] ?? driver.dominantBranchId}
        </strong>
        {" — "}
        <Link
          href={`/notes/${driver.lastRevisedIn}`}
          className="text-deep underline decoration-line underline-offset-4"
        >
          révisée le {formatDateLong(driver.lastRevisedAt)}
        </Link>
        .
      </p>
      {driver.retiredAt && (
        <p className="mt-3 border-l-3 border-mute bg-paper px-3.5 py-2.5 text-13-5 text-ink-2">
          Ce driver a été retiré le {formatDateLong(driver.retiredAt)} : il ne figure plus en
          en-tête des notes. Sa page reste consultable — on ne supprime pas une lecture
          passée.
        </p>
      )}

      {/* 2 — Les trois branches */}
      <SectionTitle>Les trois branches</SectionTitle>
      <p className="mt-1 max-w-[64ch] text-15 text-mute">
        Comparables côte à côte : la thèse, les impacts par classe d&rsquo;actifs, et ce qui
        confirmerait ou infirmerait chacune.
      </p>
      <div className="mt-4">
        <DriverBranches branches={ordered} dominantBranchId={driver.dominantBranchId} />
      </div>

      {/* 3 — La trajectoire */}
      <SectionTitle>Trajectoire</SectionTitle>
      <p className="mt-1 max-w-[64ch] text-15 text-mute">
        Comment la vraisemblance de chaque branche a évolué — la vue qui montre si la lecture a
        suivi les données ou couru derrière les prix.
      </p>
      <div className="mt-4">
        <ScenarioTrajectory versions={versions} branchOrder={branchOrder} />
      </div>

      {/* 4 — Les instruments pilotés */}
      <SectionTitle>Les instruments qu&rsquo;il pilote</SectionTitle>
      <ul className="mt-4 flex flex-col divide-y divide-line-2 border border-line bg-card">
        {driver.instrumentRefs.map((instrumentId) => {
          const instrument = getInstrument(instrumentId)!;
          const obs = [...observationsOf(bySeries, instrumentId)].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
          const latest = obs.at(-1) ?? null;
          const alerts = getAlertsForInstrument(instrumentId);

          return (
            <li key={instrumentId} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  href={`/marches/${instrument.assetClass}/${instrumentId}`}
                  className="font-display text-14-5 font-bold text-ink hover:text-deep"
                >
                  {instrument.label}
                </Link>
                {latest ? (
                  <DataValue
                    value={formatInstrumentValue(instrument, latest.value)}
                    date={latest.date}
                    fetchedAt={latest.fetchedAt}
                    source={latest.source}
                    size="sm"
                  />
                ) : (
                  <span className="font-mono text-13 italic text-mute">aucun relevé</span>
                )}
              </div>
              {alerts.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {alerts.map(({ rule, event }) => (
                    <li
                      key={`${event.ruleId}-${event.firedAt}`}
                      className="border-l-3 border-rust bg-rust-bg px-3 py-1.5 text-13 text-ink-2"
                    >
                      <span className="font-mono text-10-5 font-semibold uppercase tracking-wider text-rust">
                        Alerte
                      </span>{" "}
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
                            className="text-deep underline decoration-line underline-offset-4"
                          >
                            {event.noteSlug}
                          </Link>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* 5 — Les tendances de fond */}
      <SectionTitle>Les tendances qu&rsquo;il touche</SectionTitle>
      <ul className="mt-4 flex flex-col gap-2">
        {driver.trendRefs.map((trendId) => {
          const trend = getTrend(trendId)!;
          const canInvalidate = trend.driverRefs.includes(driver.id);
          return (
            <li key={trendId}>
              <Link
                href={`/notes/tendances/${trendId}`}
                className="block border border-line bg-card px-3.5 py-3 hover:border-deep"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-14-5 font-bold text-ink">{trend.title}</span>
                  <span
                    className={`px-2 py-0.5 font-mono text-10 font-semibold uppercase tracking-wider ${TREND_STATUS_CLASS[trend.status]}`}
                  >
                    {TREND_STATUS_LABEL[trend.status]}
                  </span>
                </div>
                <span className="mt-1 block font-mono text-11 text-mute">
                  {canInvalidate
                    ? "Ce driver pourrait la faire tomber"
                    : "Ce driver l’alimente, sans pouvoir l’invalider"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 6 — Les notes qui l'ont révisé */}
      <SectionTitle>Les notes qui l&rsquo;ont révisé</SectionTitle>
      <ol className="mt-4 flex flex-col gap-2">
        {revisions.map((note) => {
          const revised = versions.filter((v) => v.noteSlug === note.slug);
          return (
            <li key={note.slug}>
              <Link
                href={`/notes/${note.slug}`}
                className="block border border-line-2 bg-card px-3.5 py-2.5 hover:border-deep"
              >
                <span className="font-display text-14 font-bold text-ink">
                  {note.regimeStatement}
                </span>
                <span className="mt-1 block font-mono text-11 text-mute">
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
    </div>
  );
}
