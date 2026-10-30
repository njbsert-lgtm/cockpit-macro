import type { Outlook } from "@/lib/types";

/** Millésimes présents, du plus récent au plus ancien. */
export function millesimesDisponibles(outlooks: Outlook[]): number[] {
  return [...new Set(outlooks.map((o) => o.millesime))].sort((a, b) => b - a);
}

/**
 * Le millésime à afficher : celui de l'URL s'il existe, sinon le plus récent. Un paramètre d'URL
 * se saisit à la main, il ne produit jamais un 404.
 */
export function millesimeChoisi(outlooks: Outlook[], param: string | string[] | undefined): number | null {
  const dispo = millesimesDisponibles(outlooks);
  if (dispo.length === 0) return null;
  const brut = Array.isArray(param) ? param[0] : param;
  const n = brut && /^\d{4}$/.test(brut) ? Number(brut) : NaN;
  return dispo.includes(n) ? n : dispo[0];
}
