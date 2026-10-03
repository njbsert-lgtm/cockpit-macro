/**
 * L'étiquette d'un compteur dont la table est illisible (DESIGN.md, « Compteur d'angles morts »).
 * Même forme que « Non collecté » : c'est une valeur qu'aucune lecture n'a confirmée. Elle remplace
 * le chiffre — jamais un 0, qui affirmerait « la grille tient » alors qu'on n'en sait rien.
 */
export function NonMesureBadge() {
  return (
    <span
      className="rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-k-choc"
      title="La table des angles morts n'a pas pu être lue : le compteur ne dit rien plutôt que zéro."
    >
      Non mesuré
    </span>
  );
}
