import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./http";

/**
 * Les appels à Supabase sont bornés au même titre que ceux vers les APIs publiques.
 *
 * `supabase-js` s'appuie sur `fetch`, qui n'a pas de délai maximal : une base injoignable — URL
 * erronée, projet en pause, réseau coupé — ne renvoie pas d'erreur, elle **ne répond jamais**.
 * Dans la route de cron, la toute première écriture suspendait alors le passage entier jusqu'à
 * ce que la plateforme le coupe : un 504, aucune ligne écrite, et aucune trace de la cause.
 *
 * Avec ce délai, une base injoignable devient une erreur nommée, journalisée, et le rapport
 * part quand même.
 */
const SUPABASE_TIMEOUT_MS = 10_000;

const options = {
  auth: { persistSession: false },
  global: {
    fetch: (url: RequestInfo | URL, init?: RequestInit) =>
      fetchWithTimeout(String(url), { ...init, timeoutMs: SUPABASE_TIMEOUT_MS }),
  },
} as const;

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

/**
 * Le premier nom renseigné l'emporte : la forme courte d'abord, la préfixée en repli.
 *
 * La valeur est **rognée**. Un copier-coller depuis un tableau de bord embarque volontiers une
 * espace ou un retour à la ligne, invisibles dans un champ de formulaire, et une clé ainsi
 * altérée produit un 401 impossible à distinguer d'une mauvaise clé. Ce n'est jamais
 * intentionnel : personne ne met délibérément une espace au bout d'un jeton.
 */
function firstDefined(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * L'adresse du projet, ramenée à son origine.
 *
 * Le tableau de bord Supabase présente le « RESTful endpoint » sous la forme
 * `https://xxx.supabase.co/rest/v1`, alors que `supabase-js` ajoute ce chemin lui-même : coller
 * l'adresse telle qu'affichée produit `/rest/v1/rest/v1` et un refus poli du serveur. La
 * confusion vient de la source, pas de l'utilisateur, et rien ne se perd à la corriger — le
 * client n'a jamais besoin que de l'origine.
 *
 * On ne retire que ce chemin-là, et les barres obliques finales. Un chemin inattendu est laissé
 * tel quel : le rogner reviendrait à deviner, et `/diagnostic` le signale.
 */
export function normalizedSupabaseUrl(): string | undefined {
  const raw = firstDefined("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

export function getReadClient(): SupabaseClient | null {
  if (readClient !== undefined) return readClient;

  const url = normalizedSupabaseUrl();
  // `SUPABASE_PUBLISHABLE_KEY` : le nom que Supabase donne désormais à la clé anonyme sur les
  // projets récents. Les deux désignent la même chose, une clé de lecture bornée par RLS.
  const key = firstDefined(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  readClient =
    url && key
      ? createClient(url, key, options)
      : null;
  return readClient;
}

export function getWriteClient(): SupabaseClient | null {
  if (writeClient !== undefined) return writeClient;

  const url = normalizedSupabaseUrl();
  const key = firstDefined("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  writeClient =
    url && key
      ? createClient(url, key, options)
      : null;
  return writeClient;
}

/**
 * Ce qui manque pour que la base soit joignable, en clair. Sert au diagnostic : une
 * configuration incomplète doit se lire, pas se deviner.
 */
export function missingSupabaseConfig(): string[] {
  const missing: string[] = [];
  if (!normalizedSupabaseUrl()) missing.push("SUPABASE_URL");
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
