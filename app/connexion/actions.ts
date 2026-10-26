"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { envoyerLien } from "@/lib/auth/connexion";
import { clientSession } from "@/lib/auth/session";
import { ROUTE_CONNEXION } from "@/lib/auth/regles";

/**
 * L'origine du site, pour l'adresse de retour du lien. `SITE_URL` l'emporte quand elle est
 * posée ; sinon l'hôte de la requête. Une origine forgée ne mène nulle part : Supabase refuse
 * toute adresse de retour absente de sa liste « Redirect URLs ».
 */
async function origine(): Promise<string> {
  const fixe = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fixe) return fixe;
  const entetes = await headers();
  const hote = entetes.get("x-forwarded-host") ?? entetes.get("host") ?? "localhost:3000";
  const protocole = entetes.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}

export async function demanderLien(formData: FormData): Promise<void> {
  const adresse = formData.get("email");
  const issue = await envoyerLien(
    await clientSession(),
    typeof adresse === "string" ? adresse : "",
    await origine(),
  );
  redirect(`${ROUTE_CONNEXION}?etat=${issue}`);
}

export async function seDeconnecter(): Promise<void> {
  const client = await clientSession();
  try {
    await client?.auth.signOut();
  } catch {
    // Supabase injoignable : le cookie reste, mais il expirera. Rien à dire de plus à l'écran.
  }
  redirect("/");
}
