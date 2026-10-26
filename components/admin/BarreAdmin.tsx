import type { SessionAdmin } from "@/lib/auth/session";
import { seDeconnecter } from "@/app/connexion/actions";

/** Pied discret des routes d'administration : qui est connecté, et la sortie. */
export function BarreAdmin({ session }: { session: SessionAdmin }) {
  return (
    <div className="mx-auto flex max-w-colonne items-center justify-between gap-3 px-4.5 pb-7 md:max-w-content md:px-6">
      <p className="text-11 text-tenu">
        {session.via === "contournement"
          ? "Contournement local (ADMIN_LOCAL)"
          : `Connecté${session.email ? ` · ${session.email}` : ""}`}
      </p>
      {session.via === "session" && (
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f"
          >
            Se déconnecter
          </button>
        </form>
      )}
    </div>
  );
}
