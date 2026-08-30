import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resetClientsForTests } from "@/lib/supabase";
import { chargerDecisions, sauvegarderDecision } from "./decisions-store";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

beforeEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("sauvegarderDecision — best-effort, jamais fatal", () => {
  it("échoue proprement quand Supabase n'est pas configuré, sans lever", async () => {
    const resultat = await sauvegarderDecision("2026-S36", "bloc", "CeQuiAChange", {
      authorship: "ia-relue",
      texte: "…",
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("non configuré");
  });
});

describe("chargerDecisions — dégrade sur base absente", () => {
  it("renvoie un état vide quand Supabase n'est pas configuré", async () => {
    expect(await chargerDecisions("2026-S36")).toEqual({
      blocs: {},
      guets: {},
      revisions: {},
      tendances: {},
    });
  });
});
