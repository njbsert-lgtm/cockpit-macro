export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-4 animate-pulse rounded-[2px] bg-line-2"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[2px] bg-line-2 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Squelette d'une rangée de tableau de cotations (label, valeur, commentaire). */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-line-2 py-3">
      <SkeletonLine width="40%" />
      <SkeletonLine width="20%" />
      <SkeletonLine width="30%" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-line bg-card p-5">
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
