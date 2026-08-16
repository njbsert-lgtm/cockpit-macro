import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Deux clients, deux droits.
 *
 * - Lecture : clé anonyme, bornée par les politiques RLS de `supabase/schema.sql`.
 * - Écriture : clé de service, réservée au cron. Elle vit côté serveur uniquement et n'est
 *   jamais préfixée `NEXT_PUBLIC_`, donc jamais servie au navigateur.
 *
 * Les deux fonctions renvoient `null` quand la configuration manque, au lieu de lever. C'est
 * ce qui permet au site de tourner sans base du tout — en développement, au premier
 * déploiement, ou si Supabase est injoignable : `lib/observations.ts` retombe alors sur
 * `data/seed.json` et l'interface reste utilisable.
 */

let readClient: SupabaseClient | null | undefined;
let writeClient: SupabaseClient | null | undefined;

export function getReadClient(): SupabaseClient | null {
  if (readClient !== undefined) return readClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  readClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return readClient;
}

export function getWriteClient(): SupabaseClient | null {
  if (writeClient !== undefined) return writeClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  writeClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return writeClient;
}

/** La base est-elle configurée ? Sert à choisir entre la base et le seed sans lever. */
export function isDatabaseConfigured(): boolean {
  return getReadClient() !== null;
}

/** Remise à zéro des clients mémoïsés — pour les tests, qui changent l'environnement. */
export function resetClientsForTests(): void {
  readClient = undefined;
  writeClient = undefined;
}
