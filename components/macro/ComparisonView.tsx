import Link from "next/link";
import type { Zone } from "@/lib/types";
import { getIndicatorsForMetric, METRIC_LABELS, formatIndicatorValue } from "@/lib/macro";
import { loadMacroObservations, observationsOf } from "@/lib/observations";
import { ALL_ZONES, ZONE_LABELS, zoneAncestors } from "@/lib/zones";
import { formatDateLong } from "@/lib/format";
import { DataValue } from "@/components/states/DataValue";
import { MetricSelector } from "./MetricSelector";

export async function ComparisonView({ metric, zone }: { metric: string; zone: Zone }) {
  const indicators = getIndicatorsForMetric(metric);
  const byZone = new Map(indicators.map((i) => [i.zone, i]));
  const relevantZones = zoneAncestors(zone);
  const rows = ALL_ZONES.filter((z) => z !== "global");
  const bySeries = await loadMacroObservations(indicators.map((i) => i.id));

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
          const obs = indicator ? observationsOf(bySeries, indicator.id) : [];
          const latest = [...obs].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
          const highlighted = relevantZones.includes(z);
          const rowClass = `flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
            highlighted ? "bg-paper" : ""
          }`;

          const zoneLabel = (
            <span className={`font-display text-14-5 font-bold ${highlighted ? "text-ink" : "text-ink-2"}`}>
              {ZONE_LABELS[z]}
            </span>
          );

          // Rien à ouvrir pour une zone non suivie : la ligne reste un simple constat, pas un
          // lien mort.
          if (!indicator || !latest) {
            return (
              <div key={z} className={rowClass}>
                {zoneLabel}
                <span className="font-mono text-13 italic text-mute">non suivi</span>
              </div>
            );
          }

          return (
            <Link
              key={z}
              href={`/macro/${indicator.id}`}
              className={`${rowClass} hover:bg-line-2 focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-deep`}
            >
              {zoneLabel}
              <DataValue
                value={formatIndicatorValue(indicator, latest.value)}
                date={latest.date}
                fetchedAt={latest.fetchedAt}
                source={latest.source}
                size="sm"
              />
            </Link>
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
