/**
 * L'étiquette d'une valeur saisie à la main dans `data/seed.json`, qu'aucune source ne
 * collecte (DESIGN.md, « Étiquette de provenance »). Toujours accompagnée de la date de la
 * valeur : un chiffre sans date n'est jamais affiché, même marqué.
 */
export function NonCollecteBadge() {
  return (
    <span
      className="rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-k-choc"
      title="Aucune source ne collecte encore cette série : la valeur est saisie à la main dans data/seed.json et n'a jamais été vérifiée."
    >
      Non collecté
    </span>
  );
}
