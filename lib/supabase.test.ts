import { describe, expect, it } from "vitest";
import { getFreshReadClient, getReadClient, normalizedSupabaseUrl, resetClientsForTests } from "./supabase";

describe("supabaseUrl — normalisation de l'adresse", () => {
  const cas: Array<[string, string]> = [
    ["https://abc.supabase.co", "https://abc.supabase.co"],
    ["https://abc.supabase.co/", "https://abc.supabase.co"],
    // Ce que le tableau de bord Supabase affiche comme « RESTful endpoint » : `supabase-js`
    // ajoute déjà ce chemin, le garder produit /rest/v1/rest/v1 et un refus du serveur.
    ["https://abc.supabase.co/rest/v1", "https://abc.supabase.co"],
    ["https://abc.supabase.co/rest/v1/", "https://abc.supabase.co"],
    ["  https://abc.supabase.co\n", "https://abc.supabase.co"],
  ];

  it.each(cas)("ramène « %s » à l'origine", (saisie, attendu) => {
    const avant = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = saisie;
    resetClientsForTests();
    try {
      expect(normalizedSupabaseUrl()).toBe(attendu);
    } finally {
      if (avant === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = avant;
      resetClientsForTests();
    }
  });
});

describe("getFreshReadClient — jamais intercepté par le cache HTTP", () => {
  it("porte cache: no-store sur chaque appel, contrairement à getReadClient", async () => {
    // Bug réel constaté le 29/09 : l'indicateur de fraîcheur passait par `getReadClient`, dont
    // les requêtes sont de simples `fetch` — interceptées par le cache de Next.js sur toute page
    // rendue statiquement (`export const revalidate` du layout racine). `revalidatePath` dans la
    // route de cron ne couvre que `/`, `/marches` et `/macro` : toute autre page gardait sa
    // propre capture, parfois vieille de plusieurs jours. L'indicateur a sa propre raison d'être
    // — dire si la collecte tourne — qui ne doit jamais dépendre d'une page précise.
    const avantUrl = process.env.SUPABASE_URL;
    const avantKey = process.env.SUPABASE_ANON_KEY;
    const avantFetch = global.fetch;
    process.env.SUPABASE_URL = "https://exemple.supabase.co";
    process.env.SUPABASE_ANON_KEY = "clé-de-test";
    resetClientsForTests();

    const inits: Array<RequestInit | undefined> = [];
    global.fetch = ((...args: Parameters<typeof fetch>) => {
      inits.push(args[1]);
      return Promise.resolve(
        new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
      );
    }) as typeof fetch;

    try {
      await getReadClient()!.from("series_health").select("*");
      await getFreshReadClient()!.from("series_health").select("*");

      expect(inits).toHaveLength(2);
      expect(inits[0]?.cache).toBeUndefined();
      expect(inits[1]?.cache).toBe("no-store");
    } finally {
      global.fetch = avantFetch;
      if (avantUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = avantUrl;
      if (avantKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = avantKey;
      resetClientsForTests();
    }
  });
});
