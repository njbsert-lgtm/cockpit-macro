import Link from "next/link";
import type { Driver, Note } from "@/lib/types";
import { DriverCards } from "./DriverCards";

export function RegimeHeader({
  note,
  drivers = [],
}: {
  note: Note;
  drivers?: Driver[];
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

        {drivers.length > 0 && (
          <p className="mt-4 font-mono text-11 text-deep-fg">
            <Link
              href="/notes/tendances"
              className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              Voir les tendances de fond →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
