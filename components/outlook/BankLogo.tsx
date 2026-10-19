import type { Outlook } from "@/lib/types";

/**
 * Le logo d'une maison, ou son monogramme en repli : carré `--rc` bordé, sur fond `--repos`.
 * Aucun logo n'est embarqué tant qu'il n'a pas été fourni (`public/outlooks/logos/`).
 */
export function BankLogo({ outlook, size }: { outlook: Pick<Outlook, "logo" | "bank" | "bankMonogram">; size: 40 | 48 }) {
  const dim = size === 40 ? "h-10 w-10" : "h-12 w-12";
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-rc border border-trait bg-repos`}
    >
      {outlook.logo ? (
        // Un logo est un fichier statique fourni à la main : pas d'optimisation d'image nécessaire.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={outlook.logo} alt={outlook.bank} className="h-full w-full object-contain" />
      ) : (
        <span aria-hidden="true" className="text-11 font-bold text-encre">
          {outlook.bankMonogram}
        </span>
      )}
    </span>
  );
}
