"use client";

import { createContext, useContext } from "react";

/**
 * L'état partagé entre la coque du portail (frise, vues) et les gestes qu'elle contient. Les
 * gestes sont rendus côté serveur puis posés dans la coque : ils lisent l'« aperçu publié » ici
 * plutôt que de le recevoir en propriété.
 */
export type ContextePortail = {
  /** Masque surlignages, badges et pastilles pour une relecture à blanc. */
  apercu: boolean;
  /** Le geste ouvert. */
  actif: string | null;
  ouvrir: (id: string) => void;
};

export const PortailContexte = createContext<ContextePortail>({
  apercu: false,
  actif: null,
  ouvrir: () => {},
});

export function usePortail(): ContextePortail {
  return useContext(PortailContexte);
}
