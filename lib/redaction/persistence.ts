import { getReadClient, getWriteClient } from "@/lib/supabase";
import type { ContextePaquet } from "./context";

/**
 * Le paquet de contexte est persisté au moment de la rédaction, pour que le portail puisse
 * re-contrôler les chiffres après une édition humaine contre **la même pièce de comparaison**
 * qu'au moment de la rédaction — pas une reconstruction qui aurait dérivé si les données ont
 * été recollectées depuis.
 *
 * Best-effort, comme le reste des écritures Supabase du dépôt : Supabase absent ou injoignable
 * ne doit jamais faire échouer un run de rédaction. Le brouillon reste écrit sur le disque ;
 * seul le re-contrôle après édition dans le portail serait indisponible, et c'est visible là
 * où ça compte, pas ici.
 */

export async function sauvegarderContexte(
  slug: string,
  paquet: ContextePaquet,
): Promise<{ ok: boolean; erreur?: string }> {
  const client = getWriteClient();
  if (!client) return { ok: false, erreur: "Supabase non configuré côté écriture" };

  const { error } = await client
    .from("brouillons_contexte")
    .upsert({ note_slug: slug, paquet }, { onConflict: "note_slug" });

  if (error) return { ok: false, erreur: error.message };
  return { ok: true };
}

export async function chargerContexte(slug: string): Promise<ContextePaquet | null> {
  const client = getReadClient();
  if (!client) return null;

  const { data, error } = await client
    .from("brouillons_contexte")
    .select("paquet")
    .eq("note_slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data.paquet as ContextePaquet;
}
