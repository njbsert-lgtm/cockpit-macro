"use client";

import { useState } from "react";
import type { DecisionRegime } from "@/lib/redaction/publication";
import { ANGLE_LIBELLE, ANGLES_REGIME, RETENU_LIBELLE } from "@/lib/regime";
import type { RegimeAngle, RegimeProposition, RegimeRetenu } from "@/lib/types";
import { ValidationPill } from "./ValidationPill";

/** Le bouton reprend l'angle choisi — « Retenir le fait dominant » —, jamais un libellé neutre. */
const BOUTON: Record<RegimeRetenu, string> = {
  fait: "Retenir le fait dominant",
  mecanisme: "Retenir le mécanisme",
  contradiction: "Retenir la contradiction",
  propre: "Retenir ma phrase",
};

/**
 * Le choix de la phrase de régime (DESIGN.md, « Portail de rédaction »).
 *
 * **Aucune proposition n'est sélectionnée par défaut.** Le bouton ne s'active qu'une fois un choix
 * fait, et un choix déjà enregistré se relit, jamais ne se présume. Les trois propositions
 * s'affichent avec leur angle et leur justification : si elles se ressemblent, la note n'a pas de
 * thèse, et c'est ce que l'œil doit voir avant d'avoir lu le corps.
 *
 * Deux présentations du même formulaire : un dépliant au motif des blocs (ouvert tant que rien
 * n'est retenu), ou — dans le portail à gestes — le contenu seul, ouvert, sous « À faire
 * maintenant ». `chiffresParAngle` signale une proposition qui contient un chiffre non conforme ;
 * ce signalement ne bloque rien, seule la phrase retenue est contrôlée strictement.
 */
export function RegimePanel({
  propositions,
  decision,
  action,
  ouvert = false,
  chiffresParAngle = {},
}: {
  propositions: RegimeProposition[];
  decision: DecisionRegime | undefined;
  /** `retenirRegime` lié au brouillon — passé par la page, comme pour `PropositionCard`. */
  action: (formData: FormData) => Promise<void>;
  /** Sans dépliant : le portail à gestes en fournit l'en-tête. */
  ouvert?: boolean;
  chiffresParAngle?: Partial<Record<RegimeAngle, number>>;
}) {
  const retenu = decision?.choix;
  // Le choix en cours de saisie. Il part de la décision enregistrée, jamais d'une proposition.
  const [choix, setChoix] = useState<RegimeRetenu | null>(retenu ?? null);
  const [propre, setPropre] = useState(retenu === "propre" ? (decision?.texte ?? "") : "");
  const pret = choix !== null && (choix !== "propre" || propre.trim() !== "");

  const formulaire = (
    <form action={action} className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Choisir la phrase de régime</legend>

        {ANGLES_REGIME.map((angle) => {
          const proposition = propositions.find((p) => p.angle === angle);
          if (!proposition) return null;
          const chiffres = chiffresParAngle[angle] ?? 0;
          return (
            <label
              key={angle}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-rb border border-trait bg-page px-3 py-2.5 has-[:checked]:border-encre"
            >
              <input
                type="radio"
                name="choix"
                value={angle}
                checked={choix === angle}
                onChange={() => setChoix(angle)}
                required
                className="mt-1 h-4 w-4 shrink-0 accent-encre"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
                    {ANGLE_LIBELLE[angle]}
                  </span>
                  {chiffres > 0 && (
                    <span className="rounded-rp bg-k-choc/11 px-1.5 py-0.5 text-11 font-semibold text-k-choc">
                      {chiffres} chiffre{chiffres > 1 ? "s" : ""}
                    </span>
                  )}
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
            checked={choix === "propre"}
            onChange={() => setChoix("propre")}
            required
            className="mt-1 h-4 w-4 shrink-0 accent-encre"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">
              Écrire la mienne
            </span>
            <textarea
              name="texte"
              value={propre}
              onChange={(e) => {
                setPropre(e.target.value);
                if (e.target.value.trim()) setChoix("propre");
              }}
              rows={2}
              placeholder="Une phrase qui tranche, que ni l'une ni l'autre n'a trouvée."
              className="mt-1 w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
            />
          </span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={!pret}
        className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f disabled:cursor-not-allowed disabled:border-trait disabled:bg-repos disabled:text-tenu"
      >
        {choix ? BOUTON[choix] : "Retenir cette phrase"}
      </button>
      {!choix && <p className="text-12 text-tenu">Aucune phrase n&rsquo;est retenue d&rsquo;avance : choisissez-en une.</p>}
    </form>
  );

  if (ouvert) return <div className="rounded-rc bg-repos px-4 py-3">{formulaire}</div>;

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
      <div className="border-t border-trait bg-repos px-4 py-3">{formulaire}</div>
    </details>
  );
}
