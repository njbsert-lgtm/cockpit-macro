/**
 * Le compteur de validation en tête de portail (DESIGN.md) : `4/5` sur fond vert à 11 % quand
 * complet, ocre sinon. C'est l'exception chromatique que le motif d'archive porte déjà ; elle
 * n'est pas étendue ailleurs.
 */
export function PortalCounter({ done, total }: { done: number; total: number }) {
  const complet = done === total;
  return (
    <span
      className={`inline-flex items-center rounded-rp px-2 py-0.5 text-13 font-semibold tabular-nums ${
        complet ? "bg-hausse/11 text-hausse" : "bg-k-choc/11 text-k-choc"
      }`}
    >
      {done}/{total}
    </span>
  );
}
