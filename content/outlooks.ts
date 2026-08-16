import type { Outlook } from "@/lib/types";

/**
 * Contenu analytique versionné, comme les notes et les tendances — mais rédigé hors de
 * l'application : le condensé est produit avec l'assistance d'un LLM en dehors du site à partir
 * du document original, puis collé ici à la main. Pas d'appel API en direct depuis l'app pour
 * le générer, pas de scraping des sites des banques.
 *
 * Vide par défaut : aucun condensé n'est inventé au nom d'une banque. `/outlook` affiche un état
 * vide tant que rien n'est renseigné — à remplir au fil des publications réellement lues.
 */
export const OUTLOOKS: Outlook[] = [];
