import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Deux clients, deux droits.
 *
 * - Lecture : clé publique, bornée par les politiques RLS de `supabase/schema.sql`.
 * - Écriture : clé de service, réservée au cron.
 *
 * **Aucun des deux n'est jamais servi au navigateur.** Tout ce qui lit Supabase est du code
 * serveur — pages, Server Actions, route de cron —, donc le préfixe `NEXT_PUBLIC_` n'a pas
 * lieu d'être : il ne ferait qu'embarquer l'URL et la clé dans le bundle client sans que
 * personne ne les y utilise. Les noms préfixés restent acceptés pour ne rien casser d'un
 * déploiement existant, mais `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont la forme à retenir.
 *
 * Les deux fonctions renvoient `null` quand la configuration manque, au lieu de lever. C'est
 * ce qui permet au site de tourner sans base du tout — en développement, au premier
 * déploiement, ou si Supabase est injoignable : `lib/observations.ts` retombe alors sur
 * `data/seed.json` et l'interface reste utilisable.
 */

let readClient: SupabaseClient | null | undefined;
let writeClient: SupabaseClient | null | undefined;

/** Le premier nom renseigné l'emporte : la forme courte d'abord, la préfixée en repli. */
function firstDefined(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

function supabaseUrl(): string | undefined {
  return firstDefined("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

export function getReadClient(): SupabaseClient | null {
  if (readClient !== undefined) return readClient;

  const url = supabaseUrl();
  // `SUPABASE_PUBLISHABLE_KEY` : le nom que Supabase donne désormais à la clé anonyme sur les
  // projets récents. Les deux désignent la même chose, une clé de lecture bornée par RLS.
  const key = firstDefined(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  readClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return readClient;
}

export function getWriteClient(): SupabaseClient | null {
  if (writeClient !== undefined) return writeClient;

  const url = supabaseUrl();
  const key = firstDefined("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  writeClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return writeClient;
}

/**
 * Ce qui manque pour que la base soit joignable, en clair. Sert au diagnostic : une
 * configuration incomplète doit se lire, pas se deviner.
 */
export function missingSupabaseConfig(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl()) missing.push("SUPABASE_URL");
  if (!getReadClient()) missing.push("SUPABASE_ANON_KEY");
  if (!getWriteClient()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
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
