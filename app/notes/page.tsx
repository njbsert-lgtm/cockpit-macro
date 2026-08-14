import { Suspense } from "react";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { NotesContent } from "@/components/notes/NotesContent";
import { NotesSkeleton } from "@/components/notes/NotesSkeleton";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = parseZone(params[ZONE_PARAM]);

  return (
    <Suspense key={zone} fallback={<NotesSkeleton />}>
      <NotesContent zone={zone} />
    </Suspense>
  );
}
