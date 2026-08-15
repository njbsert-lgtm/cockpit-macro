import { Suspense } from "react";
import { NotesContent } from "@/components/notes/NotesContent";
import { NotesSkeleton } from "@/components/notes/NotesSkeleton";

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NotesContent />
    </Suspense>
  );
}
