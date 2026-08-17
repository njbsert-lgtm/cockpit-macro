"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALL_ZONES, ZONE_LABELS } from "@/lib/zones";
import { DEFAULT_ZONE, ZONE_PARAM, parseZone } from "@/lib/zone-param";

/**
 * Le segment de zone de la barre collante (DESIGN.md) : fond `--repos`, rayon `--rp`,
 * padding 3px, bouton actif en `--encre` sur texte blanc.
 *
 * Le projet compte douze zones là où la maquette n'en montre que quelques-unes : le segment
 * **défile horizontalement**, sans barre visible, et la zone active est amenée dans le champ
 * au chargement — sans quoi une zone choisie en fin de liste serait invisible au retour sur
 * la page.
 */
export function ZoneSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const zone = parseZone(searchParams.get(ZONE_PARAM));
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // `nearest` en bloc : amener la zone active dans le champ ne doit jamais faire défiler
    // la page verticalement, seulement le segment lui-même.
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [zone]);

  // La zone ne pilote plus que Macro : Marchés a sa propre rangée de zones (le même état,
  // affiché autrement, à l'intérieur de l'écran), et Notes ne se filtre plus par zone du
  // tout. Le sélecteur du bandeau n'a donc rien à faire — ni à afficher — ailleurs.
  if (pathname !== "/macro") return null;

  function select(z: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (z === DEFAULT_ZONE) params.delete(ZONE_PARAM);
    else params.set(ZONE_PARAM, z);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label="Zone"
      className="sans-barre -mr-1 flex max-w-[62vw] gap-0.5 overflow-x-auto rounded-rp bg-repos p-[3px] md:max-w-none"
    >
      {ALL_ZONES.map((z) => {
        const active = z === zone;
        return (
          <button
            key={z}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(z)}
            className={`shrink-0 whitespace-nowrap rounded-rp px-2.5 py-1.5 text-12 font-medium transition-colors ${
              active ? "bg-encre text-white" : "text-doux hover:text-encre"
            }`}
          >
            {ZONE_LABELS[z]}
          </button>
        );
      })}
    </div>
  );
}
