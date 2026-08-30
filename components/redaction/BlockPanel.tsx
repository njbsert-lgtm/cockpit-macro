import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import type { Authorship } from "@/lib/types";
import { corrigerBloc } from "@/app/redaction/actions";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { ValidationPill } from "./ValidationPill";

/**
 * Une entrée dépliante par bloc (DESIGN.md, motif de la liste d'archive) : pastille de
 * validation, titre, badge d'authorship ; le dépliant révèle le texte éditable.
 *
 * L'authorship se déduit du geste, jamais d'une case à cocher : soumettre le texte proposé tel
 * quel vaut `ia-relue`, le modifier vaut `ia-corrigee` — `corrigerBloc` fait cette comparaison
 * côté serveur. `CeQueJavaisMalLu` est l'exception : toujours `humaine`, il part vide.
 */
export function BlockPanel({
  slug,
  bloc,
  texte,
  authorship,
  valide,
}: {
  slug: string;
  bloc: BlockName;
  texte: string;
  authorship: Authorship | undefined;
  valide: boolean;
}) {
  const action = corrigerBloc.bind(null, slug, bloc);
  const placeholder =
    bloc === "CeQueJavaisMalLu"
      ? "Même vide, dites-le : « rien de notable cette semaine » est une réponse valide."
      : undefined;

  return (
    <details className="rounded-rc border border-trait bg-page">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <ValidationPill ok={valide} />
          <span className="truncate text-14-5 font-semibold text-encre">
            {BLOCK_TITLES[bloc]}
          </span>
        </span>
        {authorship && <AuthorshipBadge authorship={authorship} />}
      </summary>

      <form action={action} className="flex flex-col gap-2 border-t border-trait bg-repos px-4 py-3">
        <textarea
          name="texte"
          defaultValue={texte}
          placeholder={placeholder}
          rows={5}
          className="min-h-24 w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
        />
        <button
          type="submit"
          className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
        >
          Enregistrer
        </button>
      </form>
    </details>
  );
}
