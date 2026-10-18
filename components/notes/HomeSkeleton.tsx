import { LoadingState, SkeletonBlock } from "@/components/states/Skeleton";

/**
 * Écran d'accueil, à la forme du contenu : régime, chiffres clés, cartes de driver, puis
 * l'étagère. Sur fond de page, comme l'écran qu'il annonce — plus de bandeau sombre.
 */
export function HomeSkeleton() {
  return (
    <LoadingState label="Chargement des notes">
      <div className="mx-auto max-w-colonne px-4.5 pt-6 md:max-w-content md:px-6">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="mt-3 h-8 w-3/4" />
        <SkeletonBlock forme="carte" className="mt-5 h-[124px] md:h-[62px]" />
        <div className="mt-7 flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} forme="carte" className="h-44" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
        <SkeletonBlock className="h-5 w-32" />
        <div className="mt-3 flex gap-3 overflow-hidden md:grid md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} forme="carte" className="h-52 w-[262px] shrink-0 md:w-full" />
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
