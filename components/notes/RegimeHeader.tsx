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
    <div className="bg-encre px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-colonne md:max-w-content">
        {/* La phrase de régime s'affiche seule, sans étiquette de date : la date figure déjà
            à côté de la semaine ISO, sur la carte-article qui a mené jusqu'ici et sur l'en-tête
            de la note elle-même. La répéter ici serait redondant. */}
        <h1 className="max-w-[22ch] text-27 font-semibold tracking-tight text-white">
          {note.regimeStatement}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-4">
          {note.keyIndicators.map((ind) => (
            <div key={ind.label} className="bg-encre px-3.5 py-3">
              <dt className="text-10-5 uppercase tracking-cap text-tenu">
                {ind.label}
              </dt>
              <dd className="mt-1.5 text-15 font-bold leading-tight text-white">
                {ind.value}
              </dd>
            </div>
          ))}
        </dl>

        <DriverCards drivers={drivers} />

        {(drivers.length > 0 || pendingVeilleCount !== undefined) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {drivers.length > 0 && (
              <p className="text-11 text-doux">
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
                className="inline-flex min-h-11 items-center gap-2 rounded-rc border border-trait bg-page px-3 py-1.5 text-12-5 text-encre hover:border-k-choc"
              >
                Triage
                <span
                  aria-hidden="true"
                  className="rounded-rp bg-encre px-1.5 py-0.5 text-10-5 text-white"
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
