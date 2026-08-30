import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resetClientsForTests } from "@/lib/supabase";
import { chargerContexte, sauvegarderContexte } from "./persistence";
import type { ContextePaquet } from "./context";

function paquet(): ContextePaquet {
  return {
    noteType: "hebdo",
    slug: "2026-S36",
    isoWeek: "2026-S36",
    date: "2026-09-05",
    comparesTo: null,
    specialesDeLaSemaine: [],
    notePrecedente: null,
    observations: [],
    itemsVeille: [],
    scenariosCourants: [],
    tendancesCourantes: [],
    guetsOuverts: [],
    guetsExpires: [],
    budgetGuets: 3,
    echeancesSemaine: [],
    trigger: null,
  };
}

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

beforeEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("sauvegarderContexte — best-effort, jamais fatal", () => {
  it("échoue proprement quand Supabase n'est pas configuré, sans lever", async () => {
    const resultat = await sauvegarderContexte("2026-S36", paquet());
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("non configuré");
  });
});

describe("chargerContexte — dégrade sur base absente", () => {
  it("renvoie null quand Supabase n'est pas configuré", async () => {
    expect(await chargerContexte("2026-S36")).toBeNull();
  });
});
