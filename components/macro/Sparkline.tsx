"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({
  points,
  color = "var(--color-deep)",
}: {
  points: number[];
  color?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-10 items-center font-mono text-[11px] text-mute">
        Historique insuffisant
      </div>
    );
  }

  const data = points.map((value, i) => ({ i, value }));

  return (
    <div className="h-10 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
