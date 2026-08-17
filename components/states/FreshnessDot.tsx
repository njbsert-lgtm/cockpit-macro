import type { FreshnessTier } from "@/lib/freshness";
import { TIER_LABEL } from "@/lib/freshness";

const TIER_COLOR: Record<FreshnessTier, string> = {
  frais: "bg-hausse",
  perime: "bg-k-choc",
  erreur: "bg-baisse",
  absente: "bg-tenu",
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
        className={`inline-block h-[7px] w-[7px] shrink-0 rounded-rp ${TIER_COLOR[tier]}`}
        aria-hidden="true"
      />
      {withLabel && (
        <span className="text-11 tracking-wide text-tenu">
          {TIER_LABEL[tier]}
        </span>
      )}
      <span className="sr-only">{TIER_LABEL[tier]}</span>
    </span>
  );
}
