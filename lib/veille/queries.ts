import type { VeilleItem, VeilleChannel, Zone } from "@/lib/types";
import { getReadClient } from "@/lib/supabase";
import { isMinorEdgarItem } from "./sources/edgar";

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

const SELECT_COLUMNS =
  "id, title, url, source, published_at, zones, driver_refs, channels, is_signal, status, attached_to_block, draft_note_slug";

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
      .select(SELECT_COLUMNS)
      .eq("status", "nouveau")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    // Les dépôts mineurs ne sont plus collectés mais vieillissent jusqu'à la purge : on les
    // masque de la file plutôt que de les laisser encombrer le tri pendant quinze jours.
    return (data as Row[]).map(fromRow).filter((i) => !isMinorEdgarItem(i.source, i.title));
  } catch {
    return [];
  }
}

/**
 * Les items cités par une note (`Note.veilleItemRefs`), pour les pastilles de preuve et le
 * fil de la semaine. Une note reste analytique et lisible même si la base est injoignable ou
 * qu'un item a été purgé (au-delà de quinze jours) : les identifiants qui ne résolvent pas
 * sont simplement absents du résultat, jamais une erreur de rendu.
 */
export async function getVeilleItemsByIds(ids: string[]): Promise<VeilleItem[]> {
  if (ids.length === 0) return [];
  const client = getReadClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from("veille_items").select(SELECT_COLUMNS).in("id", ids);
    if (error || !data) return [];
    return (data as Row[]).map(fromRow);
  } catch {
    return [];
  }
}

/**
 * Le compteur affiché sur le bouton de l'onglet Notes. Il lit source et titre plutôt qu'un
 * `count` seul : il doit ignorer les dépôts mineurs masqués de la file, et un compteur qui
 * compterait ce que la file ne montre pas mentirait.
 */
export async function getPendingVeilleCount(): Promise<number> {
  const client = getReadClient();
  if (!client) return 0;

  try {
    const { data, error } = await client
      .from("veille_items")
      .select("source, title")
      .eq("status", "nouveau");
    if (error || !data) return 0;
    return (data as Array<{ source: string; title: string }>).filter(
      (r) => !isMinorEdgarItem(r.source, r.title),
    ).length;
  } catch {
    return 0;
  }
}
