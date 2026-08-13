import type { Edition } from "@/lib/types";
import { formatDateLong } from "@/lib/format";

export function RegimeHeader({ edition }: { edition: Edition }) {
  return (
    <div className="bg-deep px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-[1060px]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9FC0C6]">
          Régime au {formatDateLong(edition.date)}
        </p>
        <h1 className="mt-2.5 max-w-[22ch] font-display text-[clamp(24px,4.6vw,38px)] font-extrabold leading-[1.1] tracking-tight text-white">
          {edition.regimeStatement}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-4">
          {edition.keyIndicators.map((ind) => (
            <div key={ind.label} className="bg-deep px-3.5 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9FC0C6]">
                {ind.label}
              </dt>
              <dd className="mt-1.5 font-display text-[15px] font-bold leading-tight text-white">
                {ind.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
