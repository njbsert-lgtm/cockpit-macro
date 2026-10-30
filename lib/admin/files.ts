import "server-only";

import { getFreshReadClient } from "@/lib/supabase";
import { isMinorEdgarItem } from "@/lib/veille/sources/edgar";
import { brouillonsDisponibles } from "@/lib/redaction/portail";

/**
 * Les comptes des files d'attente de l'accueil `/admin`. Lecture seule.
 *
 * `null` veut dire « illisible », jamais zéro : `getPendingVeilleItems` renvoie une liste vide
 * quand la base est injoignable, ce qui ferait afficher « 0 » à tort. Ici la différence se voit.
 */
export type Compte = number | null;

export async function compterItemsATrier(): Promise<Compte> {
  const client = getFreshReadClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from("veille_items").select("source, title").eq("status", "nouveau");
    if (error || !data) return null;
    // Même filtre que la file de /triage : les dépôts mineurs en sont masqués.
    return (data as Array<{ source: string; title: string }>).filter(
      (i) => !isMinorEdgarItem(i.source, i.title),
    ).length;
  } catch {
    return null;
  }
}

export function compterBrouillons(): Compte {
  try {
    return brouillonsDisponibles().length;
  } catch {
    return null;
  }
}
