import type { ConditionManquante } from "@/lib/redaction/publication";

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
  action,
}: {
  pret: boolean;
  manquantes: ConditionManquante[];
  chiffresBloquants: boolean;
  action?: (formData: FormData) => Promise<void>;
}) {
  const disabled = !pret || !action;
  const raisonPrincipale = chiffresBloquants
    ? "Un chiffre reste introuvable dans un bloc non relu."
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
      Publier la note
    </button>
  );

  return (
    <div>
      {action ? <form action={action}>{bouton}</form> : bouton}
      {raison && <p className="mt-2 text-12 text-k-choc">{raison}</p>}
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
