import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * L'état d'avancement d'une collecte qui se découpe en plusieurs passages — aujourd'hui, GDELT
 * uniquement. `position` est un index dans une liste de requêtes ordonnée de façon stable côté
 * appelant (`buildGdeltQueries`) ; ce module ne connaît que l'entier.
 */

export async function readCursor(client: SupabaseClient, source: string): Promise<number> {
  const { data } = await client
    .from("veille_cursor")
    .select("position")
    .eq("source", source)
    .maybeSingle();
  return (data as { position: number } | null)?.position ?? 0;
}

export async function writeCursor(client: SupabaseClient, source: string, position: number): Promise<void> {
  await client
    .from("veille_cursor")
    .upsert({ source, position, updated_at: new Date().toISOString() }, { onConflict: "source" });
}
