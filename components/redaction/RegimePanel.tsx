import type { DecisionRegime } from "@/lib/redaction/publication";
import { ANGLE_LIBELLE, ANGLES_REGIME, RETENU_LIBELLE } from "@/lib/regime";
import type { RegimeProposition } from "@/lib/types";
import { ValidationPill } from "./ValidationPill";

/**
 * Le choix de la phrase de régime (DESIGN.md, « Portail de rédaction ») : une entrée dépliante au
 * motif des blocs, ouverte tant que rien n'est retenu — c'est un geste qu'on doit obtenir, pas une
 * option qu'on peut laisser dormir.
 *
 * **Aucune proposition n'est sélectionnée par défaut.** Le bouton de validation ne s'active qu'une
 * fois un choix fait, et un choix déjà enregistré se relit, jamais ne se présume. Les trois
 * propositions s'affichent avec leur angle et leur justification : si elles se ressemblent, la
 * note n'a pas de thèse, et c'est ce que l'œil doit voir avant d'avoir lu le corps.
 */
export function RegimePanel({
  propositions,
  decision,
  action,
}: {
  propositions: RegimeProposition[];
  decision: DecisionRegime | undefined;
  /** `retenirRegime` lié au brouillon — passé par la page, comme pour `PropositionCard`. */
  action: (formData: FormData) => Promise<void>;
}) {
  const retenu = decision?.choix;

  return (
    <details open={!retenu} className="rounded-rc border border-trait bg-page">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <ValidationPill ok={Boolean(retenu)} />
          <span className="truncate text-14-5 font-semibold text-encre">Phrase de régime</span>
        </span>
        <span className="shrink-0 rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-doux">
          {retenu ? `Retenue · ${RETENU_LIBELLE[retenu]}` : "À choisir"}
        </span>
      </summary>

      <form action={action} className="flex flex-col gap-2 border-t border-trait bg-repos px-4 py-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Choisir la phrase de régime</legend>

          {ANGLES_REGIME.map((angle) => {
            const proposition = propositions.find((p) => p.angle === angle);
            if (!proposition) return null;
            return (
              <label
                key={angle}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-rb border border-trait bg-page px-3 py-2.5 has-[:checked]:border-encre"
              >
                <input
                  type="radio"
                  name="choix"
                  value={angle}
                  defaultChecked={retenu === angle}
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-encre"
                />
                <span className="min-w-0">
                  <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">
                    {ANGLE_LIBELLE[angle]}
                  </span>
                  <span className="mt-0.5 block text-14-5 font-semibold leading-snug text-encre">
                    {proposition.texte}
                  </span>
                  <span className="mt-1 block text-12 text-tenu">{proposition.justification}</span>
                </span>
              </label>
            );
          })}

          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-rb border border-trait bg-page px-3 py-2.5 has-[:checked]:border-encre">
            <input
              type="radio"
              name="choix"
              value="propre"
              defaultChecked={retenu === "propre"}
              required
              className="mt-1 h-4 w-4 shrink-0 accent-encre"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">
                Écrire la mienne
              </span>
              <textarea
                name="texte"
                defaultValue={retenu === "propre" ? decision?.texte : ""}
                rows={2}
                placeholder="Une phrase qui tranche, que ni l'une ni l'autre n'a trouvée."
                className="mt-1 w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
              />
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
        >
          Retenir cette phrase
        </button>
      </form>
    </details>
  );
}
