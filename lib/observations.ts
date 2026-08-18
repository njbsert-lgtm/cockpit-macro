import type { Observation } from "./types";
import { getObservations as seedObservations, getMacroObservations as seedMacroObservations } from "./data";
import { mappingForInstrument, mappingForMacro } from "@/config/fred-series";
import { eurostatMappingFor } from "@/config/eurostat-series";
import { getReadClient } from "./supabase";

/**
 * Le dépôt d'observations : une seule porte devant deux sources.
 *
 * Règle d'or — **jamais de fusion pour un même identifiant.** Une série moitié base moitié
 * seed mentirait sur la provenance de ses points. Un instrument est servi soit par la base,
 * soit par le seed, jamais par les deux à la fois.
 *
 * Trois cas :
 * 1. L'instrument n'est pas couvert par une série FRED active → le seed, comme avant.
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

/** Journalise une fois par incident, pas une fois par instrument : sinon les logs sont illisibles. */
function warnOnce(context: string, detail: string): void {
  console.warn(`[observations] ${context} — repli sur data/seed.json : ${detail}`);
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
    const { data, error } = await client
      .from(table)
      .select(`${idColumn}, date, value, source, fetched_at`)
      .in(idColumn, ids)
      .order("date", { ascending: true });

    if (error) {
      warnOnce(`${table} illisible`, error.message);
      return null;
    }

    const bySeries: ObservationsBySeries = new Map();
    for (const row of (data ?? []) as Array<Row & Record<string, string>>) {
      const id = row[idColumn];
      const list = bySeries.get(id) ?? [];
      list.push({
        instrumentId: id,
        date: row.date,
        value: row.value,
        source: row.source,
        fetchedAt: row.fetched_at,
      });
      bySeries.set(id, list);
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

/** Les observations de marché pour un ensemble d'instruments, en une requête. */
export function loadObservations(instrumentIds: string[]): Promise<ObservationsBySeries> {
  return load(
    instrumentIds,
    (id) => mappingForInstrument(id) !== null,
    seedObservations,
    "observations",
    "instrument_id",
  );
}

/**
 * Un indicateur est couvert dès qu'une source active le collecte — FRED ou Eurostat. Les deux
 * ne se recoupent pas : chaque identifiant appartient à une source et une seule, ce que
 * `lib/integrity.ts` vérifie au chargement. La règle « jamais de fusion pour un même
 * identifiant » tient donc au-delà de la première source.
 */
export function isMacroCovered(id: string): boolean {
  return mappingForMacro(id) !== null || eurostatMappingFor(id) !== null;
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
