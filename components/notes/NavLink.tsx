import Link from "next/link";

/**
 * Lien de navigation vers un autre écran (DESIGN.md, « Liens de navigation de l'accueil ») : il
 * change une vue, donc rayon `--rp`, et porte un chevron. Un compteur éventuel est une pastille
 * `--repos` ; son libellé complet passe au lecteur d'écran.
 */
export function NavLink({
  href,
  children,
  count,
  countLabel,
}: {
  href: string;
  children: React.ReactNode;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 rounded-rp border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
    >
      {children}
      {count !== undefined && (
        <>
          <span aria-hidden="true" className="rounded-rp bg-repos px-1.5 py-0.5 text-11 text-doux">
            {count}
          </span>
          {countLabel && <span className="sr-only">{countLabel}</span>}
        </>
      )}
      <span aria-hidden="true" className="text-tenu transition-transform group-hover:translate-x-0.5">
        ›
      </span>
    </Link>
  );
}
