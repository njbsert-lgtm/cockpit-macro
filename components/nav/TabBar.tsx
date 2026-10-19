"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Quatre onglets, fixés en bas (DESIGN.md) : blanc à 95 % avec flou, bordure haute `--trait`,
 * et un padding bas qui absorbe `env(safe-area-inset-bottom)` — sans quoi les libellés
 * passeraient sous la barre d'accueil des téléphones sans bouton physique.
 *
 * Sur desktop (≥ 768px), la barre du bas disparaît et les mêmes onglets montent dans la barre
 * collante (`TabBarDesktop`, CLAUDE.md : « horizontale en haut sur desktop »). Les libellés
 * restent ceux du cahier des charges — la maquette montre « Carnet » et « Veille ».
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
  courbe: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7.5 15.5 11 11l3 2.5 4.5-6" />
    </>
  ),
  barres: (
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
  { href: "/macro", label: "Macro", icon: ICON.barres },
  { href: "/marches", label: "Marchés", icon: ICON.courbe },
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

function TabIcon({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/**
 * Les onglets dans la barre collante, sur desktop : icône de 18px et libellé 13px côte à côte,
 * actif en `--encre` avec un filet bas de 2px (DESIGN.md). Aucune couleur d'accent.
 */
export function TabBarDesktop() {
  const pathname = usePathname();

  return (
    <nav role="tablist" aria-label="Navigation principale" className="hidden h-full items-stretch gap-5 md:flex">
      {TABS.map((tab) => {
        const active = isTabActive(tab, pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 border-b-2 text-13 font-medium transition-colors ${
              active ? "border-encre text-encre" : "border-transparent text-tenu hover:text-doux"
            }`}
          >
            <TabIcon size={18}>{tab.icon}</TabIcon>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-trait bg-page/95 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-[16px]"
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
              <TabIcon size={20}>{tab.icon}</TabIcon>
              <span className="text-10-5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
