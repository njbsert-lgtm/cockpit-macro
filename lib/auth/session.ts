import "server-only";

import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/http";
import { readClientCredentials } from "@/lib/supabase";
import { contournementLocal, estAdmin } from "./regles";

/**
 * La session administrateur, côté serveur uniquement.
 *
 * La session vit dans un cookie `httpOnly` posé par `@supabase/ssr` : le navigateur ne voit
 * jamais ni la clé anonyme ni le jeton. C'est pourquoi aucune variable `NEXT_PUBLIC_` n'est
 * nécessaire — et pourquoi il n'en faut pas : la clé anonyme lit `brouillons_contexte` et
 * `redaction_decisions`, l'embarquer dans le bundle ouvrirait les brouillons à qui la lit.
 *
 * **Échec fermé.** Base non configurée, Supabase injoignable, jeton expiré ou refusé : tout
 * se lit comme « pas de session ». Le doute ne bénéficie jamais à l'appelant.
 */

const AUTH_TIMEOUT_MS = 8_000;

/**
 * Le client Supabase de la requête en cours, branché sur ses cookies. `null` si la base n'est
 * pas configurée.
 *
 * Dans une page, Next interdit d'écrire un cookie : l'écriture échoue en silence, et c'est
 * sans conséquence — le middleware, qui passe avant chaque route protégée, rafraîchit la
 * session. Dans une Server Action ou une route, l'écriture passe.
 */
export async function clientSession(): Promise<SupabaseClient | null> {
  const identifiants = readClientCredentials();
  if (!identifiants) return null;
  const magasin = await cookies();

  return createServerClient(identifiants.url, identifiants.key, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (aPoser) => {
        try {
          for (const { name, value, options } of aPoser) magasin.set(name, value, options);
        } catch {
          // Rendu d'une page : écriture interdite, le middleware s'en charge.
        }
      },
    },
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetchWithTimeout(String(url), { ...init, timeoutMs: AUTH_TIMEOUT_MS }),
    },
  });
}

export type SessionAdmin = { email: string | null; via: "session" | "contournement" };

/**
 * L'administrateur de la requête en cours, ou `null`.
 *
 * `getUser` et non `getSession` : le second se contente de décoder le cookie, que le client
 * peut forger ; le premier fait valider le jeton par le serveur d'authentification.
 */
export async function sessionAdmin(): Promise<SessionAdmin | null> {
  const entetes = await headers();
  if (contournementLocal(process.env, entetes.get("host"))) {
    return { email: null, via: "contournement" };
  }

  try {
    const client = await clientSession();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error || !estAdmin(data.user)) return null;
    return { email: data.user?.email ?? null, via: "session" };
  } catch {
    return null;
  }
}

/** Garde d'une page ou d'un layout : sans administrateur, le même 404 qu'une adresse inconnue. */
export async function exigerAdminPage(): Promise<SessionAdmin> {
  const session = await sessionAdmin();
  if (!session) notFound();
  return session;
}

/**
 * Garde d'une Server Action. Next rend chaque action exportée appelable par un POST direct,
 * sans passer par la page ni par le middleware : la garde doit donc être dans l'action, en
 * première ligne, avant toute lecture du formulaire et toute écriture.
 */
export async function exigerAdminAction(): Promise<SessionAdmin> {
  const session = await sessionAdmin();
  if (!session) throw new Error("Non autorisé");
  return session;
}
