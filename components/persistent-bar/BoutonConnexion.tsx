"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTE_CONFIRMATION, ROUTE_CONNEXION, estRouteProtegee } from "@/lib/auth/regles";

/**
 * Le bouton « Se connecter » de la barre persistante.
 *
 * **Statique, jamais lié à la session** : la barre vit dans le layout racine, mis en cache une
 * heure (`revalidate`) ; y lire un cookie rendrait tout le site dynamique. Le bouton est donc le
 * même pour tous, et c'est `/connexion` qui renvoie un administrateur déjà connecté vers
 * `/redaction`. Il se masque là où il serait absurde — sur l'écran de connexion lui-même et sur
 * les routes protégées, dont le pied propose déjà « Se déconnecter ».
 *
 * Deux variantes. **`barre`** : compacte, pour la barre de 47px, à partir de 768px seulement —
 * sur mobile, la barre de Macro porte déjà le sélecteur de zone, la marque et l'indicateur de
 * fraîcheur, et un quatrième élément réduit le sélecteur à quelques pixels. **`pied`** : le
 * bouton secondaire ordinaire de `DESIGN.md`, dans le pied de page, sur toutes les largeurs.
 */
export function BoutonConnexion({ variante }: { variante: "barre" | "pied" }) {
  const chemin = usePathname();
  if (
    chemin === ROUTE_CONNEXION ||
    chemin.startsWith(`${ROUTE_CONFIRMATION}`) ||
    estRouteProtegee(chemin)
  ) {
    return null;
  }

  if (variante === "pied") {
    return (
      <Link
        href={ROUTE_CONNEXION}
        className="mt-4 inline-flex min-h-11 items-center rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre transition-colors hover:border-trait-f"
      >
        Se connecter
      </Link>
    );
  }

  return (
    <Link href={ROUTE_CONNEXION} className="group hidden min-h-11 shrink-0 items-center md:flex">
      <span className="rounded-rb border border-trait bg-page px-3 py-1.5 text-12 font-medium text-encre transition-colors group-hover:border-trait-f">
        Se connecter
      </span>
    </Link>
  );
}
