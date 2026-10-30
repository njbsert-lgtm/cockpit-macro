import Link from "next/link";
import { EmptyState } from "@/components/states/EmptyState";

/**
 * L'état « vide » d'une adresse inconnue : il dit quoi faire. Le même corps sert aux routes
 * protégées refusées (CLAUDE.md : « 404 au corps identique à une adresse inconnue »).
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <EmptyState
        title="Cette page n’existe pas"
        description="L’adresse est peut-être mal saisie ou la page a été retirée. Les notes sont la meilleure porte d’entrée."
        action={
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f"
          >
            Retour aux notes
          </Link>
        }
      />
    </div>
  );
}
