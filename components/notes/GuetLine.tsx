import type { Guet } from "@/lib/types";
import { GUET_STATUT_CLASS, GUET_STATUT_LABEL } from "@/lib/guet-labels";
import { formatDateShort } from "@/lib/format";

/**
 * Une ligne de guet — même motif que la ligne de tendance (DESIGN.md) : grille `1fr auto`,
 * le libellé et l'attendu à gauche, la pastille de statut et l'échéance à droite.
 *
 * `confirmeSi` et `infirmeSi` vivent dans un dépliant : ce sont les critères de résolution,
 * on les consulte au moment de trancher, pas à chaque lecture.
 */
export function GuetLine({ guet, noteSlug }: { guet: Guet; noteSlug?: string }) {
  // Un guet remonté d'une note antérieure porte sa date d'origine : c'est ce qui rend visible
  // qu'une question traîne depuis plusieurs semaines.
  const remonte = noteSlug !== undefined && guet.noteSlug !== noteSlug;
  const criteres = `guet-${guet.id}-criteres`;

  return (
    <li className="border-t border-trait py-3 first:border-t-0 first:pt-0">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <p className="text-14-5 text-encre">
            {remonte && (
              <span className="mr-1.5 text-11 text-tenu">Posé en {guet.noteSlug} —</span>
            )}
            {guet.libelle}
          </p>
          <p className="mt-0.5 text-12 text-tenu">{guet.attendu}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-rp px-2 py-0.5 text-11 font-semibold ${GUET_STATUT_CLASS[guet.statut]}`}
          >
            {GUET_STATUT_LABEL[guet.statut]}
          </span>
          {/* Jamais un tiret pour une échéance absente : « sans échéance » est une information
              sur le guet — l'événement n'a pas de date —, pas une valeur manquante. */}
          <span className="text-11 text-tenu">
            {guet.echeance ? formatDateShort(guet.echeance) : "sans échéance"}
          </span>
        </div>
      </div>

      <details className="mt-2 group">
        <summary
          aria-controls={criteres}
          className="cursor-pointer list-none text-11 text-tenu transition-colors hover:text-encre"
        >
          Critères de résolution
          <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <dl id={criteres} className="mt-1.5 rounded-rb bg-repos px-3 py-2 text-12 text-doux">
          <dt className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Confirmé si</dt>
          <dd className="mt-0.5">{guet.confirmeSi}</dd>
          <dt className="mt-2 text-9-5 font-semibold uppercase tracking-cap text-tenu">
            Infirmé si
          </dt>
          <dd className="mt-0.5">{guet.infirmeSi}</dd>
          {guet.sourceAttendue.length > 0 && (
            <>
              <dt className="mt-2 text-9-5 font-semibold uppercase tracking-cap text-tenu">
                Source attendue
              </dt>
              <dd className="mt-0.5 font-mono text-11">{guet.sourceAttendue.join(" · ")}</dd>
            </>
          )}
        </dl>
      </details>
    </li>
  );
}
