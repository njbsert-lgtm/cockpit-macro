import { describe, expect, it } from "vitest";
import { normalizedSupabaseUrl, resetClientsForTests } from "./supabase";

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
