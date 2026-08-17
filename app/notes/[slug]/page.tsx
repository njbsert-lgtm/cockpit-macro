import { notFound } from "next/navigation";
import Link from "next/link";
import { getNote, getNotes } from "@/lib/content";
import { RegimeHeader } from "@/components/notes/RegimeHeader";
import { NoteBlocks } from "@/components/notes/NoteBlocks";

/**
 * Énumère les notes au build. Effet de bord voulu : cela force le chargement et la
 * validation de tout le corpus MDX pendant `next build`, donc une note à laquelle il
 * manque un bloc obligatoire fait échouer la compilation au lieu de passer inaperçue.
 */
export function generateStaticParams() {
  return getNotes().map((e) => ({ slug: e.slug }));
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  return (
    <>
      <RegimeHeader note={note} />
      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <Link
          href="/notes"
          className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
        >
          ← Retour aux notes
        </Link>
        <NoteBlocks note={note} />
      </div>
    </>
  );
}
