"use server";

import { exigerAdminAction } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/lib/supabase";
import { cloreDecision } from "@/lib/admin/decisions";

/**
 * Les deux actions de `/admin/decisions`, une décision à la fois : il n'existe aucune action qui
 * en tranche plusieurs. Clé de service, côté serveur uniquement.
 */

const ID = /^[A-Za-z0-9._-]{1,40}$/;

function champ(formData: FormData, nom: string): string {
  const v = formData.get(nom);
  return typeof v === "string" ? v.trim() : "";
}

async function clore(id: string, statut: "tranchee" | "abandonnee", reponse: string | null): Promise<void> {
  if (!ID.test(id)) throw new Error("identifiant de décision invalide");
  const client = getWriteClient();
  if (!client) throw new Error("Supabase n'est pas configuré côté écriture");
  await cloreDecision(client, id, statut, reponse);
  revalidatePath("/admin/decisions");
}

/** Enregistre la réponse de Nicolas. Une réponse vide est refusée : trancher, c'est écrire. */
export async function trancherDecision(id: string, formData: FormData): Promise<void> {
  await exigerAdminAction();
  const reponse = champ(formData, "reponse");
  if (!reponse) throw new Error("la réponse est requise");
  await clore(id, "tranchee", reponse);
}

/** Abandonne une décision devenue sans objet ; le motif est facultatif. */
export async function abandonnerDecision(id: string, formData: FormData): Promise<void> {
  await exigerAdminAction();
  await clore(id, "abandonnee", champ(formData, "motif") || null);
}
