import { LoadingState, SkeletonBlock, SkeletonLine } from "@/components/states/Skeleton";

export function MacroSkeleton() {
  return (
    <LoadingState label="Chargement des indicateurs macro">
      <div className="mx-auto max-w-content px-4 py-8 md:px-6">
        <SkeletonBlock className="h-9 w-64" />
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-line bg-card p-4">
              <SkeletonLine width="60%" />
              <div className="mt-3">
                <SkeletonLine width="40%" />
              </div>
              <SkeletonBlock className="mt-3 h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
