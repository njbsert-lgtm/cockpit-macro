/**
 * Les squelettes (DESIGN.md, « Les cinq états ») : des blocs `--repos` à la forme exacte du
 * contenu, au rayon du composant imité, et **sans pulsation** — aucune animation décorative.
 */
export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-4 rounded-rp bg-repos"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

const FORME = { pastille: "rounded-rp", bouton: "rounded-rb", carte: "rounded-rc" } as const;

/** `forme` imite le rayon du composant remplacé : une carte se charge en carte, un titre en ligne. */
export function SkeletonBlock({
  className = "",
  forme = "pastille",
}: {
  className?: string;
  forme?: keyof typeof FORME;
}) {
  return (
    <div
      className={`${FORME[forme]} bg-repos ${className}`}
      aria-hidden="true"
    />
  );
}

/** Squelette d'une rangée de tableau de cotations (label, valeur, commentaire). */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-trait py-3">
      <SkeletonLine width="40%" />
      <SkeletonLine width="20%" />
      <SkeletonLine width="30%" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-rc border border-trait bg-page p-5">
      <SkeletonLine width="30%" />
      <div className="mt-3">
        <SkeletonLine width="80%" />
      </div>
      <div className="mt-2">
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}

/** Bloc de chargement générique — enveloppe une liste de SkeletonRow/SkeletonCard. */
export function LoadingState({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
