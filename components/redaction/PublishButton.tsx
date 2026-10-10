"use client";

import { useActionState } from "react";
import type { ConditionManquante } from "@/lib/redaction/publication";
import { reproche, type VerdictChiffre } from "@/lib/redaction/figures";
import type { RetourPublication } from "@/app/redaction/actions";
import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";

/**
 * Le bouton de publication (DESIGN.md) : primaire, désactivé tant qu'une condition manque, la
 * raison écrite dessous. Jamais un bouton mort sans explication — c'est l'état 3 du cahier,
 * dire quoi faire plutôt que constater.
 *
 * `action` est optionnel : tant que le déclenchement réel (workflow GitHub) n'est pas branché,
 * le bouton reste visible et honnête sur son état plutôt que masqué.
 */
export function PublishButton({
  pret,
  manquantes,
  chiffresBloquants,
  verdictsBloquants = [],
  action,
}: {
  pret: boolean;
  manquantes: ConditionManquante[];
  chiffresBloquants: boolean;
  verdictsBloquants?: VerdictChiffre[];
  action?: (precedent: RetourPublication, formData: FormData) => Promise<RetourPublication>;
}) {
  const [retour, lancer, enCours] = useActionState(
    action ?? (async (p: RetourPublication) => p),
    { statut: "inactif", message: "" } as RetourPublication,
  );
  const disabled = !pret || !action || enCours || retour.statut === "ok";
  const raisonPrincipale = chiffresBloquants
    ? "Un chiffre non conforme reste dans un bloc relu sans correction — relire ne suffit pas : corrigez la phrase ou gardez le nombre, depuis « Chiffres à trancher »."
    : manquantes[0]?.message;
  const raison = !pret
    ? raisonPrincipale
    : !action
      ? "Le déclenchement de la publication n'est pas encore branché."
      : null;

  const bouton = (
    <button
      type="submit"
      disabled={disabled}
      className="min-h-11 w-full rounded-rb border border-encre bg-encre px-4 text-14-5 font-semibold text-white transition-colors hover:border-trait-f disabled:cursor-not-allowed disabled:border-trait disabled:bg-repos disabled:text-tenu"
    >
      {enCours ? "Publication en cours…" : retour.statut === "ok" ? "Publication lancée" : "Publier la note"}
    </button>
  );

  return (
    <div>
      {action ? <form action={lancer}>{bouton}</form> : bouton}
      <div aria-live="polite">
        {retour.statut === "ok" && (
          <p className="mt-2 rounded-rb border border-trait bg-repos px-3 py-2 text-12 text-encre">
            ✓ {retour.message}{" "}
            <a
              className="underline"
              href="https://github.com/njbsert-lgtm/cockpit-macro/actions/workflows/publier-note.yml"
              target="_blank"
              rel="noreferrer"
            >
              Suivre l&rsquo;exécution
            </a>
          </p>
        )}
        {retour.statut === "erreur" && <p className="mt-2 text-12 text-k-choc">{retour.message}</p>}
      </div>
      {raison && <p className="mt-2 text-12 text-k-choc">{raison}</p>}
      {chiffresBloquants && verdictsBloquants.length > 0 && (
        <ul className="mt-1.5 list-disc pl-4 text-11 text-tenu">
          {verdictsBloquants.map((v, i) => (
            <li key={`${v.bloc}-${v.ecrit}-${i}`}>
              «&nbsp;{v.ecrit}&nbsp;» dans {BLOCK_TITLES[v.bloc as BlockName] ?? v.bloc} — {reproche(v)}
            </li>
          ))}
        </ul>
      )}
      {!pret && manquantes.length > 1 && (
        <ul className="mt-1.5 list-disc pl-4 text-11 text-tenu">
          {manquantes.slice(1).map((m) => (
            <li key={m.code}>{m.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
