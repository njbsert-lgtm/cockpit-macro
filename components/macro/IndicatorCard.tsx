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
    <div className="border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-15 font-bold text-ink">{indicator.label}</h3>
        {variation !== null && (
          <span
            className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
              variation > 0 ? "text-ochre" : variation < 0 ? "text-teal" : "text-mute"
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
          <span className="font-mono text-13 italic text-mute">Aucun relevé pour l&rsquo;instant</span>
        )}
      </div>

      {obs.length > 1 && (
        <div className="mt-3">
          <Sparkline points={obs.map((o) => o.value)} />
        </div>
      )}

      <p className="mt-3 font-mono text-11 text-mute">
        {indicator.nextRelease
          ? `Prochaine publication : ${formatDateLong(indicator.nextRelease)}`
          : "Prochaine date de publication non communiquée"}
      </p>
    </div>
  );
}
