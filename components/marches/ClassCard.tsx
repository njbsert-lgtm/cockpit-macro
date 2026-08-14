import Link from "next/link";
import type { AssetClass } from "@/lib/types";
import { ASSET_CLASS_LABELS, getClassPerformance } from "@/lib/marches";
import { PerfValue } from "./PerfValue";

export function ClassCard({ assetClass, zone }: { assetClass: AssetClass; zone: string }) {
  const perf = getClassPerformance(assetClass);

  return (
    <Link
      href={`/marches/${assetClass}?zone=${zone}`}
      className="block border border-line bg-card p-4 hover:border-deep"
    >
      <h3 className="font-display text-17 font-bold text-ink">{ASSET_CLASS_LABELS[assetClass]}</h3>
      <p className="mt-0.5 font-mono text-11 text-mute">
        {perf.coverage}/{perf.total} instrument{perf.total > 1 ? "s" : ""} suivi{perf.total > 1 ? "s" : ""}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">YTD</dt>
          <dd className="mt-0.5">
            <PerfValue pct={perf.ytd} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">1 mois</dt>
          <dd className="mt-0.5">
            <PerfValue pct={perf.oneMonth} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-10 uppercase tracking-wider text-mute">1 an</dt>
          <dd className="mt-0.5">
            <PerfValue pct={perf.oneYear} />
          </dd>
        </div>
      </dl>
      <p className="mt-3 font-mono text-11 text-mute">
        Moyenne simple, non pondérée, des instruments suivis — pas un indice représentatif.
      </p>
    </Link>
  );
}
