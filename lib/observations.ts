import type { Observation } from "./types";
import { getObservations as seedObservations, getMacroObservations as seedMacroObservations } from "./data";
import { fournisseurInstrument, fournisseurMacro } from "@/config/providers";
import { getReadClient } from "./supabase";

/**
 * Le dépôt d'observations : une seule porte devant deux sources.
 *
 * Règle d'or — **jamais de fusion pour un même identifiant.** Une série moitié base moitié
 * seed mentirait sur la provenance de ses points. Un instrument est servi soit par la base,
 * soit par le seed, jamais par les deux à la fois.
 *
 * Trois cas :
 * 1. L'instrument n'est pas couvert par une source active (FRED, Twelve Data) → le seed, comme
 *    avant.
 * 2. Il est couvert et la base répond → la base.
 * 3. Il est couvert mais la base ne répond pas, ou n'a encore rien → le seed. Le site reste
 *    utilisable, avec des chiffres datés et une source honnêtement nommée. Jamais un tiret,
 *    jamais un zéro.
 */

export type ObservationsBySeries = Map<string, Observation[]>;

type Row = {
  date: string;
  value: number;
  source: string;
  fetched_at: string;
};

/**
 * Le plafond de lignes lues par série, dans un seul sens : le plus récent d'abord.
 *
 * PostgREST plafonne toute réponse (1000 lignes par défaut chez Supabase) sans le signaler
 * comme une erreur — la requête réussit, simplement tronquée. Une requête `.in(idColumn, ids)`
 * sur plusieurs identifiants à la fois partage ce plafond entre eux : ONS et e-Stat renvoient
 * l'historique complet d'une série à chaque passage (parfois depuis 1989), donc dès qu'on
 * demande plusieurs indicateurs macro d'une même zone en un coup, leurs lignes se mélangent
 * avant troncature. Triées par date croissante, la coupe tombait alors sur les points les plus
 * **anciens** qui survivent — desservant la carte, qui n'affiche que le dernier reçu, une
 * valeur d'il y a vingt ans avec une date plausible mais fausse (bug réel constaté le 28/09 :
 * l'inflation britannique affichée datait de 2004 quand la base contenait déjà 2026).
 *
 * La correction interroge chaque identifiant séparément, triée par date **décroissante** avec
 * ce plafond : la troncature, si elle a lieu, perd les points les plus anciens plutôt que les
 * plus récents — l'inverse de ce qu'un tableau de bord doit garantir. 3000 couvre largement un
 * siècle d'historique mensuel ONS/e-Stat comme plusieurs années de clôtures quotidiennes.
 */
const MAX_ROWS_PER_SERIES = 3000;

/** Journalise une fois par incident, pas une fois par instrument : sinon les logs sont illisibles. */
function warnOnce(context: string, detail: string): void {
  console.warn(`[observations] ${context} — repli sur data/seed.json : ${detail}`);
}

