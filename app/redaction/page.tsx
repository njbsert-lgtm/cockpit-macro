import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseNote } from "@/lib/notes";
import { BROUILLONS_DIR } from "@/lib/redaction/run";
import { brouillonsDisponibles } from "@/lib/redaction/portail";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDateShort } from "@/lib/format";

export default async function RedactionPage() {
  const slugs = brouillonsDisponibles();
  const brouillons = slugs.flatMap((slug) => {
    try {
      const source = readFileSync(path.join(BROUILLONS_DIR, `${slug}.mdx`), "utf-8");
      return [parseNote(slug, source)];
    } catch {
      // Un brouillon dont le contrôle des chiffres a échoué peut rester structurellement
      // invalide : on ne le liste pas plutôt que de faire échouer toute la page pour lui.
      return [];
    }
  });

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Notes</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Rédaction</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Les brouillons écrits par le pipeline, en attente de relecture. Rien n&rsquo;est publié
        depuis cette liste — chaque brouillon a sa propre page de validation, et aucun bouton
        n&rsquo;accepte tout en un geste.
      </p>

      {brouillons.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun brouillon en attente"
            description="Le cycle hebdomadaire dépose un brouillon le samedi, après la collecte de la clôture de vendredi. Rien à relire pour l'instant."
          />
        </div>
      ) : (
        <ul aria-label="Brouillons en attente" className="mt-6 flex flex-col gap-3">
          {brouillons.map((note) => (
            <li key={note.meta.slug}>
              <Link
                href={`/redaction/${note.meta.slug}`}
                className="block rounded-rc border border-trait bg-page px-4 py-3.5 hover:border-trait-f"
              >
                <span className="flex items-center gap-2">
                  <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
                    {note.meta.kind === "hebdo" ? "Hebdo" : "Spéciale"}
                  </span>
                  <span className="text-11 tabular-nums text-tenu">
                    {note.meta.isoWeek} · {formatDateShort(note.meta.date)}
                  </span>
                </span>
                <span className="mt-1 block text-15 font-semibold leading-snug text-encre">
                  {note.meta.regimeStatement}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
