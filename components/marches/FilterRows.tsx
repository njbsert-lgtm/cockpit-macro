"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AssetClass, Zone } from "@/lib/types";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ORDER, ASSET_CLASS_PARAM, DEFAULT_ASSET_CLASS } from "@/lib/marches";
import { ALL_ZONES, ZONE_LABELS } from "@/lib/zones";
import { DEFAULT_ZONE, ZONE_PARAM } from "@/lib/zone-param";

/**
 * Un vrai bouton, pas du texte souligné : fond clair, bordure fine, rayon 2 px, 44 px de haut
 * au minimum pour rester atteignable au pouce. L'état sélectionné s'annonce par `aria-pressed`
 * autant que par le contraste inversé — un lecteur d'écran ne voit pas le fond noir.
 */
// Sans padding horizontal : chaque rangée pose le sien, sinon les deux valeurs entrent en
// conflit dans la feuille de style et c'est l'ordre de compilation, pas l'ordre d'écriture,
// qui tranche.
const BUTTON_BASE =
  "min-h-11 rounded-rp border py-1.5 text-center";
const BUTTON_OFF = "border-trait bg-repos text-encre hover:border-trait-f";
const BUTTON_ON = "border-encre bg-encre text-white";

export function FilterRows({ assetClass, zone }: { assetClass: AssetClass; zone: Zone }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Les deux filtres vivent dans la même chaîne de requête et ne s'écrasent pas : changer de
   * classe conserve la zone, et changer de zone conserve la classe. La zone est écrite avec la
   * même convention que le sélecteur de la barre persistante — paramètre supprimé sur la
   * valeur par défaut — pour que les deux commandes pilotent un seul et même état.
   */
  function setParam(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {/* Rangée 1 — la classe d'actifs. Quatre boutons, aucun état « vue d'ensemble » : une
          classe est toujours sélectionnée. Pas de performance agrégée sous le nom : une
          moyenne non pondérée de la classe entière n'est pas un chiffre qu'on peut défendre
          comme représentatif — la performance se lit instrument par instrument, dans la
          liste. */}
      <div
        role="group"
        aria-label="Classe d'actifs"
        className="grid grid-cols-4 gap-1.5 sm:gap-2"
      >
        {ASSET_CLASS_ORDER.map((c) => {
          const active = c === assetClass;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setParam(ASSET_CLASS_PARAM, c, DEFAULT_ASSET_CLASS)}
              className={`${BUTTON_BASE} ${active ? BUTTON_ON : BUTTON_OFF} px-2`}
            >
              <span className="text-12-5 font-bold leading-tight sm:text-14-5">
                {ASSET_CLASS_LABELS[c]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rangée 2 — la zone. Même état que le sélecteur de la barre persistante, présenté
          autrement : ce n'est pas un second filtre, c'est le contexte global rendu tactile. */}
      <div
        role="group"
        aria-label="Zone"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6"
      >
        {[DEFAULT_ZONE, ...ALL_ZONES.filter((z) => z !== DEFAULT_ZONE)].map((z) => {
          const active = z === zone;
          return (
            <button
              key={z}
              type="button"
              aria-pressed={active}
              onClick={() => setParam(ZONE_PARAM, z, DEFAULT_ZONE)}
              className={`${BUTTON_BASE} ${active ? BUTTON_ON : BUTTON_OFF} shrink-0 whitespace-nowrap px-3 text-12-5`}
            >
              {z === DEFAULT_ZONE ? "Toutes" : ZONE_LABELS[z]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
