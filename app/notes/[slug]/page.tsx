import { notFound } from "next/navigation";
import Link from "next/link";
import { getNote, getNoteBody, getNotes } from "@/lib/content";
import { NoteBlocks } from "@/components/notes/NoteBlocks";

/**
 * Énumère les notes au build. Effet de bord voulu : cela force le chargement et la
 * validation de tout le corpus MDX pendant `next build`, donc une note à laquelle il
 * manque un bloc obligatoire fait échouer la compilation au lieu de passer inaperçue.
 */
export function generateStaticParams() {
  return getNotes().map((e) => ({ slug: e.slug }));
}

/**
 * La page de lecture (DESIGN.md) : le retour appartient au cadre, au-dessus de la note ; la
 * colonne est limitée à 640px sur desktop — une ligne plus longue ne se lit pas.
 */
export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  // Temps de lecture à 200 mots par minute, balises retirées : une indication, pas une mesure.
  const mots = (getNoteBody(slug) ?? "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(mots / 200));

  return (
    <div className="mx-auto max-w-colonne px-4.5 pb-6 md:max-w-lecture md:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/notes"
          className="inline-flex min-h-11 items-center text-12 text-doux hover:text-encre"
        >
          ← Notes
        </Link>
        <span className="text-11 text-tenu">
          {note.isoWeek.replace(/^\d{4}-/, "")} · {minutes} min
        </span>
      </div>
      <NoteBlocks note={note} />
    </div>
  );
}
