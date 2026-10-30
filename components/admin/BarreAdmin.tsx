import type { SessionAdmin } from "@/lib/auth/session";
import { seDeconnecter } from "@/app/connexion/actions";
import { NavLink } from "@/components/notes/NavLink";

/**
 * Pied des routes d'administration : la navigation entre les trois écrans, puis qui est
 * connecté et la sortie.
 *
 * C'est ici, et nulle part sur le site public, que vivent les liens vers `/admin/veille` (ex-`/triage`) et
 * `/redaction` : l'accueil ne signale plus la surface que le 404 cache. Pas de compteur — ils
 * demandaient une lecture de la base sur la page publique ; chaque écran affiche sa propre file.
 */
export function BarreAdmin({ session }: { session: SessionAdmin }) {
  return (
    <div className="mx-auto max-w-colonne px-4.5 pb-7 md:max-w-content md:px-6">
      <nav aria-label="Administration" className="flex flex-wrap items-center gap-2">
        <NavLink href="/admin">Accueil</NavLink>
        <NavLink href="/redaction">Rédaction</NavLink>
        <NavLink href="/admin/veille">Veille</NavLink>
        <NavLink href="/diagnostic">Diagnostic</NavLink>
      </nav>
      <div className="mt-3 flex items-center justify-between gap-3">
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
    </div>
  );
}
