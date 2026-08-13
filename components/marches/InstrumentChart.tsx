"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateShort } from "@/lib/format";

export function InstrumentChart({
  points,
}: {
  points: Array<{ date: string; value: number }>;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center border border-dashed border-line text-[13.5px] text-mute">
        Historique insuffisant pour tracer un graphique.
      </div>
    );
  }

  return (
    <div className="h-56 w-full border border-line bg-card p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line-2)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateShort(d)}
            tick={{ fontSize: 10.5, fill: "var(--color-mute)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10.5, fill: "var(--color-mute)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            labelFormatter={(d) => formatDateShort(String(d))}
            formatter={(value) => [Number(value).toLocaleString("fr-FR"), "Valeur"]}
            contentStyle={{
              border: "1px solid var(--color-line)",
              borderRadius: 0,
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-deep)"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
