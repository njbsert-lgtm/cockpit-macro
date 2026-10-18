import type { Note } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { DriverCards, type DriverWithBranches } from "./DriverCards";
import { SectionHeader } from "./SectionHeader";
import { AnglesMortsAccueil } from "./AnglesMortsAccueil";
import type { VueAccueil } from "@/lib/angles-morts";
import { KeyIndicators } from "./KeyIndicators";
import { NavLink } from "./NavLink";

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

      <div className="mt-5">
        <KeyIndicators indicators={note.keyIndicators} />
      </div>

      {drivers.length > 0 && (
        <div className="mt-7">
          <SectionHeader
            title="Ce qui fait bouger le marché"
            count={`${drivers.length} actifs`}
            note="Ordonnés par intensité courante — un jugement posé à la note, pas un calcul."
          />
          <DriverCards drivers={drivers} />
          <p className="mt-2 text-11 text-tenu">Vraisemblances éditoriales, non implicites de marché.</p>
        </div>
      )}

      {drivers.length > 0 && anglesMorts !== undefined && <AnglesMortsAccueil vue={anglesMorts} />}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {drivers.length > 0 && <NavLink href="/notes/tendances">Tendances de fond</NavLink>}
        {drivers.length > 0 && <NavLink href="/notes/themes">Thèmes sous observation</NavLink>}
        {pendingVeilleCount !== undefined && (
          <NavLink
            href="/triage"
            count={pendingVeilleCount}
            countLabel={`${pendingVeilleCount} item${pendingVeilleCount > 1 ? "s" : ""} en attente de tri`}
          >
            Triage
          </NavLink>
        )}
        {/* N'apparaît que si un brouillon existe (DESIGN.md) — pas de notification, juste un
            lien qui ne mentirait pas en affichant « 0 ». */}
        {pendingRedactionCount !== undefined && pendingRedactionCount > 0 && (
          <NavLink
            href="/redaction"
            count={pendingRedactionCount}
            countLabel={`${pendingRedactionCount} brouillon${pendingRedactionCount > 1 ? "s" : ""} en attente de relecture`}
          >
            Rédaction
          </NavLink>
        )}
      </div>
    </div>
  );
}
