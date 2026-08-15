import { Suspense } from "react";
import { FeedContent } from "@/components/notes/FeedContent";
import { FeedSkeleton } from "@/components/notes/FeedSkeleton";

export default function NotesPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}
