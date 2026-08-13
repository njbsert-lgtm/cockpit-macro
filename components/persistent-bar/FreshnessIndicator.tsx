"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getFreshnessSummaryForZone, getOverallTier } from "@/lib/freshness-summary";
import { TIER_LABEL } from "@/lib/freshness";
import { formatDateTime } from "@/lib/format";
import { ZONE_PARAM, parseZone } from "@/lib/zone-param";
import { FreshnessDot } from "@/components/states/FreshnessDot";

export function FreshnessIndicator() {
  const searchParams = useSearchParams();
  const zone = parseZone(searchParams.get(ZONE_PARAM));
  const [open, setOpen] = useState(false);
  // Évite un mismatch d'hydratation : `now` dépend de l'horloge du poste du lecteur.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  useEffect(() => setOpen(false), [zone]);

  if (!now) {
    return <span className="font-mono text-[11.5px] text-white/40">Fraîcheur…</span>;
  }

  const summary = getFreshnessSummaryForZone(zone, now);
  const tier = getOverallTier(summary);
  const oldest = summary[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[2px] bg-white/10 px-2.5 py-1.5 font-mono text-[11.5px] tracking-wide text-[#CFE0E3] hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <FreshnessDot tier={tier} />
        {oldest ? (
          <span>Données au {formatDateTime(oldest.fetchedAt)}</span>
        ) : (
          <span>Aucune source pour cette zone</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 max-w-[85vw] border border-line bg-card p-3 text-ink shadow-[0_4px_0_0_rgba(0,0,0,0.08)]">
          <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
            Fraîcheur par source
          </p>
          {summary.length === 0 ? (
            <p className="text-[13.5px] text-mute">
              Aucune source suivie pour cette zone pour l&rsquo;instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.map((s) => (
                <li key={s.source} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2">
                    <FreshnessDot tier={s.tier} />
                    {s.source}
                  </span>
                  <span className="font-mono text-[11.5px] text-mute">
                    {formatDateTime(s.fetchedAt)} · {TIER_LABEL[s.tier]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
