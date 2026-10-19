"use client";

import Link from "next/link";
import { useState } from "react";
import type { Outlook, OutlookPoint, OutlookTheme } from "@/lib/types";
import { SectionHeader } from "@/components/notes/SectionHeader";

const SYMBOLE = { renforcer: "▲", neutre: "●", alleger: "▼" } as const;

/**
 * Les points majeurs d'un outlook (maquette 3b) : des fiches, pas un filet. Les cartes chiffrées
 * d'abord, en grille de deux, chiffre en exergue en encre (un chiffre éditorial n'est pas une
 * performance) ; puis les cartes texte, emoji dans une pastille ronde. Un filtre de thème masque
 * les cartes hors thème et passe toutes celles qui restent en phrase : un chiffre seul se lit en
 * survol de « Tout », mais une fois le thème choisi on vient lire ce que la maison avance. Chaque
 * carte ouvre la page du point.
 */
export function OutlookPoints({ outlook }: { outlook: Outlook }) {
  const [filtre, setFiltre] = useState<string | null>(null);
  const themes = new Map(outlook.themes.map((t) => [t.id, t]));
  const visibles = outlook.points.filter((p) => filtre === null || p.themeId === filtre);
  const enPhrases = filtre !== null;
  const chiffres = enPhrases ? [] : visibles.filter((p) => p.chiffre);
  const textes = enPhrases ? visibles : visibles.filter((p) => !p.chiffre);
  const utilises = outlook.themes.filter((t) => outlook.points.some((p) => p.themeId === t.id));

  return (
    <>
      <div className="-mx-4.5 mt-4 flex gap-2 overflow-x-auto px-4.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <Filtre actif={filtre === null} onClick={() => setFiltre(null)}>
          Tout <span className={filtre === null ? "text-page/70" : "text-tenu"}>{outlook.points.length}</span>
        </Filtre>
        {utilises.map((t) => (
          <Filtre key={t.id} actif={filtre === t.id} onClick={() => setFiltre(filtre === t.id ? null : t.id)}>
            <span aria-hidden="true">{t.emoji}</span> {t.court ?? t.label}
          </Filtre>
        ))}
      </div>

      <section className="mt-5" aria-label="Points majeurs">
        <SectionHeader title="Points majeurs" count={`${visibles.length}`} />
        {chiffres.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {chiffres.map((p) => (
              <li key={p.id}>
                <CarteChiffree outlook={outlook} point={p} theme={themes.get(p.themeId)!} />
              </li>
            ))}
          </ul>
        )}
        {textes.length > 0 && (
          <ul className={`${chiffres.length > 0 ? "mt-2" : "mt-3"} flex flex-col gap-2`}>
            {textes.map((p) => (
              <li key={p.id}>
                <CarteTexte outlook={outlook} point={p} theme={themes.get(p.themeId)!} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Filtre({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-rp border px-[11px] py-1.5 text-13 transition-colors ${
        actif ? "border-encre bg-encre text-page" : "border-trait bg-page text-encre hover:border-trait-f"
      }`}
    >
      {children}
    </button>
  );
}

function CarteChiffree({ outlook, point, theme }: { outlook: Outlook; point: OutlookPoint; theme: OutlookTheme }) {
  return (
    <Link
      href={`/outlook/${outlook.id}/${point.id}`}
      className="flex h-full min-h-11 flex-col rounded-rc border border-trait bg-repos px-[13px] py-3 transition-colors hover:border-trait-f"
    >
      <span className="flex items-center justify-between">
        <span aria-hidden="true" className="text-17">
          {theme.emoji}
        </span>
        <span aria-hidden="true" className="text-15 text-tenu">
          ›
        </span>
      </span>
      <span className="mt-2 text-26 font-bold leading-none tracking-[-.025em] text-encre">{point.chiffre!.valeur}</span>
      <span className="mt-1.5 text-12 leading-[1.35] text-doux">{point.chiffre!.legende}</span>
    </Link>
  );
}

function CarteTexte({ outlook, point, theme }: { outlook: Outlook; point: OutlookPoint; theme: OutlookTheme }) {
  return (
    <Link
      href={`/outlook/${outlook.id}/${point.id}`}
      className="grid min-h-11 grid-cols-[32px_1fr] gap-2.5 rounded-rc border border-trait bg-page px-3.5 py-3 transition-colors hover:border-trait-f"
    >
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-rp bg-repos text-15">
        {theme.emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">{theme.label}</span>
        {point.recommandations ? (
          <span className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-12-5 text-encre">
            {point.recommandations.map((r) => (
              <span key={r.libelle}>
                <span aria-hidden="true">{SYMBOLE[r.sens]} </span>
                {r.libelle}
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-1 block text-13-5 leading-[1.45] text-encre">{point.texte}</span>
        )}
      </span>
    </Link>
  );
}
