"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { ChiffreVivant } from "@/lib/chiffres-vivants";
import { formatJourMois } from "@/lib/format";
import { ChangePill } from "./ChangePill";

/**
 * La feuille de chiffre : ce que la note disait d'un chiffre, ce qu'il vaut aujourd'hui, et la
 * courbe entre les deux — sans quitter la lecture. Partagée par l'accueil (chiffres clés) et la
 * page de lecture (chiffre cité).
 *
 * Une feuille qui flotte a droit à l'ombre (DESIGN.md). Elle se ferme au glissement vers le
 * bas, au toucher du voile et à Échap ; le focus y reste piégé tant qu'elle est ouverte.
 */
export function ChiffreSheet({ chiffre, onClose }: { chiffre: ChiffreVivant | null; onClose: () => void }) {
  const feuille = useRef<HTMLDivElement>(null);
  const departY = useRef<number | null>(null);
  const titreId = useId();

  useEffect(() => {
    if (!chiffre) return;
    const precedent = document.activeElement as HTMLElement | null;
    feuille.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !feuille.current) return;
      const focusables = feuille.current.querySelectorAll<HTMLElement>("a, button");
      if (focusables.length === 0) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("keydown", touche);
      precedent?.focus();
    };
  }, [chiffre, onClose]);

  if (!chiffre) return null;
  const { actuel, dansLaNote } = chiffre;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-[rgba(18,22,26,.16)]"
        onClick={onClose}
      />
      <div
        ref={feuille}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        tabIndex={-1}
        className="relative w-full max-w-colonne rounded-t-rc bg-page px-4.5 pt-2.5 pb-[34px] shadow-[0_-8px_30px_rgba(18,22,26,.14)] outline-none"
        onTouchStart={(e) => (departY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (departY.current !== null && e.changedTouches[0].clientY - departY.current > 70) onClose();
          departY.current = null;
        }}
      >
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-rp bg-trait-f" aria-hidden="true" />
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titreId} className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
            {chiffre.label}
          </h2>
          {chiffre.source && <span className="text-11 text-tenu">Source : {chiffre.source}</span>}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-rc border border-trait bg-trait">
          <div className="bg-page px-3.5 py-3">
            <dt className="text-11 text-tenu">Dans la note</dt>
            <dd className="mt-1 text-17 font-semibold text-encre">
              {dansLaNote?.valeur ?? chiffre.valeurNote}
            </dd>
            <dd className="mt-0.5 text-11 text-tenu">
              au {formatJourMois(dansLaNote?.date ?? chiffre.dateNote)}
            </dd>
          </div>
          <div className="bg-page px-3.5 py-3">
            <dt className="text-11 text-tenu">Aujourd&rsquo;hui</dt>
            {actuel ? (
              <>
                <dd className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-17 font-semibold text-encre">{actuel.valeur}</span>
                  {chiffre.ecart && <ChangePill change={chiffre.ecart.texte} direction={chiffre.ecart.sens} />}
                </dd>
                <dd className="mt-0.5 text-11 text-tenu">au {formatJourMois(actuel.date)}</dd>
              </>
            ) : (
              <dd className="mt-1 text-13 italic text-tenu">non suivi</dd>
            )}
          </div>
        </dl>

        {chiffre.points.length > 1 && (
          <figure className="mt-3.5">
            <Courbe points={chiffre.points} repere={dansLaNote?.date ?? chiffre.dateNote} />
          </figure>
        )}

        <div className="mt-3.5 flex items-center justify-between gap-3">
          {chiffre.points.length > 1 ? (
            <span className="text-11 text-tenu">Pointillé : date de la note</span>
          ) : (
            <span />
          )}
          {chiffre.href && (
            <Link
              href={chiffre.href}
              className="inline-flex min-h-11 items-center rounded-rb border border-trait px-4 text-13 font-medium text-encre hover:border-trait-f"
            >
              Ouvrir la fiche ›
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Courbe pleine largeur, 44px, trait encre 1.5px ; un pointillé vertical à la date de la note. */
function Courbe({ points, repere }: { points: Array<{ date: string; value: number }>; repere: string }) {
  const L = 340;
  const H = 44;
  const valeurs = points.map((p) => p.value);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const y = (v: number) => (max === min ? H / 2 : 3 + (H - 6) * (1 - (v - min) / (max - min)));
  const x = (i: number) => (i / (points.length - 1)) * L;
  const trace = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const indexRepere = points.findLastIndex((p) => p.date <= repere);

  return (
    <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" className="h-11 w-full" aria-hidden="true">
      {indexRepere >= 0 && (
        <line
          x1={x(indexRepere)}
          x2={x(indexRepere)}
          y1={0}
          y2={H}
          stroke="var(--color-trait-f)"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path d={trace} fill="none" stroke="var(--color-encre)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
