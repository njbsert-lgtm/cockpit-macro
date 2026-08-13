import type { FreshnessTier } from "@/lib/freshness";
import { TIER_LABEL } from "@/lib/freshness";

const TIER_COLOR: Record<FreshnessTier, string> = {
  frais: "bg-teal",
  perime: "bg-ochre",
  erreur: "bg-rust",
  absente: "bg-mute",
};

export function FreshnessDot({
  tier,
  withLabel = false,
}: {
  tier: FreshnessTier;
  withLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${TIER_COLOR[tier]}`}
        aria-hidden="true"
      />
      {withLabel && (
        <span className="font-mono text-[11px] tracking-wide text-mute">
          {TIER_LABEL[tier]}
        </span>
      )}
      <span className="sr-only">{TIER_LABEL[tier]}</span>
    </span>
  );
}
