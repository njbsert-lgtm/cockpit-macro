import type { Guet } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { trancherGuet } from "@/app/redaction/actions";
import type { DecisionGuet } from "@/lib/redaction/publication";

const CHAMP =
  "min-h-11 rounded-rb border border-trait bg-page px-2 text-12-5 text-encre";
const BOUTON_44 = "min-h-11 rounded-rb px-3 text-12-5";

const LIBELLE_DECISION: Record<DecisionGuet["action"], string> = {
  accepter: "Accepté",
  corriger: "Corrigé",
  refuser: "Refusé",
};

/**
 * Un guet, à trancher un par un — jamais en bloc (DESIGN.md, cahier § Le portail de
 * validation). Trois actions à 44px : accepter, corriger (ouvre les champs en place), refuser.
 * Aucune n'est cochée par défaut.
 */
export function GuetDecisionLine({
  slug,
  guet,
  decision,
}: {
  slug: string;
  guet: Guet;
  decision: DecisionGuet | undefined;
}) {
  const remonte = guet.noteSlug !== slug;
  const trancher = trancherGuet.bind(null, slug, guet.id);

  return (
    <li className="border-t border-trait py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-14-5 text-encre">
            {remonte && <span className="mr-1.5 text-11 text-tenu">Posé en {guet.noteSlug} —</span>}
            {guet.libelle}
          </p>
          <p className="mt-0.5 text-12 text-tenu">{guet.attendu}</p>
          <p className="mt-0.5 text-11 text-tenu">
            {guet.echeance ? formatDateShort(guet.echeance) : "sans échéance"}
          </p>
        </div>
        {decision && (
          <span className="shrink-0 rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-doux">
            {LIBELLE_DECISION[decision.action]}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <form action={trancher}>
          <input type="hidden" name="action" value="accepter" />
          <button type="submit" className={`${BOUTON_44} border border-encre bg-encre text-white hover:border-trait-f`}>
            Accepter
          </button>
        </form>
        <form action={trancher}>
          <input type="hidden" name="action" value="refuser" />
          <button type="submit" className={`${BOUTON_44} border border-trait bg-page text-doux hover:border-trait-f hover:text-encre`}>
            Refuser
          </button>
        </form>
        <details className="min-w-0 grow basis-full sm:basis-auto">
          <summary className={`${BOUTON_44} inline-flex cursor-pointer items-center border border-trait bg-page text-doux [&::-webkit-details-marker]:hidden`}>
            Corriger…
          </summary>
          <form
            action={trancher}
            className="mt-2 flex flex-col gap-2 rounded-rc border border-trait bg-repos p-3"
          >
            <input type="hidden" name="action" value="corriger" />
            <label className="flex flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Libellé</span>
              <input name="libelle" defaultValue={guet.libelle} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Attendu</span>
              <input name="attendu" defaultValue={guet.attendu} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Confirmé si</span>
              <input name="confirmeSi" defaultValue={guet.confirmeSi} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Infirmé si</span>
              <input name="infirmeSi" defaultValue={guet.infirmeSi} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-10-5 uppercase tracking-cap text-tenu">Échéance</span>
              <input
                name="echeance"
                type="date"
                defaultValue={guet.echeance ?? ""}
                className={CHAMP}
              />
            </label>
            <button
              type="submit"
              className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
            >
              Enregistrer la correction
            </button>
          </form>
        </details>
      </div>
    </li>
  );
}
