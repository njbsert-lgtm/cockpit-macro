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
 * Chaque entrée porte `url` (page officielle où la date a été lue) et `releveLe` (jour du
 * relevé). Relevé du 30/10/2026 : les sites des institutions étaient injoignables depuis la
 * session de l'agent (hôtes hors de la liste réseau autorisée), donc rien n'a pu être lu à la
 * source — le fichier reste vide plutôt que de recopier un résumé de moteur de recherche.
 *
 * Même règle que `content/outlooks.ts` : le fichier reste vide tant que rien n'a été
 * réellement relevé, et l'interface affiche un état vide plutôt que de fabriquer un exemple.
 */
export const CALENDRIER_DRIVERS: Echeance[] = [];

/**
 * Anomalies d'une liste d'échéances : source (URL https) ou date de relevé manquantes, date mal
 * formée, relevé postérieur à `aujourdhui`, échéance déjà passée. Vide = liste valide. Le test
 * l'applique au calendrier réel : une entrée non sourcée fait échouer la suite.
 */
export function anomaliesCalendrier(liste: Echeance[], aujourdhui: string): string[] {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const out: string[] = [];
  for (const e of liste) {
    const id = `${e.driverId} ${e.date} ${e.libelle}`;
    if (!iso.test(e.date ?? "")) out.push(`${id} : date invalide`);
    else if (e.date < aujourdhui) out.push(`${id} : échéance passée`);
    if (!e.driverId) out.push(`${id} : driver absent`);
    if (!/^https:\/\/\S+$/.test(e.url ?? "")) out.push(`${id} : source (url) absente`);
    if (!iso.test(e.releveLe ?? "")) out.push(`${id} : date de relevé absente`);
    else if (e.releveLe > aujourdhui) out.push(`${id} : relevé dans le futur`);
  }
  return out;
}

/** Les échéances d'une fenêtre `[debut, fin]`, bornes comprises, dans l'ordre chronologique. */
export function echeancesEntre(debut: string, fin: string): Echeance[] {
  return CALENDRIER_DRIVERS.filter((e) => e.date >= debut && e.date <= fin).sort(
    (a, b) => a.date.localeCompare(b.date) || a.driverId.localeCompare(b.driverId),
  );
}
