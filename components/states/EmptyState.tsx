/**
 * L'état « vide » (DESIGN.md, « Les cinq états ») : panneau `--repos`, rayon `--rc`, un titre
 * et une phrase qui dit quoi faire — jamais un simple « aucun résultat ». Le pointillé est
 * réservé à la carte d'appel du carrousel.
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
    <div className="rounded-rc bg-repos p-4">
      <p className="text-14-5 font-semibold text-encre">{title}</p>
      <p className="mt-1 max-w-[64ch] text-12-5 text-doux">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
