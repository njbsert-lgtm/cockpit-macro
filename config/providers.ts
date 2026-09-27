import { mappingForInstrument, mappingForMacro } from "./fred-series";
import { twelveDataMappingForInstrument } from "./twelve-data-series";
import { alphaVantageMappingForInstrument } from "./alpha-vantage-series";
import { eurostatMappingFor } from "./eurostat-series";
import { onsMappingFor } from "./ons-series";
import { estatMappingFor } from "./estat-series";

/**
 * La chaîne de fournisseurs, par instrument et par indicateur macro.
 *
 * Jusqu'ici, `isInstrumentCovered` et `isMacroCovered` (`lib/observations.ts`) étaient un simple
 * OU entre les fonctions de mapping de chaque source — juste tant qu'aucun identifiant n'était
 * jamais activé dans deux fichiers de configuration à la fois, une discipline que rien ne
 * vérifiait (`lib/integrity.ts` prétendait le faire ; il ne le faisait pas).
 *
 * Ce fichier fait de l'ordre une donnée explicite plutôt qu'un accident de l'ordre des `||`.
 * Chaque catégorie déclare la liste ordonnée de ses fournisseurs possibles ; le premier dont le
 * mapping est actif fait foi pour cet identifiant, et `lib/ingest.ts` s'aligne dessus avant
 * d'écrire — pas seulement `lib/observations.ts` avant de lire. C'est ce qui rend mécanique la
 * règle du cahier : « jamais de fusion pour un même identifiant », plutôt que documentée.
 *
 * Changer le fournisseur d'un identifiant déjà dans la chaîne — un palier payant qui lève un
 * verrou chez Twelve Data, par exemple — ne touche que le fichier de la source elle-même
 * (`enabled: true`) : rien ici n'a besoin de changer. Ce fichier ne change que le jour où une
 * *nouvelle* source rejoint la chaîne d'un identifiant déjà couvert.
 */
export type Provider = "fred" | "twelve-data" | "alpha-vantage" | "eurostat" | "ons" | "estat";

type Maillon = { source: Provider; actif: (id: string) => boolean };

const CHAINE_INSTRUMENT: Maillon[] = [
  { source: "fred", actif: (id) => mappingForInstrument(id) !== null },
  { source: "twelve-data", actif: (id) => twelveDataMappingForInstrument(id) !== null },
  // Toutes les entrées d'ALPHA_VANTAGE_SERIES restent désactivées (voir ce fichier) : ce
  // maillon n'active encore rien, mais sa présence permet de l'activer sans toucher à la chaîne
  // le jour où les ytdBasis du seed auront été recalibrés sur l'échelle des ETF trouvés.
  { source: "alpha-vantage", actif: (id) => alphaVantageMappingForInstrument(id) !== null },
];

const CHAINE_MACRO: Maillon[] = [
  { source: "fred", actif: (id) => mappingForMacro(id) !== null },
  { source: "eurostat", actif: (id) => eurostatMappingFor(id) !== null },
  { source: "ons", actif: (id) => onsMappingFor(id) !== null },
  { source: "estat", actif: (id) => estatMappingFor(id) !== null },
];

/** Le fournisseur qui fait foi pour cet instrument, ou `null` si aucun n'est actif. */
export function fournisseurInstrument(id: string): Provider | null {
  return CHAINE_INSTRUMENT.find((m) => m.actif(id))?.source ?? null;
}

/** Le fournisseur qui fait foi pour cet indicateur macro, ou `null` si aucun n'est actif. */
export function fournisseurMacro(id: string): Provider | null {
  return CHAINE_MACRO.find((m) => m.actif(id))?.source ?? null;
}

/**
 * Tous les fournisseurs actifs pour cet instrument — pas seulement le premier. Une longueur
 * supérieure à 1 est exactement la faute que ce fichier existe pour empêcher : deux sources
 * écriraient dans la même série, l'une écrasant l'historique de l'autre au fil des jours sans
 * qu'aucune erreur ne le signale. Utilisé par le test de non-recoupement, ci-contre.
 */
export function fournisseursActifsInstrument(id: string): Provider[] {
  return CHAINE_INSTRUMENT.filter((m) => m.actif(id)).map((m) => m.source);
}

export function fournisseursActifsMacro(id: string): Provider[] {
  return CHAINE_MACRO.filter((m) => m.actif(id)).map((m) => m.source);
}
