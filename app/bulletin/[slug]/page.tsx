import { notFound } from "next/navigation";
import Link from "next/link";
import { getEdition, getEditions } from "@/lib/content";
import { RegimeHeader } from "@/components/bulletin/RegimeHeader";
import { EditionBlocks } from "@/components/bulletin/EditionBlocks";

/**
 * Énumère les éditions au build. Effet de bord voulu : cela force le chargement et la
 * validation de tout le corpus MDX pendant `next build`, donc une édition à laquelle il
 * manque un bloc obligatoire fait échouer la compilation au lieu de passer inaperçue.
 */
export function generateStaticParams() {
  return getEditions().map((e) => ({ slug: e.slug }));
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const edition = getEdition(slug);
  if (!edition) notFound();

  return (
    <>
      <RegimeHeader edition={edition} />
      <div className="mx-auto max-w-content px-4 py-8 md:px-6">
        <Link
          href="/bulletin"
          className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
        >
          ← Retour au bulletin
        </Link>
        <EditionBlocks edition={edition} />
      </div>
    </>
  );
}
