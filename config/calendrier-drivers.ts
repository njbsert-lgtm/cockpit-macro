import type { Echeance } from "@/lib/types";

/**
 * Les rendez-vous datés à l'avance, rattachés au driver qu'ils informent : réunions de banques
 * centrales, publications statistiques, réunions OPEP, rapports EIA, résultats des émetteurs
 * suivis.
 *
 * Deux usages, décrits au cahier des charges :
 * - **Avant** : le portail rappelle les échéances de la semaine à venir au moment d'écrire le
 *   bloc 5. On ne pose pas un guet sur un événement qu'on a oublié.
 * - **Après** : une échéance passée sans item de veille correspondant signale une collecte en
 *   défaut, pas un non-événement. Une source qui se tait ressemble à un monde calme.
 *
 * ⚠︎ **Vide à dessein.** Ces dates sont des affirmations sur le monde — « la Fed se réunit le
 * 16 septembre » —, pas de la configuration technique. Les écrire de mémoire produirait un
 * calendrier plausible et faux, et le portail rappellerait des réunions qui n'ont pas lieu.
 * Elles se saisissent à la main depuis les calendriers officiels des institutions concernées.
 *
 * Même règle que `content/outlooks.ts` : le fichier reste vide tant que rien n'a été
 * réellement relevé, et l'interface affiche un état vide plutôt que de fabriquer un exemple.
 */
export const CALENDRIER_DRIVERS: Echeance[] = [];

/** Les échéances d'une fenêtre `[debut, fin]`, bornes comprises, dans l'ordre chronologique. */
export function echeancesEntre(debut: string, fin: string): Echeance[] {
  return CALENDRIER_DRIVERS.filter((e) => e.date >= debut && e.date <= fin).sort(
    (a, b) => a.date.localeCompare(b.date) || a.driverId.localeCompare(b.driverId),
  );
}
