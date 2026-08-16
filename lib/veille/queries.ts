import type { VeilleItem, VeilleChannel, Zone } from "@/lib/types";
import { getReadClient } from "@/lib/supabase";

/**
 * La lecture de `/triage`. Pas d'équivalent seed pour la veille — c'est une file, pas une
 * série de repli : base non configurée ou injoignable renvoie une file vide, pas une erreur.
 */

type Row = {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  zones: Zone[];
  driver_refs: string[];
  channels: VeilleChannel[];
  is_signal: boolean;
  status: VeilleItem["status"];
  attached_to_block: string | null;
  draft_note_slug: string | null;
};

function fromRow(row: Row): VeilleItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    publishedAt: row.published_at,
    zones: row.zones,
    driverRefs: row.driver_refs,
    channels: row.channels,
    isSignal: row.is_signal,
    status: row.status,
    attachedToBlock: row.attached_to_block,
    draftNoteSlug: row.draft_note_slug,
  };
}

/** Les items en attente de tri (`status: 'nouveau'`), du plus récent au plus ancien. */
export async function getPendingVeilleItems(): Promise<VeilleItem[]> {
  const client = getReadClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("veille_items")
      .select(
        "id, title, url, source, published_at, zones, driver_refs, channels, is_signal, status, attached_to_block, draft_note_slug",
      )
      .eq("status", "nouveau")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return (data as Row[]).map(fromRow);
  } catch {
    return [];
  }
}

/** Le compteur affiché sur le bouton de l'onglet Notes — une requête `count` seule, sans corps. */
export async function getPendingVeilleCount(): Promise<number> {
  const client = getReadClient();
  if (!client) return 0;

  try {
    const { count, error } = await client
      .from("veille_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "nouveau");
    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}
