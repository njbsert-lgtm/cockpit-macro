import type { Cadence } from "@/config/cadence";
import { STALENESS_TOLERANCE } from "@/config/cadence";
import { observationsOf, type ObservationsBySeries } from "@/lib/observations";
import { dailyChange, latestObservation } from "@/lib/performance";
import { publicationDelay } from "@/lib/staleness";
import type { ObservationContexte } from "./context";

/**
 * Ce que les instruments de marché et les indicateurs macro ont en commun pour entrer dans le
 * paquet de contexte : un identifiant, un libellé, une unité, une cadence de publication.
 *
 * `ytdBasis` distingue les deux : un instrument en a une (clôture du 31 décembre), un
 * indicateur macro non — un taux de chômage ou une variation annuelle n'a pas de sens comparé
 * à une base de janvier. `null` fait sauter le calcul plutôt que produire un chiffre absurde.
 */
export type EntreeObservable = {
  id: string;
  label: string;
  unit: string;
  cadence: Cadence;
  ytdBasis: number | null;
};

/**
 * Construit les observations du paquet de contexte pour une liste d'entrées — instruments ou
 * indicateurs macro, selon l'appelant (`scripts/rediger-note.mts`).
 *
 * `estCouvert` est le garde-fou central : sans lui, un instrument ou un indicateur resté au
 * seed (jamais collecté, ou pas encore) entrerait dans le paquet avec une valeur figée que le
 * contrôle des chiffres validerait comme si elle était réelle — exactement l'inverse de ce que
 * ce contrôle existe pour empêcher. `isInstrumentCovered` et `isMacroCovered` (`lib/observations.ts`)
 * sont les fonctions à passer ici, jamais un simple test « la série a-t-elle des points ».
 *
 * La tolérance d'écart entre deux relevés (`dailyChange`) suit la cadence de l'entrée plutôt
 * que le défaut de sept jours pensé pour des séries quotidiennes : une série mensuelle publie
 * un point tous les trente jours environ, largement au-delà de sept — la réutilisation du seuil
 * de retard de publication (`STALENESS_TOLERANCE`), déjà calibré pour chaque cadence, évite
 * d'inventer un second seuil qui pourrait diverger du premier.
 */
export function construireObservationsDepuis(
  entrees: EntreeObservable[],
  bySeries: ObservationsBySeries,
  dateCible: string,
  estCouvert: (id: string) => boolean,
): ObservationContexte[] {
  return entrees.flatMap((entree) => {
    if (!estCouvert(entree.id)) return [];

    const obs = observationsOf(bySeries, entree.id);
    if (obs.length === 0) return [];

    const derniere = latestObservation(obs);
    const retard = publicationDelay(derniere?.date ?? null, entree.cadence, new Date(dateCible));
    const ecartMaximal = STALENESS_TOLERANCE[entree.cadence].max;

    const variationYTD =
      entree.ytdBasis !== null && entree.ytdBasis !== 0 && derniere
        ? ((derniere.value - entree.ytdBasis) / entree.ytdBasis) * 100
        : null;

    return [
      {
        instrumentId: entree.id,
        label: entree.label,
        unit: entree.unit,
        // Les dix derniers relevés suffisent : le modèle écrit une note hebdomadaire, pas une
        // analyse de série longue, et un paquet obèse dilue ce qui compte.
        valeurs: obs.slice(-10).map((o) => ({ date: o.date, value: o.value })),
        variationSemaine: dailyChange(obs, ecartMaximal)?.pct ?? null,
        variationYTD,
        fraicheur: (retard === null ? "absent" : retard.late ? "retard" : "ok") as
          | "ok"
          | "retard"
          | "absent",
      },
    ];
  });
}
