import Link from "next/link";
import type { Note } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { DriverCards, type DriverWithBranches } from "./DriverCards";
import { SectionHeader } from "./SectionHeader";
import { AnglesMortsAccueil } from "./AnglesMortsAccueil";
import type { VueAccueil } from "@/lib/angles-morts";
import { getMacroIndicator } from "@/lib/data";
import { resoudreIndicateurCle } from "@/lib/indicateur-cle";

/**
 * Couche 1 : le régime en une phrase, les indicateurs clés, puis les cartes de driver.
 *
 * Plus de bandeau sombre — DESIGN.md ne prévoit aucune surface de ce type : le régime est le
 * titre de page (27px, poids 700), et la hiérarchie tient par la typographie seule.
 */
export function RegimeHeader({
  note,
  drivers = [],
  pendingVeilleCount,
  pendingRedactionCount,
  anglesMorts,
}: {
  note: Note;
  drivers?: DriverWithBranches[];
  /**
   * Omis sur la page d'une note individuelle, qui ne recharge pas la file de veille pour un
   * bouton secondaire : afficher un « 0 » par défaut mentirait sur l'état réel de la file.
   */
  pendingVeilleCount?: number;
  /** Même principe : omis plutôt que 0 quand l'appelant n'a pas chargé la liste. */
  pendingRedactionCount?: number;
  /** Omis sur la page d'une note individuelle, qui ne charge pas la table des angles morts. */
  anglesMorts?: VueAccueil;
}) {
  return (
    <div className="mx-auto max-w-colonne px-4.5 pt-6 md:max-w-content md:px-6">
      <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
        Régime au {formatDateLong(note.date)}
      </p>
      <h1 className="mt-1.5 max-w-[28ch] text-27 font-bold leading-[1.2] tracking-titre text-encre">
        {note.regimeStatement}
      </h1>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-rc border border-trait md:grid-cols-4">
        {note.keyIndicators.map((ind, i) => {
          // Un chiffre qui désigne un indicateur suivi en Macro en ouvre la fiche ; les autres
          // (prévisions, chiffres de marché) restent du texte.
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
            <div
              key={ind.label}
              className={`${i % 2 === 1 ? "border-l border-trait" : ""} ${
                i >= 2 ? "border-t border-trait md:border-t-0" : ""
              } md:border-l md:first:border-l-0`}
            >
              {indicatorId ? (
                <Link
                  href={`/macro/${indicatorId}`}
                  className="block min-h-11 px-3.5 py-3 hover:bg-repos"
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

      {drivers.length > 0 && (
        <div className="mt-7">
          <SectionHeader
            title="Ce qui fait bouger le marché"
            count={`${drivers.length} actifs`}
            note="Ordonnés par intensité courante — un jugement posé à la note, pas un calcul."
          />
          <DriverCards drivers={drivers} />
        </div>
      )}

      {drivers.length > 0 && anglesMorts !== undefined && <AnglesMortsAccueil vue={anglesMorts} />}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {drivers.length > 0 && (
          <Link
            href="/notes/tendances"
            className="inline-flex min-h-11 items-center rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
          >
            Tendances de fond ›
          </Link>
        )}
        {drivers.length > 0 && (
          <Link
            href="/notes/themes"
            className="inline-flex min-h-11 items-center rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
          >
            Thèmes sous observation ›
          </Link>
        )}
        {pendingVeilleCount !== undefined && (
          <Link
            href="/triage"
            className="inline-flex min-h-11 items-center gap-2 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
          >
            Triage
            <span
              aria-hidden="true"
              className="rounded-rp bg-repos px-1.5 py-0.5 text-11 tabular-nums text-doux"
            >
              {pendingVeilleCount}
            </span>
            <span className="sr-only">
              {pendingVeilleCount} item{pendingVeilleCount > 1 ? "s" : ""} en attente de tri
            </span>
          </Link>
        )}
        {/* N'apparaît que si un brouillon existe (DESIGN.md) — pas de notification, juste un
            bouton qui ne mentirait pas en affichant « 0 ». */}
        {pendingRedactionCount !== undefined && pendingRedactionCount > 0 && (
          <Link
            href="/redaction"
            className="inline-flex min-h-11 items-center gap-2 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
          >
            Rédaction
            <span
              aria-hidden="true"
              className="rounded-rp bg-repos px-1.5 py-0.5 text-11 tabular-nums text-doux"
            >
              {pendingRedactionCount}
            </span>
            <span className="sr-only">
              {pendingRedactionCount} brouillon{pendingRedactionCount > 1 ? "s" : ""} en attente
              de relecture
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
