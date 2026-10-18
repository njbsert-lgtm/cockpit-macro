import { Suspense } from "react";
import Link from "next/link";
import { ZoneSelector } from "./ZoneSelector";
import { FreshnessIndicator } from "./FreshnessIndicator";
import { TabBarDesktop } from "@/components/nav/TabBar";

/**
 * La barre de zone, collante en haut (DESIGN.md) : blanc à 95 % avec flou, bordure basse
 * `--trait`. La marque à gauche en 13px poids 700, le segment de zone à droite.
 *
 * Sur desktop, les onglets s'y logent à droite de la marque (DESIGN.md, barre d'onglets).
 *
 * Le segment ne s'affiche que sur Macro — seul onglet à avoir une notion de zone globale
 * (cahier des charges) ; l'indicateur de fraîcheur, lui, reste sur tous les écrans.
 */
export function PersistentBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-trait bg-page/95 backdrop-blur-[14px]">
      <div className="mx-auto flex h-[47px] max-w-colonne items-center justify-between gap-3 px-4.5 md:max-w-content md:px-6">
        <div className="flex h-full items-stretch gap-8">
          <Link href="/" className="flex shrink-0 items-center text-13 font-bold tracking-titre text-encre">
            Marguerite
          </Link>
          <TabBarDesktop />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Suspense fallback={null}>
            <ZoneSelector />
          </Suspense>
          <Suspense fallback={null}>
            <FreshnessIndicator />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
