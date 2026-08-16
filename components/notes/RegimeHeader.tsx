import Link from "next/link";
import type { Driver, Note } from "@/lib/types";
import { DriverCards } from "./DriverCards";

export function RegimeHeader({
  note,
  drivers = [],
  pendingVeilleCount,
}: {
  note: Note;
  drivers?: Driver[];
  /**
   * Omis sur la page d'une note individuelle, qui ne recharge pas la file de veille pour un
   * bouton secondaire : afficher un « 0 » par défaut mentirait sur l'état réel de la file.
   * Le bouton Triage ne s'affiche que là où le compte a été passé — l'écran d'accueil.
   */
  pendingVeilleCount?: number;
}) {
  return (
    <div className="bg-deep px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-content">
        {/* La phrase de régime s'affiche seule, sans étiquette de date : la date figure déjà
            à côté de la semaine ISO, sur la carte-article qui a mené jusqu'ici et sur l'en-tête
            de la note elle-même. La répéter ici serait redondant. */}
        <h1 className="max-w-[22ch] font-display text-display font-extrabold tracking-tight text-white">
          {note.regimeStatement}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-4">
          {note.keyIndicators.map((ind) => (
            <div key={ind.label} className="bg-deep px-3.5 py-3">
              <dt className="font-mono text-10 uppercase tracking-wider-2 text-deep-fg-muted">
                {ind.label}
              </dt>
              <dd className="mt-1.5 font-display text-15 font-bold leading-tight text-white">
                {ind.value}
              </dd>
            </div>
          ))}
        </dl>

        <DriverCards drivers={drivers} />

        {(drivers.length > 0 || pendingVeilleCount !== undefined) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {drivers.length > 0 && (
              <p className="font-mono text-11 text-deep-fg">
                <Link
                  href="/notes/tendances"
                  className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
                >
                  Voir les tendances de fond →
                </Link>
              </p>
            )}

            {pendingVeilleCount !== undefined && (
              <Link
                href="/triage"
                className="inline-flex min-h-11 items-center gap-2 border border-line bg-card px-3 py-1.5 font-mono text-12-5 text-ink hover:border-ochre focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Triage
                <span
                  aria-hidden="true"
                  className="rounded-xs bg-deep px-1.5 py-0.5 font-mono text-10-5 text-white"
                >
                  {pendingVeilleCount}
                </span>
                <span className="sr-only">
                  {pendingVeilleCount} item{pendingVeilleCount > 1 ? "s" : ""} en attente de tri
                </span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
