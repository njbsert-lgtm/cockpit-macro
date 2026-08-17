/**
 * DESIGN.md ne prévoit aucune surface sombre : le pied passe sur le fond de page, séparé par
 * un simple trait. L'avertissement reste signalé par une étiquette en capitales — du contenu,
 * donc une couleur de canal, jamais du rouge.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-trait px-4.5 py-7 md:px-6">
      <div className="mx-auto max-w-colonne md:max-w-content">
        <p className="text-9-5 font-semibold uppercase tracking-cap text-k-choc">Avertissement</p>
        <p className="mt-1.5 max-w-[82ch] text-12-5 text-doux">
          Support d&rsquo;analyse personnel, pas un conseil en investissement.
        </p>
      </div>
    </footer>
  );
}
