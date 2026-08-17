"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateShort } from "@/lib/format";

/** Graphique de série générique, réutilisé pour un instrument de marché comme pour un
 * indicateur macro : les deux ne sont qu'une suite de points datés. */
export function HistoryChart({
  points,
}: {
  points: Array<{ date: string; value: number }>;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-rc border border-dashed border-trait-f px-4 text-center text-12-5 text-doux">
        Moins de deux relevés sur cette période — rien à tracer.
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-rc border border-trait bg-page p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-trait)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateShort(d)}
            tick={{ fontSize: 10.5, fill: "var(--color-tenu)" }}
            axisLine={{ stroke: "var(--color-trait)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10.5, fill: "var(--color-tenu)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            labelFormatter={(d) => formatDateShort(String(d))}
            formatter={(value) => [Number(value).toLocaleString("fr-FR"), "Valeur"]}
            contentStyle={{
              border: "1px solid var(--color-trait)",
              borderRadius: 10,
              fontSize: 12.5,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-encre)"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
