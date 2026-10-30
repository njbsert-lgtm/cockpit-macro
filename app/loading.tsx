import { LoadingState, SkeletonBlock } from "@/components/states/Skeleton";

/**
 * L'état « chargement » au niveau de la route (DESIGN.md, « Les cinq états ») : un titre, une
 * phrase et des cartes en blocs `--repos`, sans pulsation, jamais de spinner centré. Les routes
 * qui ont leur propre squelette (accueil, Marchés…) gardent le leur : celui-ci couvre les autres.
 */
export default function Loading() {
  return (
    <LoadingState label="Chargement de la page">
      <div className="mx-auto max-w-colonne px-4.5 pt-6 md:max-w-content md:px-6">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-3 h-8 w-2/3" />
        <div className="mt-6 flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} forme="carte" className="h-28" />
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
