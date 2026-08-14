import type { Edition } from "@/lib/types";
import { formatDateLong } from "@/lib/format";

export function RegimeHeader({ edition }: { edition: Edition }) {
  return (
    <div className="bg-deep px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-content">
        <p className="font-mono text-11 font-semibold uppercase tracking-widest-2 text-deep-fg-muted">
          Régime au {formatDateLong(edition.date)}
        </p>
        <h1 className="mt-2.5 max-w-[22ch] font-display text-display font-extrabold tracking-tight text-white">
          {edition.regimeStatement}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-4">
          {edition.keyIndicators.map((ind) => (
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
      </div>
    </div>
  );
}
