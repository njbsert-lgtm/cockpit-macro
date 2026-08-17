import { formatSignedPct } from "@/lib/format";

export function PerfValue({
  pct,
  size = "md",
  unavailableReason = "historique insuffisant pour ce calcul",
}: {
  pct: number | null;
  size?: "sm" | "md" | "lg";
  unavailableReason?: string;
}) {
  const cls = size === "lg" ? "text-17" : size === "sm" ? "text-13" : "text-15";

  if (pct === null) {
    return (
      <span
        className={`italic text-tenu ${size === "sm" ? "text-12" : "text-13"}`}
        title={unavailableReason}
      >
        non disponible
      </span>
    );
  }

  const colorClass = pct > 0 ? "text-hausse" : pct < 0 ? "text-baisse" : "text-tenu";

  return (
    <span className={`font-semibold tabular-nums ${colorClass} ${cls}`}>
      {formatSignedPct(pct)}
    </span>
  );
}
