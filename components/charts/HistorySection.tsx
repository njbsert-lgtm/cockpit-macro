"use client";

import { useState } from "react";
import { HistoryChart } from "./HistoryChart";
import { formatDateShort } from "@/lib/format";
import {
  DEFAULT_RANGE,
  filterByRange,
  RANGE_LABELS,
  RANGE_ORDER,
  type RangeKey,
  type SeriesPoint,
} from "@/lib/chart-range";

/**
 * Le graphique d'une série avec son échelle de temporalité.
 *
 * La rangée d'échelles est un segment défilant, comme celui des zones : huit boutons ne
 * tiennent pas dans 520px. La fenêtre est ancrée sur le dernier relevé et non sur la date du
 * jour — une série qui a cessé d'être publiée doit continuer à montrer son historique, pas un
 * graphique vide.
 *
 * La période réellement couverte est écrite sous le graphique : un axe seul ne dit pas si
 * « 5 ans » affiche cinq ans ou trois mois d'historique disponible.
 */
export function HistorySection({ points }: { points: SeriesPoint[] }) {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const visible = filterByRange(points, range);
  const first = visible[0];
  const last = visible[visible.length - 1];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Échelle de temps"
        className="sans-barre -mx-4.5 flex gap-1.5 overflow-x-auto px-4.5 md:mx-0 md:px-0"
      >
        {RANGE_ORDER.map((key) => {
          const active = key === range;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(key)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-rp border px-3 text-13 font-medium transition-colors ${
                active
                  ? "border-encre bg-encre text-white"
                  : "border-trait bg-page text-doux hover:border-trait-f hover:text-encre"
              }`}
            >
              {RANGE_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <HistoryChart points={visible} />
      </div>

      <p className="mt-2 text-11 text-tenu">
        {visible.length === 0
          ? "Aucun relevé sur cette période."
          : `${visible.length} relevé${visible.length > 1 ? "s" : ""} — du ${formatDateShort(
              first.date,
            )} au ${formatDateShort(last.date)}.`}
      </p>
    </div>
  );
}
