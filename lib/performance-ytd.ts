import { estNonCollectee } from "./provenance";
import { latestObservation, ytdChange } from "./performance";
import { formatChange } from "./marches";
import type { AssetClass, Instrument, Observation } from "./types";

/**
 * La vue YTD multi-actifs (J7.1) : une ligne par instrument, jamais d'agrégat. Ce module ne
 * recalcule rien — l'écart vient de `ytdChange` (`lib/performance.ts`), le même calcul que la
 * liste de Marchés et la fiche instrument. Il décide seulement de ce qu'une ligne a le droit de
 * dire, et surtout de pourquoi elle se tait quand elle ne peut rien dire.
 */

/** Pourquoi une ligne ne porte pas d'écart. Chaque cause a sa phrase : un trou se nomme. */
export type RaisonNonSuivi =
  /** Aucune observation en base : aucune source ne collecte l'instrument. */
  | "aucune-source"
  /** Seule une valeur saisie à la main existe (`source: "seed"`) : rien ne se calcule dessus. */
  | "valeur-saisie"
  /** Une valeur collectée existe, mais la clôture du 31 décembre n'a pas été saisie. */
  | "base-absente";

export type LigneYtd =
  | {
      statut: "suivi";
      instrument: Instrument;
      /** Déjà formaté dans l'unité qui se lit : points de base pour un taux, % sinon. */
      ecart: string;
      direction: "up" | "down" | "flat";
      /** Le 31 décembre dont la clôture sert de base. */
      dateBase: string;
      valeurBase: number;
      /** Date du dernier relevé collecté. */
      dateReleve: string;
      valeurReleve: number;
    }
  | {
      statut: "non-suivi";
      instrument: Instrument;
      raison: RaisonNonSuivi;
      /** Dernière valeur collectée et sa date, seulement pour `base-absente`. */
      derniereValeur: { date: string; value: number } | null;
    };

/** Le 31 décembre qui précède le dernier relevé : la date que porte `Instrument.ytdBasis`. */
export function dateBaseYtd(dateReleve: string): string {
  return `${Number(dateReleve.slice(0, 4)) - 1}-12-31`;
}

export function ligneYtd(instrument: Instrument, obs: Observation[]): LigneYtd {
  const latest = latestObservation(obs);
  if (!latest) {
    return { statut: "non-suivi", instrument, raison: "aucune-source", derniereValeur: null };
  }
  if (estNonCollectee(latest)) {
    return { statut: "non-suivi", instrument, raison: "valeur-saisie", derniereValeur: null };
  }
  const ytd = ytdChange(instrument, obs);
  if (!ytd) {
    return {
      statut: "non-suivi",
      instrument,
      raison: "base-absente",
      derniereValeur: { date: latest.date, value: latest.value },
    };
  }
  return {
    statut: "suivi",
    instrument,
    ecart: formatChange(instrument, ytd.absolute, ytd.pct),
    direction: ytd.absolute > 0 ? "up" : ytd.absolute < 0 ? "down" : "flat",
    dateBase: dateBaseYtd(ytd.toDate),
    valeurBase: ytd.basis,
    dateReleve: ytd.toDate,
    valeurReleve: latest.value,
  };
}

export type GroupeYtd = { assetClass: AssetClass; lignes: LigneYtd[] };

/**
 * Les lignes rangées par classe d'actifs, dans l'ordre donné, **sans aucune moyenne ni total** :
 * une moyenne simple d'instruments n'est l'indice de personne (CLAUDE.md, Marchés). Une classe
 * sans instrument ne produit pas de groupe.
 */
export function groupesYtd(
  instruments: Instrument[],
  bySeries: Map<string, Observation[]>,
  ordre: AssetClass[],
): GroupeYtd[] {
  return ordre
    .map((assetClass) => ({
      assetClass,
      lignes: instruments
        .filter((i) => i.assetClass === assetClass)
        .map((i) => ligneYtd(i, bySeries.get(i.id) ?? [])),
    }))
    .filter((g) => g.lignes.length > 0);
}
