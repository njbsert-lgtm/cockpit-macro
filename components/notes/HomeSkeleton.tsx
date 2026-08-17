import { LoadingState, SkeletonBlock } from "@/components/states/Skeleton";

/** Écran d'accueil : couche 1 (régime + drivers) puis couche 2 (l'étagère), à la forme du contenu. */
export function HomeSkeleton() {
  return (
    <LoadingState label="Chargement des notes">
      <div className="bg-encre px-4.5 py-7 md:px-6">
        <div className="mx-auto max-w-colonne md:max-w-content">
          <SkeletonBlock className="h-3 w-40 bg-white/15" />
          <SkeletonBlock className="mt-3 h-9 w-3/4 bg-white/15" />
          <div className="mt-6 grid grid-cols-2 gap-1 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-14 bg-white/10" />
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} className="h-24 bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
        <SkeletonBlock className="h-7 w-32" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-52 w-[78vw] shrink-0 md:w-full" />
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
