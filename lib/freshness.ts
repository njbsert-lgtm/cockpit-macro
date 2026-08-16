import type { Observation } from "./types";

export type FreshnessTier = "frais" | "perime" | "erreur" | "absente";

const HOUR = 60 * 60 * 1000;

/**
 * Les paliers du cahier des charges sont à 24 h et 48 h — une et deux collectes manquées,
 * la collecte étant quotidienne. Ils sont élargis de deux heures parce que les crons du plan
 * Hobby de Vercel ne sont pas ponctuels : un déclenchement peut arriver jusqu'à une heure
 * après l'horaire prévu, donc deux passages consécutifs parfaitement sains peuvent être
 * espacés de près de 25 h. Sans cette marge, un tuyau qui fonctionne passerait régulièrement
 * en ambre — et un indicateur qui crie sans raison finit par ne plus être lu.
 */
export const FRESH_MAX_HOURS = 26;
export const STALE_MAX_HOURS = 50;

/**
 * Fraîcheur calculée à partir de `fetchedAt`, jamais déclarée. `absente` quand il n'y a tout
 * simplement aucun relevé.
 *
 * Elle mesure **l'âge de notre copie, pas celui du chiffre**. Le cron re-confirme chaque jour
 * la dernière observation de chaque série, même quand la valeur n'a pas bougé : un samedi,
 * un jour férié ou une série mensuelle publiée il y a trois semaines restent donc verts. Une
 * série qui ne bouge pas n'est pas une série périmée — seule une collecte en échec l'est.
 */
export function freshnessTier(
  fetchedAt: string | null | undefined,
  now: Date = new Date(),
): FreshnessTier {
  if (!fetchedAt) return "absente";
  const ageHours = (now.getTime() - new Date(fetchedAt).getTime()) / HOUR;
  if (ageHours < FRESH_MAX_HOURS) return "frais";
  if (ageHours < STALE_MAX_HOURS) return "perime";
  return "erreur";
}

export function freshnessOfObservation(
  obs: Observation | null,
  now: Date = new Date(),
): FreshnessTier {
  return freshnessTier(obs?.fetchedAt, now);
}

const TIER_SEVERITY: Record<FreshnessTier, number> = {
  frais: 0,
  perime: 1,
  erreur: 2,
  absente: 3,
};

/** Le pire des états de fraîcheur d'un ensemble — pilote le point de l'indicateur global. */
export function worstTier(tiers: FreshnessTier[]): FreshnessTier {
  if (tiers.length === 0) return "absente";
  return tiers.reduce((worst, t) =>
    TIER_SEVERITY[t] > TIER_SEVERITY[worst] ? t : worst,
  );
}

/** La date de relevé la plus ancienne d'un ensemble d'observations — celle qui pilote l'indicateur. */
export function oldestFetchedAt(observations: Observation[]): string | null {
  const dates = observations.map((o) => o.fetchedAt).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((oldest, d) => (d < oldest ? d : oldest));
}

export const TIER_LABEL: Record<FreshnessTier, string> = {
  frais: "à jour",
  perime: "périmé",
  erreur: "en erreur",
  absente: "aucune donnée",
};
