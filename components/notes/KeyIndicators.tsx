import Link from "next/link";
import type { Note } from "@/lib/types";
import { getMacroIndicator } from "@/lib/data";
import { resoudreIndicateurCle } from "@/lib/indicateur-cle";

/**
 * Les chiffres clés du régime (DESIGN.md) : une grille de cellules bordées, deux colonnes sur
 * mobile, quatre sur desktop. Une cellule qui désigne un indicateur suivi dans Macro en ouvre la
 * fiche ; les autres (prévisions, chiffres de marché) restent du texte, sans chevron.
 *
 * Les séparateurs sont l'interstice d'1px d'une grille sur fond `--trait` ; la dernière ligne
 * est complétée par des cellules vides au fond de page, différentes sur mobile (2 colonnes) et
 * desktop (4), pour que les traits tombent juste quel que soit le nombre de chiffres.
 */
export function KeyIndicators({ indicators }: { indicators: Note["keyIndicators"] }) {
  if (indicators.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-rc border border-trait">
      <dl className="grid grid-cols-2 gap-px bg-trait md:grid-cols-4">
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
            <div key={ind.label} className="bg-page">
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
        {Array.from({ length: 3 }, (_, i) => {
          const mobile = i < (2 - (indicators.length % 2)) % 2;
          const desktop = i < (4 - (indicators.length % 4)) % 4;
          if (!mobile && !desktop) return null;
          return (
            <div
              key={`vide-${i}`}
              aria-hidden="true"
              className={`bg-page ${mobile ? "" : "hidden"} ${desktop ? "md:block" : "md:hidden"}`}
            />
          );
        })}
      </dl>
    </div>
  );
}
