import type { ReactNode } from "react";

/**
 * Ce que le tableau « Les marchés par driver » dessine, sans JSX : la note publiée le relit du MDX
 * (`lecture-marches.ts`), le portail le construit depuis le paquet. Une seule forme pour les deux.
 */

export type MouvementVue =
  | { etat: "ok"; texte: string; sens: "hausse" | "baisse" | "plat"; du: string; au: string }
  /** « non suivi » ou « donnée absente au JJ/MM » : écrit tel quel, jamais un tiret ni un zéro. */
  | { etat: "indisponible"; message: string };

export type LigneMarcheVue = {
  cle: string;
  libelle: string;
  mouvement: MouvementVue;
  /** La cause, avec ses éventuels chiffres cités ; `null` : « Sans lien clair avec ce driver ». */
  cause: ReactNode | null;
  emetteur: string | null;
};

export type GroupeMarcheVue = { driverId: string; titre: string; lignes: LigneMarcheVue[] };

export const SANS_LIEN = "Sans lien clair avec ce driver";
