"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AssetClass, Zone } from "@/lib/types";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ORDER, ASSET_CLASS_PARAM, DEFAULT_ASSET_CLASS } from "@/lib/marches";
import { ALL_ZONES, ZONE_LABELS } from "@/lib/zones";
import { DEFAULT_ZONE, ZONE_PARAM } from "@/lib/zone-param";

/** Le résumé chiffré porté par un bouton de classe — calculé côté serveur, affiché ici. */
export type ClassSummary = {
  assetClass: AssetClass;
  ytd: number | null;
  total: number;
};

/**
 * Un vrai bouton, pas du texte souligné : fond clair, bordure fine, rayon 2 px, 44 px de haut
 * au minimum pour rester atteignable au pouce. L'état sélectionné s'annonce par `aria-pressed`
 * autant que par le contraste inversé — un lecteur d'écran ne voit pas le fond noir.
 */
// Sans padding horizontal : chaque rangée pose le sien, sinon les deux valeurs entrent en
// conflit dans la feuille de style et c'est l'ordre de compilation, pas l'ordre d'écriture,
// qui tranche.
const BUTTON_BASE =
  "min-h-11 rounded-xs border py-1.5 text-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-deep";
const BUTTON_OFF = "border-line bg-paper text-ink hover:border-deep";
const BUTTON_ON = "border-ink bg-ink text-white";

function formatYtd(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")} %`;
}

export function FilterRows({
  assetClass,
  zone,
  summaries,
}: {
  assetClass: AssetClass;
  zone: Zone;
  summaries: ClassSummary[];
}) {
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

  const summaryOf = (c: AssetClass) => summaries.find((s) => s.assetClass === c);

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {/* Rangée 1 — la classe d'actifs. Quatre boutons, aucun état « vue d'ensemble » : une
          classe est toujours sélectionnée. */}
      <div
        role="group"
        aria-label="Classe d'actifs"
        className="grid grid-cols-4 gap-1.5 sm:gap-2"
      >
        {ASSET_CLASS_ORDER.map((c) => {
          const active = c === assetClass;
          const summary = summaryOf(c);
          const ytdClass = active
            ? summary?.ytd != null && summary.ytd < 0
              ? "text-rust-tint"
              : "text-teal-bg"
            : summary?.ytd != null && summary.ytd < 0
              ? "text-rust"
              : "text-teal";

          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setParam(ASSET_CLASS_PARAM, c, DEFAULT_ASSET_CLASS)}
              className={`${BUTTON_BASE} ${active ? BUTTON_ON : BUTTON_OFF} flex flex-col items-center justify-center gap-0.5 px-2`}
            >
              <span className="font-display text-12-5 font-bold leading-tight sm:text-14">
                {ASSET_CLASS_LABELS[c]}
              </span>
              {summary?.total === 0 ? (
                <span
                  className={`font-mono text-10 leading-none ${active ? "text-white/70" : "text-mute"}`}
                >
                  aucun
                </span>
              ) : summary?.ytd == null ? (
                <span
                  className={`font-mono text-10 leading-none ${active ? "text-white/70" : "text-mute"}`}
                  title="Aucune base de clôture au 31 décembre n'est saisie pour les instruments de cette classe"
                >
                  YTD n. d.
                </span>
              ) : (
                <span className={`font-mono text-10 leading-none tabular-nums ${ytdClass}`}>
                  {formatYtd(summary.ytd)}
                </span>
              )}
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
              className={`${BUTTON_BASE} ${active ? BUTTON_ON : BUTTON_OFF} shrink-0 whitespace-nowrap px-3 font-mono text-12-5`}
            >
              {z === DEFAULT_ZONE ? "Toutes" : ZONE_LABELS[z]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
