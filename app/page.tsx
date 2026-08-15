import { Suspense } from "react";
import { HomeContent } from "@/components/notes/HomeContent";
import { HomeSkeleton } from "@/components/notes/HomeSkeleton";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
