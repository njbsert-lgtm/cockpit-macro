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
  const cls = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[13px]" : "text-[15px]";

  if (pct === null) {
    return (
      <span
        className={`font-mono italic text-mute ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}
        title={unavailableReason}
      >
        non disponible
      </span>
    );
  }

  const colorClass = pct > 0 ? "text-teal" : pct < 0 ? "text-rust" : "text-mute";

  return (
    <span className={`font-mono font-semibold tabular-nums ${colorClass} ${cls}`}>
      {formatSignedPct(pct)}
    </span>
  );
}
