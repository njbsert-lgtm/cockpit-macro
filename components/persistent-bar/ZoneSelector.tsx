"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MACRO_ZONES, ZONE_LABELS } from "@/lib/zones";
import { DEFAULT_ZONE, ZONE_PARAM, parseZone } from "@/lib/zone-param";

/**
 * Le sélecteur de zone de la barre collante (DESIGN.md, « sélecteur de zone à panneau ») : un
 * seul bouton « Zone : France ▾ » de 44px, qui ouvre sous la barre un panneau portant les onze
 * zones en boutons de 44px. Onze boutons dans la barre elle-même débordaient à 390px.
 *
 * La zone active se lit sans ouvrir le panneau. L'état reste dans l'URL (`?zone=`) : partageable
 * et rechargeable. Fermeture à l'Échap (le focus revient au bouton) et au clic extérieur ; à
 * l'ouverture, le focus va sur la zone active. Le panneau se positionne contre la barre
 * (`header`, collante), pas contre ce composant.
 */
export function ZoneSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const zone = parseZone(searchParams.get(ZONE_PARAM));
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // La zone ne pilote plus que Macro : Marchés a sa propre rangée de zones, et Notes ne se
  // filtre plus par zone du tout.
  if (pathname !== "/macro") return null;

  function select(z: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (z === DEFAULT_ZONE) params.delete(ZONE_PARAM);
    else params.set(ZONE_PARAM, z);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="panneau-zone"
        className="flex min-h-11 min-w-0 shrink items-center whitespace-nowrap text-12 font-medium text-encre"
      >
        <span className="flex items-center gap-1 rounded-rp bg-repos px-2.5 py-1.5">
          <span className="text-doux">Zone&nbsp;:</span>
          <span>{ZONE_LABELS[zone]}</span>
          <span aria-hidden className="text-doux">
            {open ? "▴" : "▾"}
          </span>
        </span>
      </button>
      {open && (
        <div
          id="panneau-zone"
          ref={panelRef}
          role="group"
          aria-label="Zone"
          className="absolute inset-x-0 top-full border-b border-trait bg-page"
        >
          <div className="mx-auto grid max-w-colonne grid-cols-3 gap-2 px-4.5 py-3 md:max-w-content md:grid-cols-6 md:px-6">
            {MACRO_ZONES.map((z) => {
              const active = z === zone;
              return (
                <button
                  key={z}
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(z)}
                  className={`min-h-11 rounded-rp px-2 text-12 font-medium transition-colors ${
                    active ? "bg-encre text-white" : "bg-repos text-doux hover:text-encre"
                  }`}
                >
                  {ZONE_LABELS[z]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
