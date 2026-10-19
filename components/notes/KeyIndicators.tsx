"use client";

import { useState } from "react";
import type { ChiffreVivant } from "@/lib/chiffres-vivants";
import { ChangePill } from "@/components/states/ChangePill";
import { ChiffreSheet } from "@/components/states/ChiffreSheet";
import { FreshnessDot } from "@/components/states/FreshnessDot";
import { NonCollecteBadge } from "@/components/states/NonCollecteBadge";
import { formatJourMois } from "@/lib/format";

/**
 * Les chiffres clés du régime (DESIGN.md), vivants : chaque cellule porte la dernière valeur
 * collectée de ce qu'elle désigne, sa variation et sa date (« le 14/10 »). Toutes se touchent et
 * ouvrent la feuille de chiffre — valeur de la note, valeur du jour, courbe. Une cellule que rien
 * ne relie au catalogue garde le texte de la note.
 *
 * Les séparateurs sont l'interstice d'1px d'une grille sur fond `--trait` ; la dernière ligne
 * est complétée par des cellules vides, différentes sur mobile (2 colonnes) et desktop (4).
 */
export function KeyIndicators({ chiffres }: { chiffres: ChiffreVivant[] }) {
  const [ouvert, setOuvert] = useState<ChiffreVivant | null>(null);
  if (chiffres.length === 0) return null;

  return (
    <>
      <div className="overflow-hidden rounded-rc border border-trait">
        <ul className="grid grid-cols-2 gap-px bg-trait md:grid-cols-4">
          {chiffres.map((c) => (
            <li key={c.label} className="bg-page">
              <button
                type="button"
                onClick={() => setOuvert(c)}
                className="block min-h-11 w-full px-3.5 py-[11px] text-left transition-colors hover:bg-repos"
                aria-haspopup="dialog"
              >
                <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">
                  {c.label}
                  <span aria-hidden> ›</span>
                </span>
                <Valeur chiffre={c} />
              </button>
            </li>
          ))}
          {Array.from({ length: 3 }, (_, i) => {
            const mobile = i < (2 - (chiffres.length % 2)) % 2;
            const desktop = i < (4 - (chiffres.length % 4)) % 4;
            if (!mobile && !desktop) return null;
            return (
              <li
                key={`vide-${i}`}
                aria-hidden="true"
                className={`bg-page ${mobile ? "" : "hidden"} ${desktop ? "md:block" : "md:hidden"}`}
              />
            );
          })}
        </ul>
      </div>
      <ChiffreSheet chiffre={ouvert} onClose={() => setOuvert(null)} />
    </>
  );
}

function Valeur({ chiffre }: { chiffre: ChiffreVivant }) {
  const a = chiffre.actuel;
  if (!a) {
    return <span className="mt-1 block text-13 font-semibold leading-tight text-encre">{chiffre.valeurNote}</span>;
  }
  return (
    <>
      <span className="mt-1 block text-15 font-semibold leading-tight text-encre">{a.valeur}</span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-10-5">
        {a.nonCollecte ? (
          <span className="inline-flex items-center gap-1.5 text-tenu">
            <NonCollecteBadge />
            le {formatJourMois(a.date)}
          </span>
        ) : a.perime ? (
          <span className="inline-flex items-center gap-1.5 text-k-choc">
            <FreshnessDot tier="perime" />
            valeur du {formatJourMois(a.date)}
          </span>
        ) : (
          <>
            {a.variation && <ChangePill change={a.variation.texte} direction={a.variation.sens} />}
            {a.mention && <span className="text-tenu">{a.mention}</span>}
            {!a.mention && <span className="text-tenu">{a.dateLibelle}</span>}
          </>
        )}
      </span>
    </>
  );
}
