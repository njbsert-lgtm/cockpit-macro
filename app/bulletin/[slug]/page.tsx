import { notFound } from "next/navigation";
import Link from "next/link";
import { getEdition } from "@/lib/data";
import { RegimeHeader } from "@/components/bulletin/RegimeHeader";
import { EditionBlocks } from "@/components/bulletin/EditionBlocks";

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
      <div className="mx-auto max-w-[1060px] px-4 py-8 md:px-6">
        <Link
          href="/bulletin"
          className="mb-4 inline-block font-mono text-[12px] text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
        >
          ← Retour au bulletin
        </Link>
        <EditionBlocks edition={edition} />
      </div>
    </>
  );
}
