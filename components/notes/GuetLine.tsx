import type { Guet } from "@/lib/types";
import { GUET_STATUT_CLASS, GUET_STATUT_LABEL } from "@/lib/guet-labels";
import { formatDateShort } from "@/lib/format";

/**
 * Une ligne de guet — même motif que la ligne de tendance (DESIGN.md) : grille `1fr auto`,
 * le libellé et l'attendu à gauche, la pastille de statut et l'échéance à droite.
 *
 * Le « Infirmé si » est sorti du dépliant et rompt la série (DESIGN.md) : fond `--repos`, rayon
 * `--rb`, libellé en `--baisse` — il expose la note à la contradiction et doit se voir au premier
 * regard. « Confirmé si » et la source attendue restent dans le dépliant : on les consulte au
 * moment de trancher, pas à chaque lecture.
 */
export function GuetLine({ guet, noteSlug }: { guet: Guet; noteSlug?: string }) {
  // Un guet remonté d'une note antérieure porte sa date d'origine : c'est ce qui rend visible
  // qu'une question traîne depuis plusieurs semaines.
  const remonte = noteSlug !== undefined && guet.noteSlug !== noteSlug;
  const criteres = `guet-${guet.id}-criteres`;

  return (
    <li className="border-t border-trait py-3.5 first:border-t-0 first:pt-0">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          {/* L'axe avant le libellé : il dit par où on regarde, le libellé dit quoi. */}
          {guet.axeLibelle && (
            <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
              {guet.axeLibelle}
            </p>
          )}
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

      <div className="mt-2.5 rounded-rb bg-repos px-4 py-3.5">
        <p className="text-10 font-semibold uppercase tracking-cap text-baisse">⚠️ Infirmé si</p>
        <p className="mt-1 text-13 text-doux">{guet.infirmeSi}</p>
      </div>

      <details className="group mt-2">
        <summary
          aria-controls={criteres}
          className="flex min-h-11 cursor-pointer list-none items-center text-11 text-tenu transition-colors hover:text-encre"
        >
          Confirmé si, source attendue
          <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <dl id={criteres} className="rounded-rb bg-repos px-3 py-2 text-12 text-doux">
          <dt className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Confirmé si</dt>
          <dd className="mt-0.5">{guet.confirmeSi}</dd>
          {guet.sourceAttendue.length > 0 && (
            <>
              <dt className="mt-2 text-9-5 font-semibold uppercase tracking-cap text-tenu">
                Source attendue
              </dt>
              <dd className="mt-0.5 text-11">{guet.sourceAttendue.join(" · ")}</dd>
            </>
          )}
        </dl>
      </details>
    </li>
  );
}
