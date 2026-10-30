import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWriteClient } from "@/lib/supabase";

/**
 * La file « À trancher » (J2.6). La table `decisions` n'est lisible que par la clé de service :
 * RLS activé, aucune politique, privilèges retirés à la clé anonyme. Tout passe donc par
 * `getWriteClient`, côté serveur.
 *
 * Trois états de lecture, jamais confondus : `ok` (y compris vide), `absente` (la migration n'est
 * pas appliquée — un état à nommer, pas une erreur) et `illisible` (base non configurée ou en
 * échec). Aucun ne se lit « zéro décision ».
 */

export type StatutDecision = "ouverte" | "tranchee" | "abandonnee";

export type Decision = {
  id: string;
  question: string;
  recommandation: string | null;
  bloque: string[];
  statut: StatutDecision;
  reponse: string | null;
  trancheeLe: string | null;
  createdAt: string;
};

export type LectureDecisions =
  | { etat: "ok"; ouvertes: Decision[]; closes: Decision[] }
  | { etat: "absente" }
  | { etat: "illisible"; cause: string };

type Ligne = {
  id: string;
  question: string;
  recommandation: string | null;
  bloque: string[] | null;
  statut: string;
  reponse: string | null;
  tranchee_le: string | null;
  created_at: string;
};

/** PostgREST : `PGRST205` (absente du cache de schéma) ; Postgres : `42P01` (relation inconnue). */
export function tableAbsente(erreur: { code?: string; message?: string } | null): boolean {
  if (!erreur) return false;
  if (erreur.code === "PGRST205" || erreur.code === "42P01") return true;
  return /could not find the table|relation .* does not exist/i.test(erreur.message ?? "");
}

function versDecision(l: Ligne): Decision {
  return {
    id: l.id,
    question: l.question,
    recommandation: l.recommandation,
    bloque: Array.isArray(l.bloque) ? l.bloque : [],
    statut: l.statut === "tranchee" || l.statut === "abandonnee" ? l.statut : "ouverte",
    reponse: l.reponse,
    trancheeLe: l.tranchee_le,
    createdAt: l.created_at,
  };
}

export async function lireDecisions(
  client: SupabaseClient | null = getWriteClient(),
): Promise<LectureDecisions> {
  if (!client) return { etat: "illisible", cause: "Supabase n'est pas configuré côté serveur." };
  try {
    const { data, error } = await client
      .from("decisions")
      .select("id, question, recommandation, bloque, statut, reponse, tranchee_le, created_at")
      .order("created_at", { ascending: true });
    if (tableAbsente(error)) return { etat: "absente" };
    if (error || !data) return { etat: "illisible", cause: error?.message ?? "Réponse vide de la base." };
    const toutes = (data as Ligne[]).map(versDecision);
    const ouvertes = toutes.filter((d) => d.statut === "ouverte");
    const closes = toutes
      .filter((d) => d.statut !== "ouverte")
      .sort((a, b) => (b.trancheeLe ?? b.createdAt).localeCompare(a.trancheeLe ?? a.createdAt));
    return { etat: "ok", ouvertes, closes };
  } catch (e) {
    return { etat: "illisible", cause: e instanceof Error ? e.message : "Lecture impossible." };
  }
}

/**
 * Clôt une décision encore ouverte. Le filtre `statut = 'ouverte'` empêche de réécrire une
 * décision déjà prise (double clic, deux onglets) : la première réponse reste la bonne.
 * Renvoie `false` si aucune ligne n'a été touchée.
 */
export async function cloreDecision(
  client: SupabaseClient,
  id: string,
  statut: "tranchee" | "abandonnee",
  reponse: string | null,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const { data, error } = await client
    .from("decisions")
    .update({ statut, reponse, tranchee_le: maintenant.toISOString(), updated_at: maintenant.toISOString() })
    .eq("id", id)
    .eq("statut", "ouverte")
    .select("id");
  if (tableAbsente(error)) throw new Error("La table « decisions » n'existe pas encore dans Supabase.");
  if (error) throw new Error(`Écriture refusée : ${error.message}`);
  return (data?.length ?? 0) > 0;
}
