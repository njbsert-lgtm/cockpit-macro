import type { Zone } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";
import { ModeToggle } from "./ModeToggle";
import { ZoneModeView } from "./ZoneModeView";
import { ComparisonView } from "./ComparisonView";

async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function MacroContent({
  zone,
  mode,
  metric,
}: {
  zone: Zone;
  mode: "zone" | "compare";
  metric: string;
}) {
  await simulateLoad();

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-11 uppercase tracking-cap text-tenu">Macro</p>
          <h1 className="mt-1 text-27 font-semibold text-encre">
            {mode === "zone" ? ZONE_LABELS[zone] : "Comparaison entre zones"}
          </h1>
        </div>
        <ModeToggle mode={mode} />
      </div>

      <div className="mt-6">
        {mode === "zone" ? <ZoneModeView zone={zone} /> : <ComparisonView metric={metric} zone={zone} />}
      </div>
    </div>
  );
}
