import Link from "next/link";
import type { Note } from "@/lib/types";
import { getMacroIndicator } from "@/lib/data";
import { resoudreIndicateurCle } from "@/lib/indicateur-cle";

/**
 * Les chiffres clés du régime (DESIGN.md) : une grille de cellules bordées, deux colonnes sur
 * mobile, quatre sur desktop. Une cellule qui désigne un indicateur suivi dans Macro en ouvre la
 * fiche ; les autres (prévisions, chiffres de marché) restent du texte, sans chevron.
 *
 * Chaque cellule porte sa bordure haute et gauche, et la grille est décalée d'un pixel sous un
 * cadre `overflow:hidden` : les séparateurs tombent juste quel que soit le nombre de cellules,
 * sans calcul de rang ni trou en fin de ligne.
 */
export function KeyIndicators({ indicators }: { indicators: Note["keyIndicators"] }) {
  if (indicators.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-rc border border-trait">
      <dl className="-mt-px -ml-px grid grid-cols-2 md:grid-cols-4">
        {indicators.map((ind) => {
          const indicatorId = resoudreIndicateurCle(ind, (id) => getMacroIndicator(id) !== undefined);
          const contenu = (
            <>
              <dt className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
                {ind.label}
                {indicatorId && <span aria-hidden> ›</span>}
              </dt>
              <dd className="mt-1 text-13 font-semibold leading-tight text-encre">{ind.value}</dd>
            </>
          );
          return (
            <div key={ind.label} className="border-t border-l border-trait">
              {indicatorId ? (
                <Link
                  href={`/macro/${indicatorId}`}
                  className="block min-h-11 px-3.5 py-3 transition-colors hover:bg-repos"
                  aria-label={`${ind.label} : ${ind.value} — ouvrir la fiche de l'indicateur`}
                >
                  {contenu}
                </Link>
              ) : (
                <div className="px-3.5 py-3">{contenu}</div>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
