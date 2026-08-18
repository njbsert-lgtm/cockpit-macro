/**
 * La cadence d'une série et ce qu'elle implique — partagé par toutes les sources de collecte.
 *
 * Extrait de `config/fred-series.ts` quand Eurostat est arrivé : la tolérance de retard de
 * publication dépend de la fréquence de la série, pas de la source qui la sert. Une série
 * mensuelle a les mêmes attentes qu'elle vienne de FRED ou d'Eurostat.
 */

export type Cadence = "business-daily" | "monthly" | "quarterly" | "annual";

/**
 * Tolérance avant de signaler un **retard de publication** — un signal distinct de la
 * fraîcheur, calculé sur la date de l'observation et non sur celle du relevé. Il s'affiche
 * sur l'indicateur concerné et ne fait jamais rougir le point de la barre persistante.
 *
 * Pour le quotidien, le compte est en **jours ouvrés** : trois jours ouvrés absorbent un
 * férié isolé comme un pont, sans qu'aucun calendrier de fériés ait à être maintenu.
 *
 * Les 45 jours du mensuel sont calibrés sur la réalité de publication : un indice de prix de
 * juillet est daté du 1er juillet et paraît à la mi-août. Descendre en dessous ferait crier
 * l'indicateur à chaque cycle normal.
 */
export const STALENESS_TOLERANCE: Record<
  Cadence,
  { unit: "business-days" | "calendar-days"; max: number }
> = {
  "business-daily": { unit: "business-days", max: 3 },
  monthly: { unit: "calendar-days", max: 45 },
  quarterly: { unit: "calendar-days", max: 120 },
  annual: { unit: "calendar-days", max: 450 },
};
