/**
 * L'état « vide » ne doit jamais se limiter à « aucun résultat » — il dit quoi faire.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-card px-6 py-10 text-center">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-mute">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
