"use client";

import { EmptyState } from "@/components/states/EmptyState";

/**
 * L'état « erreur » au niveau de la route (DESIGN.md, « Les cinq états »). Côté public : aucun
 * statut technique, aucun message d'exception ni identifiant. Le titre reste en `--encre` —
 * le rouge est réservé aux chiffres. Un seul bouton, secondaire.
 */
export default function Erreur({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <div role="status">
        <EmptyState
          title="Cette page ne s’est pas chargée"
          description="Les analyses restent consultables depuis les onglets. Réessayez dans un instant."
          action={
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f"
            >
              Réessayer
            </button>
          }
        />
      </div>
    </div>
  );
}
