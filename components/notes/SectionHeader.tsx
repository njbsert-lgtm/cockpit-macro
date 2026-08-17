import Link from "next/link";

/**
 * L'en-tête de section (DESIGN.md) : titre 17px à gauche, compteur discret à droite, et sous
 * le titre une ligne de note qui explique la logique de la section.
 *
 * Quand la section mène ailleurs, le titre devient un bouton portant un chevron qui se décale
 * de 2px au survol — et **c'est le titre entier qui est cliquable**, pas le seul chevron, qui
 * serait une cible trop petite au pouce.
 */
export function SectionHeader({
  title,
  note,
  count,
  href,
}: {
  title: string;
  note?: string;
  count?: string;
  href?: string;
}) {
  const heading = href ? (
    <Link href={href} className="group inline-flex items-baseline gap-1 text-encre">
      <h2 className="text-17 font-semibold tracking-titre">{title}</h2>
      <span
        aria-hidden="true"
        className="text-17 font-semibold text-tenu transition-transform group-hover:translate-x-0.5 group-hover:text-encre"
      >
        ›
      </span>
    </Link>
  ) : (
    <h2 className="text-17 font-semibold tracking-titre text-encre">{title}</h2>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        {heading}
        {count && <span className="shrink-0 text-12 text-tenu">{count}</span>}
      </div>
      {note && <p className="mt-1 text-12-5 text-doux">{note}</p>}
    </div>
  );
}
