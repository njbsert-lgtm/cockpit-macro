"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/", label: "Notes" },
  { href: "/macro", label: "Macro" },
  { href: "/marches", label: "Marchés" },
  { href: "/outlook", label: "Outlook" },
];

/**
 * L'onglet Notes vit à `/`, mais ses sous-pages — le fil, une note, un driver, une tendance —
 * restent sous `/notes`. `pathname.startsWith("/")` serait vrai partout ; il faut un cas
 * particulier pour ne pas allumer l'onglet Notes sur Macro ou Marchés.
 */
function isTabActive(tab: Tab, pathname: string): boolean {
  if (tab.href === "/") return pathname === "/" || pathname.startsWith("/notes");
  return pathname.startsWith(tab.href);
}

function TabLink({
  tab,
  active,
  variant,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  variant: "mobile" | "desktop";
}) {
  const base =
    variant === "mobile"
      ? "flex flex-1 flex-col items-center gap-1 py-2.5 text-10-5 uppercase tracking-wide"
      : "px-3.5 py-2.5 text-12 uppercase tracking-wide border-b-2";

  return (
    <Link
      href={tab.href}
      className={`${base} ${
        active
          ? variant === "mobile"
            ? "text-white"
            : "border-white text-white"
          : variant === "mobile"
            ? "text-white/55"
            : "border-transparent text-white/60 hover:text-white/85"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {tab.label}
    </Link>
  );
}

/**
 * Chaque onglet gère sa propre zone, quand il en a une : Macro par le sélecteur du bandeau,
 * Marchés par sa propre rangée de zones, Notes n'a plus de notion de zone du tout. Il n'y a
 * donc plus de contexte partagé à faire suivre d'un onglet à l'autre — chaque lien pointe sur
 * l'URL nue de sa page, sans reprendre le paramètre de la page courante.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop : horizontale, sous la barre persistante. */}
      <nav
        aria-label="Navigation principale"
        className="hidden border-b border-white/15 bg-encre px-4 md:block"
      >
        <div className="mx-auto flex max-w-colonne md:max-w-content gap-1">
          {TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isTabActive(tab, pathname)} variant="desktop" />
          ))}
        </div>
      </nav>

      {/* Mobile : fixe en bas, jamais de hamburger. */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/15 bg-encre md:hidden"
      >
        {TABS.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isTabActive(tab, pathname)} variant="mobile" />
        ))}
      </nav>
    </>
  );
}
