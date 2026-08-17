import Link from "next/link";
import type { MacroIndicator, Observation } from "@/lib/types";
import { formatIndicatorValue } from "@/lib/macro";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { DataValue } from "@/components/states/DataValue";
import { Sparkline } from "./Sparkline";

export function IndicatorCard({
  indicator,
  observations,
}: {
  indicator: MacroIndicator;
  observations: Observation[];
}) {
  const obs = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = obs.at(-1) ?? null;
  const previous = obs.length > 1 ? obs[obs.length - 2] : null;
  const variation = latest && previous ? latest.value - previous.value : null;

  return (
    <Link
      href={`/macro/${indicator.id}`}
      className="block rounded-rc border border-trait bg-page p-4 hover:border-trait-f"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-15 font-bold text-encre">{indicator.label}</h3>
        {variation !== null && (
          <span
            className={`shrink-0 text-12 font-semibold tabular-nums ${
              variation > 0 ? "text-hausse" : variation < 0 ? "text-baisse" : "text-tenu"
            }`}
            title={`Depuis le relevé du ${formatDateShort(previous!.date)}`}
          >
            {variation > 0 ? "+" : ""}
            {variation.toFixed(1).replace(".", ",")} pt
          </span>
        )}
      </div>

      <div className="mt-3">
        {latest ? (
          <DataValue
            value={formatIndicatorValue(indicator, latest.value)}
            date={latest.date}
            fetchedAt={latest.fetchedAt}
            source={latest.source}
          />
        ) : (
          <span className="text-13 italic text-tenu">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      {obs.length > 1 && (
        <div className="mt-3">
          <Sparkline points={obs.map((o) => o.value)} />
        </div>
      )}

      <p className="mt-3 text-11 text-tenu">
        {indicator.nextRelease
          ? `Prochaine publication : ${formatDateLong(indicator.nextRelease)}`
          : "Prochaine date de publication non communiquée"}
      </p>
    </Link>
  );
}
