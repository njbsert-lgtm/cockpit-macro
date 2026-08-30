import type { Authorship } from "./types";

/**
 * Le badge d'authorship (DESIGN.md). `ia` est le seul état qui appelle une action — un bloc
 * jamais ouvert — et le seul qui sorte du gris : couleur de canal, jamais vert ni rouge, ce
 * n'est pas un chiffre.
 */
export const AUTHORSHIP_LABEL: Record<Authorship, string> = {
  ia: "IA",
  "ia-relue": "IA relue",
  "ia-corrigee": "IA corrigée",
  humaine: "Humaine",
};

export const AUTHORSHIP_TEXT_CLASS: Record<Authorship, string> = {
  ia: "text-k-choc",
  "ia-relue": "text-doux",
  "ia-corrigee": "text-doux",
  humaine: "text-encre",
};
