"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWriteClient } from "@/lib/supabase";
import { REQUIRED_BLOCKS, type BlockName } from "@/lib/notes";

/**
 * Les trois actions de `/triage`, en Server Actions : elles écrivent avec la clé de service,
 * côté serveur uniquement — jamais depuis le navigateur, qui ne porte que la clé anonyme.
 */

const ANALYTICAL_BLOCKS = new Set<BlockName>(REQUIRED_BLOCKS.hebdo);

function writeClient(): SupabaseClient {
  const client = getWriteClient();
  if (!client) throw new Error("Supabase n'est pas configuré côté écriture");
  return client;
}

function revalidateAfterAction(): void {
  revalidatePath("/triage");
  revalidatePath("/");
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Verse un item dans l'un des cinq blocs analytiques de la note en préparation. */
export async function verserItem(itemId: string, formData: FormData): Promise<void> {
  const block = stringField(formData, "block");
  const draftNoteSlug = stringField(formData, "draftNoteSlug");

  if (!ANALYTICAL_BLOCKS.has(block as BlockName)) {
    throw new Error(`bloc analytique inconnu : « ${block} »`);
  }
  if (!draftNoteSlug) {
    throw new Error("le slug de la note en préparation est requis");
  }

  await writeClient()
    .from("veille_items")
    .update({ status: "verse", attached_to_block: block, draft_note_slug: draftNoteSlug })
    .eq("id", itemId);

  revalidateAfterAction();
}

export async function archiverItem(itemId: string): Promise<void> {
  await writeClient().from("veille_items").update({ status: "archive" }).eq("id", itemId);
  revalidateAfterAction();
}

export async function ignorerItem(itemId: string): Promise<void> {
  await writeClient().from("veille_items").update({ status: "ignore" }).eq("id", itemId);
  revalidateAfterAction();
}
