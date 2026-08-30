import { getReadClient, getWriteClient } from "@/lib/supabase";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";

/**
 * Le paquet de contexte et la sortie structurée du modèle sont persistés au moment de la
 * rédaction, côte à côte.
 *
 * Le paquet est la pièce de comparaison pour re-contrôler les chiffres après une édition
 * humaine — elle doit rester celle du jour de la rédaction, pas une reconstruction qui aurait
 * dérivé si les données ont été recollectées depuis.
 *
 * Le `Brouillon` complet est nécessaire pour une autre raison : `rendreMdx` n'écrit dans le
 * fichier que les guets et les blocs rédigés. Les révisions de scénario, les changements de
 * statut de tendance et le driver candidat que le modèle propose n'ont sinon aucune trace au-
 * delà de la durée du run — sans cette persistance, le portail n'aurait rien à présenter pour
 * « accepter ou refuser explicitement » ces propositions.
 *
 * Best-effort, comme le reste des écritures Supabase du dépôt : Supabase absent ou injoignable
 * ne doit jamais faire échouer un run de rédaction. Le brouillon reste écrit sur le disque ;
 * seuls le re-contrôle après édition et les propositions seraient indisponibles dans le
 * portail, et c'est visible là où ça compte, pas ici.
 */

export type EtatBrouillon = { paquet: ContextePaquet; brouillon: Brouillon };

export async function sauvegarderEtatBrouillon(
  slug: string,
  paquet: ContextePaquet,
  brouillon: Brouillon,
): Promise<{ ok: boolean; erreur?: string }> {
  const client = getWriteClient();
  if (!client) return { ok: false, erreur: "Supabase non configuré côté écriture" };

  const { error } = await client
    .from("brouillons_contexte")
    .upsert({ note_slug: slug, paquet, brouillon }, { onConflict: "note_slug" });

  if (error) return { ok: false, erreur: error.message };
  return { ok: true };
}

export async function chargerEtatBrouillon(slug: string): Promise<EtatBrouillon | null> {
  const client = getReadClient();
  if (!client) return null;

  const { data, error } = await client
    .from("brouillons_contexte")
    .select("paquet, brouillon")
    .eq("note_slug", slug)
    .maybeSingle();

  if (error || !data || !data.brouillon) return null;
  return { paquet: data.paquet as ContextePaquet, brouillon: data.brouillon as Brouillon };
}
