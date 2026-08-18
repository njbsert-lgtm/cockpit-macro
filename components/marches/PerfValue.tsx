import { formatSignedPct } from "@/lib/format";

/**
 * Une performance chiffrée. `formatted` permet d'imposer l'unité qui se lit — les points de
 * base pour un taux ou un spread — là où le pourcentage relatif n'informerait personne ;
 * `pct` reste ce qui donne le signe, donc la couleur.
 */
export function PerfValue({
  pct,
  formatted,
  size = "md",
  unavailableReason = "historique insuffisant pour ce calcul",
}: {
  pct: number | null;
  formatted?: string | null;
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
      {formatted ?? formatSignedPct(pct)}
    </span>
  );
}