async function loadOneFromDatabase(
  table: "observations" | "macro_observations",
  idColumn: "instrument_id" | "indicator_id",
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<Observation[] | null> {
  const { data, error } = await client
    .from(table)
    .select(`${idColumn}, date, value, source, fetched_at`)
    .eq(idColumn, id)
    .order("date", { ascending: false })
    .limit(MAX_ROWS_PER_SERIES);

  if (error) {
    warnOnce(`${table} illisible pour ${id}`, error.message);
    return null;
  }

  // Reçues du plus récent au plus ancien pour garantir que la troncature épargne le présent ;
  // remises en ordre chronologique avant de rejoindre le reste du dépôt, qui l'attend ainsi.
  return ((data ?? []) as Array<Row & Record<string, string>>)
    .map((row) => ({
      instrumentId: row[idColumn],
      date: row.date,
      value: row.value,
      source: row.source,
      fetchedAt: row.fetched_at,
    }))
    .reverse();
}

async function loadFromDatabase(
  table: "observations" | "macro_observations",
  idColumn: "instrument_id" | "indicator_id",
  ids: string[],
): Promise<ObservationsBySeries | null> {
  if (ids.length === 0) return new Map();

  const client = getReadClient();
  if (!client) return null; // base non configurée : ce n'est pas une panne, c'est un mode de marche

  try {
    const results = await Promise.all(
      ids.map((id) => loadOneFromDatabase(table, idColumn, id, client)),
    );

    // Chaque identifiant a sa propre requête, donc son propre sort : celui qui échoue retombe
    // seul sur le seed (via l'absence de clé dans la carte, lue par `load`), sans emporter les
    // autres séries de la page avec lui.
    const bySeries: ObservationsBySeries = new Map();
    for (let i = 0; i < ids.length; i++) {
      const rows = results[i];
      if (rows !== null) bySeries.set(ids[i], rows);
    }
    return bySeries;
  } catch (error) {
    warnOnce(`${table} injoignable`, (error as Error).message);
    return null;
  }
}

async function load(
  ids: string[],
  isCovered: (id: string) => boolean,
  fromSeed: (id: string) => Observation[],
  table: "observations" | "macro_observations",
  idColumn: "instrument_id" | "indicator_id",
): Promise<ObservationsBySeries> {
  const covered = ids.filter(isCovered);
  const fromDatabase = covered.length > 0 ? await loadFromDatabase(table, idColumn, covered) : new Map();

  const result: ObservationsBySeries = new Map();
  for (const id of ids) {
    const dbRows = fromDatabase?.get(id);
    // Une série couverte mais encore vide en base — premier déploiement, cron pas encore
    // passé — retombe sur le seed plutôt que d'afficher un écran vide.
    result.set(id, dbRows && dbRows.length > 0 ? dbRows : fromSeed(id));
  }
  return result;
}

/**
 * Un instrument de marché est couvert dès qu'un fournisseur est actif pour lui dans la chaîne
 * (`config/providers.ts`) — FRED ou Twelve Data aujourd'hui. Oublier Twelve Data ici faisait
 * retomber l'or et MSCI ACWI sur le seed pour toujours, même une fois réellement collectés —
 * bug réel trouvé le 13/09 : les observations de seed d'ACWI datent d'avant le passage à l'ETF
 * iShares (échelle en points d'indice, ~800), tandis qu'`ytdBasis` avait déjà été mis à jour à
 * l'échelle du prix par part (~141) ; la performance YTD mélangeait donc deux échelles et
 * affichait une valeur absurde.
 */
export function isInstrumentCovered(id: string): boolean {
  return fournisseurInstrument(id) !== null;
}

/** Les observations de marché pour un ensemble d'instruments, en une requête. */
export function loadObservations(instrumentIds: string[]): Promise<ObservationsBySeries> {
  return load(instrumentIds, isInstrumentCovered, seedObservations, "observations", "instrument_id");
}

/**
 * Un indicateur est couvert dès qu'un fournisseur est actif pour lui dans la chaîne
 * (`config/providers.ts`) — FRED, Eurostat, ONS ou e-Stat aujourd'hui. La chaîne garantit
 * qu'un seul fournisseur fait foi par identifiant ; `config/providers.test.ts` le vérifie
 * contre la configuration réelle plutôt que de le supposer.
 *
 * Oublier une source dans la chaîne ne casse rien bruyamment : l'indicateur retombe sur le
 * seed, qui est vide dès que la source a été activée (la valeur en dur en est retirée) —
 * l'écran affiche silencieusement l'état vide au lieu de la donnée réellement collectée. C'est
 * exactement le bug qui a touché `uk-*` puis `jp-*` : ajouté à la chaîne seulement après coup.
 */
export function isMacroCovered(id: string): boolean {
  return fournisseurMacro(id) !== null;
}

/** Les observations macro pour un ensemble d'indicateurs, en une requête. */
export function loadMacroObservations(indicatorIds: string[]): Promise<ObservationsBySeries> {
  return load(
    indicatorIds,
    isMacroCovered,
    seedMacroObservations,
    "macro_observations",
    "indicator_id",
  );
}

/** Un seul instrument — pour les pages qui n'en affichent qu'un. */
export async function loadObservationsFor(instrumentId: string): Promise<Observation[]> {
  return (await loadObservations([instrumentId])).get(instrumentId) ?? [];
}

export async function loadMacroObservationsFor(indicatorId: string): Promise<Observation[]> {
  return (await loadMacroObservations([indicatorId])).get(indicatorId) ?? [];
}

/** Lecture depuis une carte déjà chargée. Les calculs restent purs et testables. */
export function observationsOf(
  bySeries: ObservationsBySeries,
  seriesId: string,
): Observation[] {
  return bySeries.get(seriesId) ?? [];
}
