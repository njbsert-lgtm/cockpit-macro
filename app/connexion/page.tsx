import { redirect } from "next/navigation";
import { sessionAdmin } from "@/lib/auth/session";
import { demanderLien } from "./actions";

/**
 * La connexion au back-office : une adresse, un lien magique. Aucun lien n'y mène depuis le
 * site public ; on y vient en tapant son adresse.
 *
 * Le message après envoi est le même que l'adresse soit connue ou non (`lib/auth/connexion.ts`).
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connexion — Marguerite",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { titre: string; texte: string }> = {
  envoye: {
    titre: "Vérifiez votre boîte",
    texte:
      "Si cette adresse a un accès, un lien de connexion vient de lui être envoyé. Il est valable une heure et ne sert qu’une fois.",
  },
  invalide: {
    titre: "Adresse illisible",
    texte: "Saisissez une adresse e-mail complète, par exemple nom@domaine.fr.",
  },
  erreur: {
    titre: "Service injoignable",
    texte:
      "Le service de connexion ne répond pas. Aucun lien n’est parti : réessayez dans quelques minutes.",
  },
  lien: {
    titre: "Lien inutilisable",
    texte:
      "Ce lien a expiré, a déjà servi, ou n’ouvre pas d’accès. Demandez-en un nouveau ci-dessous.",
  },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  if (await sessionAdmin()) redirect("/redaction");
  const { etat } = await searchParams;
  const message = etat ? MESSAGES[etat] : undefined;

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7">
      <p className="text-11 uppercase tracking-cap text-tenu">Back-office</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Connexion</h1>
      <p className="mt-2 text-15 text-doux">
        Recevez un lien de connexion par e-mail. Aucun mot de passe.
      </p>

      {message && (
        <div role="status" className="mt-6 rounded-rc bg-repos p-4">
          {/* Titre en encre, jamais en rouge : la charte réserve le rouge aux chiffres. */}
          <p className="text-14-5 font-semibold text-encre">{message.titre}</p>
          <p className="mt-1 text-12-5 text-doux">{message.texte}</p>
        </div>
      )}

      <form action={demanderLien} className="mt-6 flex flex-col gap-3">
        <label htmlFor="email" className="text-12 font-medium text-doux">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="min-h-11 w-full rounded-rb border border-trait bg-page px-3 text-15 text-encre hover:border-trait-f"
        />
        <button
          type="submit"
          className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
        >
          Recevoir le lien
        </button>
      </form>
    </div>
  );
}
