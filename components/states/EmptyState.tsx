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
    <div className="rounded-rc border border-dashed border-trait bg-page px-6 py-10 text-center">
      <p className="text-17 font-bold text-encre">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-15 text-tenu">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
