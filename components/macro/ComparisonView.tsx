import type { Zone } from "@/lib/types";
import { getIndicatorsForMetric, METRIC_LABELS, formatIndicatorValue } from "@/lib/macro";
import { getMacroObservations } from "@/lib/data";
import { ALL_ZONES, ZONE_LABELS, zoneAncestors } from "@/lib/zones";
import { formatDateLong } from "@/lib/format";
import { DataValue } from "@/components/states/DataValue";
import { MetricSelector } from "./MetricSelector";

export function ComparisonView({ metric, zone }: { metric: string; zone: Zone }) {
  const indicators = getIndicatorsForMetric(metric);
  const byZone = new Map(indicators.map((i) => [i.zone, i]));
  const relevantZones = zoneAncestors(zone);
  const rows = ALL_ZONES.filter((z) => z !== "global");

  return (
    <div>
      <MetricSelector current={metric} />

      <p className="mt-4 max-w-[64ch] text-14-5 text-mute">
        {METRIC_LABELS[metric]}, toutes zones. C&rsquo;est ici que les divergences de politique
        monétaire ou de cycle deviennent visibles d&rsquo;un coup d&rsquo;œil.
      </p>

      <div className="mt-4 flex flex-col divide-y divide-line-2 border border-line bg-card">
        {rows.map((z) => {
          const indicator = byZone.get(z);
          const obs = indicator ? getMacroObservations(indicator.id) : [];
          const latest = [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
          const highlighted = relevantZones.includes(z);

          return (
            <div
              key={z}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                highlighted ? "bg-paper" : ""
              }`}
            >
              <span className={`font-display text-14-5 font-bold ${highlighted ? "text-ink" : "text-ink-2"}`}>
                {ZONE_LABELS[z]}
              </span>
              {indicator && latest ? (
                <DataValue
                  value={formatIndicatorValue(indicator, latest.value)}
                  date={latest.date}
                  fetchedAt={latest.fetchedAt}
                  source={latest.source}
                  size="sm"
                />
              ) : (
                <span className="font-mono text-13 italic text-mute">non suivi</span>
              )}
            </div>
          );
        })}
      </div>

      {(() => {
        const withRelease = indicators.find((i) => i.nextRelease && relevantZones.includes(i.zone));
        return withRelease ? (
          <p className="mt-3 font-mono text-11 text-mute">
            Prochaine publication ({ZONE_LABELS[withRelease.zone]}) :{" "}
            {formatDateLong(withRelease.nextRelease!)}
          </p>
        ) : null;
      })()}
    </div>
  );
}
