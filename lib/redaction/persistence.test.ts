import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resetClientsForTests } from "@/lib/supabase";
import { chargerEtatBrouillon, sauvegarderEtatBrouillon } from "./persistence";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";

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

function brouillon(): Brouillon {
  return {
    regimeStatement: "Un régime.",
    keyIndicators: [{ label: "a", value: "b" }],
    channels: ["taux-reel"],
    driverOrder: ["rates"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: {},
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [],
    driverCandidate: null,
    redactionNotes: "",
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

describe("sauvegarderEtatBrouillon — best-effort, jamais fatal", () => {
  it("échoue proprement quand Supabase n'est pas configuré, sans lever", async () => {
    const resultat = await sauvegarderEtatBrouillon("2026-S36", paquet(), brouillon());
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("non configuré");
  });
});

describe("chargerEtatBrouillon — dégrade sur base absente", () => {
  it("renvoie null quand Supabase n'est pas configuré", async () => {
    expect(await chargerEtatBrouillon("2026-S36")).toBeNull();
  });
});
