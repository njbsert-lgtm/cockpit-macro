"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SourceFreshness } from "@/lib/freshness-summary";
import type { FreshnessTier } from "@/lib/freshness";
import { TIER_LABEL } from "@/lib/freshness";
import { formatDateTime } from "@/lib/format";
import { FreshnessDot } from "@/components/states/FreshnessDot";

/**
 * La seule part cliente de l'indicateur : l'ouverture du panneau. Les chiffres arrivent déjà
 * calculés du serveur.
 */
export function FreshnessPanel({
  summary,
  tier,
}: {
  summary: SourceFreshness[];
  tier: FreshnessTier;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Le panneau vit dans la mise en page racine, jamais démontée entre deux pages : sans ça il
  // resterait ouvert par-dessus l'écran suivant après un changement d'onglet.
  useEffect(() => setOpen(false), [pathname]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const oldest = summary[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xs bg-white/10 px-2.5 py-1.5 font-mono text-11-5 tracking-wide text-deep-fg hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <FreshnessDot tier={tier} />
        {oldest ? (
          <span>Données au {formatDateTime(oldest.fetchedAt)}</span>
        ) : (
          <span>Aucune source suivie</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 max-w-[85vw] border border-line bg-card p-3 text-ink shadow-flat">
          <p className="mb-2 font-mono text-10-5 font-semibold uppercase tracking-wider text-mute">
            Fraîcheur par source
          </p>
          {summary.length === 0 ? (
            <p className="text-13-5 text-mute">Aucune source suivie pour l&rsquo;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.map((s) => (
                <li key={s.source} className="text-13">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <FreshnessDot tier={s.tier} />
                      {s.source}
                    </span>
                    <span className="font-mono text-11-5 text-mute">
                      {formatDateTime(s.fetchedAt)} · {TIER_LABEL[s.tier]}
                    </span>
                  </span>
                  {/* État 5 du cahier : nommer la source en cause, pas seulement la signaler. */}
                  {s.error && (
                    <span className="mt-1 block border-l-2 border-rust pl-2 font-mono text-11 text-rust">
                      {s.error}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
