import { LoadingState, SkeletonBlock, SkeletonLine } from "@/components/states/Skeleton";

/** Un squelette à la forme du contenu : deux rangées de filtres, puis la liste. Jamais un spinner. */
export function MarchesSkeleton() {
  return (
    <LoadingState label="Chargement des marchés">
      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <SkeletonBlock className="h-9 w-56" />

        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-11" />
          ))}
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-11 w-24 shrink-0" />
          ))}
        </div>

        <div className="mt-5 rounded-rc border border-trait bg-page">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-b border-trait px-3 py-3 last:border-b-0"
            >
              <div className="w-2/5">
                <SkeletonLine width="100%" />
              </div>
              <div className="w-1/4">
                <SkeletonLine width="100%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
