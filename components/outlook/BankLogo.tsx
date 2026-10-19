import type { Outlook } from "@/lib/types";

/**
 * Le logo d'une maison, ou son monogramme en repli. Un logo garde sa forme : le cadre a la
 * hauteur fixe du carré (40 ou 48px) et s'élargit jusqu'à 96px pour un logotype en longueur
 * (« Morgan Stanley »), qui serait illisible réduit dans un carré. Fond `--page`, bordure
 * `--trait`, rayon `--rc`. Le monogramme reste dans le carré `--repos`.
 */
export function BankLogo({ outlook, size }: { outlook: Pick<Outlook, "logo" | "bank" | "bankMonogram">; size: 40 | 48 }) {
  const hauteur = size === 40 ? "h-10 min-w-10" : "h-12 min-w-12";
  if (outlook.logo) {
    return (
      <span
        className={`flex ${hauteur} max-w-24 shrink-0 items-center justify-center overflow-hidden rounded-rc border border-trait bg-page px-1.5 py-1.5`}
      >
        {/* Un logo est un fichier statique, vectoriel : pas d'optimisation d'image nécessaire. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={outlook.logo} alt={outlook.bank} className="h-full w-auto max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`flex ${size === 40 ? "h-10 w-10" : "h-12 w-12"} shrink-0 items-center justify-center rounded-rc border border-trait bg-repos`}
    >
      <span aria-hidden="true" className="text-11 font-bold text-encre">
        {outlook.bankMonogram}
      </span>
    </span>
  );
}
