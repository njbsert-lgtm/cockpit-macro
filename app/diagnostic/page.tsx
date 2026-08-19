import Link from "next/link";
import { runDiagnostic } from "@/lib/diagnostic";

/**
 * L'état de la chaîne de collecte, en un écran.
 *
 * Écran d'exploitation, pas de contenu : il ne figure dans aucune barre de navigation et ne
 * s'atteint qu'en tapant son adresse. La protection par mot de passe de Vercel le couvre comme
 * le reste du site, et il ne renvoie jamais la valeur d'une clé — seulement sa présence.
 *
 * Jamais mis en cache : un diagnostic doit décrire l'instant où on le consulte.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Diagnostic — Marguerite" };

export default async function DiagnosticPage() {
  const { checks, verdict } = await runDiagnostic();
  const tout = checks.every((c) => c.ok);

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Exploitation</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Diagnostic</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Trois contrôles sur la chaîne de collecte, exécutés à l&rsquo;instant où vous ouvrez cette
        page. Aucune valeur de clé n&rsquo;est affichée, seulement sa présence.
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.label} className="rounded-rc border border-trait bg-page p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-15 font-semibold text-encre">{check.label}</h2>
              {/* Le mot porte l'information, pas la couleur : c'est un état de collecte, et il
                  doit rester lisible pour qui ne distingue pas les teintes. */}
              <span className="shrink-0 text-11 uppercase tracking-cap text-tenu">
                {check.ok ? "passe" : "échoue"}
              </span>
            </div>
            <p className="mt-1.5 text-13 text-doux">{check.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-rc border border-trait bg-repos p-4">
        <h2 className="text-11 uppercase tracking-cap text-tenu">
          {tout ? "Conclusion" : "Ce qu'il faut corriger"}
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-15 text-encre">{verdict}</p>
      </div>

      <p className="mt-6 text-13 text-tenu">
        <Link href="/" className="underline underline-offset-2 hover:text-encre">
          Revenir aux Notes
        </Link>
      </p>
    </div>
  );
}
