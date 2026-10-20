import type { ScenarioLikelihood, ScenarioVersion } from "./types";
import { DEBUT_DU_SUIVI } from "@/config/suivi";

/**
 * Le repère de révision d'une branche : ce que la page peut dire de son état précédent, et rien
 * de plus. Deux règles, toutes deux nées de la remise à zéro du corpus (config/suivi.ts) :
 *
 * - une version n'est datée que de la note qui l'a produite : « était faible en S39 » nomme la
 *   semaine de la VERSION précédente, jamais celle de la note comparée — la branche a pu ne pas
 *   bouger à cette date, ou n'avoir aucune version alors ;
 * - quand la version précédente n'existe plus, ou date d'avant le début du suivi, la page ne
 *   dit JAMAIS « était … en SXX » : elle dit « Première version suivie ». Un état hérité d'une
 *   note retirée se lirait comme un état réel.
 */
export const PREMIERE_VERSION_SUIVIE = "Première version suivie";

export type RepereRevision =
  | { type: "revision"; avant: ScenarioLikelihood; semaine: string }
  | { type: "premiere" };

/** « 2026-S39 » → « S39 » ; « 2026-S39-E1 » → « S39·E1 ». */
export function semaineDeNote(slug: string): string {
  return slug.split("-").slice(1).join("·");
}

/**
 * La version juste avant `v` sur la même branche, si elle est encore suivie : numéro précédent,
 * présente dans le corpus, et produite par une note du suivi (pas d'avant S38).
 */
export function versionPrecedente(versions: ScenarioVersion[], v: ScenarioVersion): ScenarioVersion | null {
  const prev = versions.find(
    (x) => x.driverId === v.driverId && x.branchId === v.branchId && x.version === v.version - 1,
  );
  if (!prev) return null;
  // Les slugs « AAAA-Sss[-En] » se trient dans l'ordre des notes.
  if (prev.noteSlug.localeCompare(DEBUT_DU_SUIVI.slug) < 0) return null;
  return prev;
}

/**
 * `null` quand rien n'est à dire : la branche a bien une version précédente suivie et sa
 * vraisemblance n'a pas bougé.
 */
export function repereDeRevision(versions: ScenarioVersion[], v: ScenarioVersion): RepereRevision | null {
  const prev = versionPrecedente(versions, v);
  if (!prev) return { type: "premiere" };
  if (!v.likelihoodChangedFrom) return null;
  return { type: "revision", avant: v.likelihoodChangedFrom, semaine: semaineDeNote(prev.noteSlug) };
}
