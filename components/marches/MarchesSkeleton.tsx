import { LoadingState, SkeletonBlock, SkeletonLine } from "@/components/states/Skeleton";

export function MarchesSkeleton() {
  return (
    <LoadingState label="Chargement des marchés">
      <div className="mx-auto max-w-[1060px] px-4 py-8 md:px-6">
        <SkeletonBlock className="h-9 w-56" />
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-line bg-card p-4">
              <SkeletonLine width="40%" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SkeletonLine width="80%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="80%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
