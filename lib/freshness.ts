import type { Observation } from "./types";

export type FreshnessTier = "frais" | "perime" | "erreur" | "absente";

const HOUR = 60 * 60 * 1000;

/**
 * Fraîcheur calculée à partir de `fetchedAt`, jamais déclarée : vert sous 24 h, ambre entre
 * 24 et 48 h, rouge au-delà. `absente` quand il n'y a tout simplement aucun relevé.
 */
export function freshnessTier(
  fetchedAt: string | null | undefined,
  now: Date = new Date(),
): FreshnessTier {
  if (!fetchedAt) return "absente";
  const ageHours = (now.getTime() - new Date(fetchedAt).getTime()) / HOUR;
  if (ageHours < 24) return "frais";
  if (ageHours < 48) return "perime";
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
