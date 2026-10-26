import "server-only";

import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { ROUTE_CONFIRMATION, estAdmin } from "./regles";

/**
 * Le lien magique : l'envoi, puis la confirmation. Un seul compte, aucune inscription.
 *
 * **L'écran ne dit jamais si l'adresse est connue.** `shouldCreateUser: false` fait refuser par
 * Supabase une adresse inconnue ; ce refus se lit exactement comme un envoi réussi. Seule une
 * panne de service — base non configurée, Supabase injoignable — produit un message d'erreur :
 * elle ne dit rien de l'adresse, et la taire laisserait attendre un e-mail qui ne viendra pas.
 */

export type IssueEnvoi = "envoye" | "invalide" | "erreur";

const FORME_ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Une panne, et non un refus : pas de statut HTTP (réseau), ou une erreur serveur. */
function estPanne(erreur: { status?: number } | null): boolean {
  if (!erreur) return false;
  return !erreur.status || erreur.status >= 500;
}

export async function envoyerLien(
  client: SupabaseClient | null,
  adresse: string,
  origine: string,
): Promise<IssueEnvoi> {
  const email = adresse.trim().toLowerCase();
  if (!FORME_ADRESSE.test(email)) return "invalide";
  if (!client) return "erreur";

  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${origine}${ROUTE_CONFIRMATION}` },
    });
    return estPanne(error) ? "erreur" : "envoye";
  } catch {
    return "erreur";
  }
}

const TYPES_OTP = new Set<EmailOtpType>(["email", "magiclink"]);

/**
 * Ouvre la session depuis le lien reçu. Deux formes de lien sont acceptées :
 *
 * - `?token_hash=…&type=email`, celle du gabarit d'e-mail recommandé — elle fonctionne quel que
 *   soit le navigateur qui ouvre le lien ;
 * - `?code=…`, celle du gabarit par défaut de Supabase (PKCE) — elle exige d'ouvrir le lien
 *   dans le navigateur qui l'a demandé, parce que la preuve de l'échange y est restée en cookie.
 *
 * Une session ouverte pour un compte qui n'est pas administrateur est refermée aussitôt :
 * aucune session inutile ne reste en cookie.
 */
export async function confirmerLien(
  client: SupabaseClient | null,
  parametres: URLSearchParams,
): Promise<boolean> {
  if (!client) return false;

  try {
    const tokenHash = parametres.get("token_hash");
    const type = parametres.get("type") as EmailOtpType | null;
    const code = parametres.get("code");

    let erreur: unknown;
    if (tokenHash && type && TYPES_OTP.has(type)) {
      ({ error: erreur } = await client.auth.verifyOtp({ token_hash: tokenHash, type }));
    } else if (code) {
      ({ error: erreur } = await client.auth.exchangeCodeForSession(code));
    } else {
      return false;
    }
    if (erreur) return false;

    const { data, error } = await client.auth.getUser();
    if (error || !estAdmin(data.user)) {
      await client.auth.signOut();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
