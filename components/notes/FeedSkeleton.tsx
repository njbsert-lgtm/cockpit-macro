import { LoadingState, SkeletonBlock, SkeletonLine } from "@/components/states/Skeleton";

/** `/notes` : filtres puis fil de cartes empilées, à la forme du contenu. */
export function FeedSkeleton() {
  return (
    <LoadingState label="Chargement des notes">
      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-3 h-9 w-64" />
        <div className="mt-6 flex flex-col gap-2">
          <SkeletonLine width="60%" />
          <SkeletonLine width="80%" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} forme="carte" className="h-28" />
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
