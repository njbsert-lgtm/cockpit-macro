"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Quatre onglets, fixés en bas (DESIGN.md) : blanc à 95 % avec flou, bordure haute `--trait`,
 * et un padding bas qui absorbe `env(safe-area-inset-bottom)` — sans quoi les libellés
 * passeraient sous la barre d'accueil des téléphones sans bouton physique.
 *
 * Une seule barre désormais, en bas sur tous les écrans : DESIGN.md ne prévoit pas de rangée
 * d'onglets desktop distincte. Les libellés restent ceux du cahier des charges — la maquette
 * montre « Carnet » et « Veille », qui ne sont pas les nôtres.
 */
type Tab = { href: string; label: string; icon: React.ReactNode };

/** Icônes en trait de 1.7, `fill:none`, bouts arrondis — dessinées ici, aucune dépendance. */
const ICON = {
  notes: (
    <>
      <path d="M5.5 3.5h8l5 5V20a.5.5 0 0 1-.5.5H5.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  macro: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7.5 15.5 11 11l3 2.5 4.5-6" />
    </>
  ),
  marches: (
    <>
      <path d="M4 19.5h16" />
      <path d="M6.5 19.5v-5.5M11 19.5V8.5M15.5 19.5v-8M20 19.5V5" />
    </>
  ),
  outlook: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4c2.2 2.3 3.3 5 3.3 8s-1.1 5.7-3.3 8c-2.2-2.3-3.3-5-3.3-8S9.8 6.3 12 4Z" />
    </>
  ),
};

const TABS: Tab[] = [
  { href: "/", label: "Notes", icon: ICON.notes },
  { href: "/macro", label: "Macro", icon: ICON.macro },
  { href: "/marches", label: "Marchés", icon: ICON.marches },
  { href: "/outlook", label: "Outlook", icon: ICON.outlook },
];

/**
 * L'onglet Notes vit à `/`, mais ses sous-pages — le fil, une note, un driver, une tendance,
 * la file de tri — restent ailleurs. `pathname.startsWith("/")` serait vrai partout ; il faut
 * un cas particulier pour ne pas allumer l'onglet Notes sur Macro ou Marchés.
 */
function isTabActive(tab: Tab, pathname: string): boolean {
  if (tab.href === "/") {
    return pathname === "/" || pathname.startsWith("/notes") || pathname.startsWith("/triage");
  }
  return pathname.startsWith(tab.href);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-page/95 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-[16px]"
    >
      <div className="mx-auto flex max-w-colonne md:max-w-content">
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
                active ? "text-encre" : "text-tenu hover:text-doux"
              }`}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {tab.icon}
              </svg>
              <span className="text-10-5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
