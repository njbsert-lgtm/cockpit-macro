import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
import { cloreDecision, lireDecisions, tableAbsente } from "./decisions";

const ligne = (o: Record<string, unknown>) => ({
  id: "J3.3",
  question: "Q ?",
  recommandation: null,
  bloque: ["J3.3"],
  statut: "ouverte",
  reponse: null,
  tranchee_le: null,
  created_at: "2026-10-30T10:00:00Z",
  ...o,
});

type Erreur = { code?: string; message?: string } | null;

function lecteur(resultat: { data?: unknown; error?: Erreur }) {
  const chaine = {
    select: () => chaine,
    order: async () => ({ data: null, error: null, ...resultat }),
  };
  return { from: () => chaine } as unknown as SupabaseClient;
}

describe("lireDecisions", () => {
  it("sans client : illisible, jamais une liste vide", async () => {
    expect((await lireDecisions(null)).etat).toBe("illisible");
  });

  it("table absente (PostgREST ou Postgres) : état « absente », pas une erreur", async () => {
    expect(await lireDecisions(lecteur({ error: { code: "PGRST205", message: "x" } }))).toEqual({
      etat: "absente",
    });
    expect(await lireDecisions(lecteur({ error: { code: "42P01" } }))).toEqual({ etat: "absente" });
    expect(
      tableAbsente({ message: "Could not find the table 'public.decisions' in the schema cache" }),
    ).toBe(true);
  });

  it("autre erreur : illisible", async () => {
    const r = await lireDecisions(lecteur({ error: { code: "42501", message: "permission denied" } }));
    expect(r.etat).toBe("illisible");
  });

  it("table vide : ok avec deux listes vides", async () => {
    expect(await lireDecisions(lecteur({ data: [] }))).toEqual({ etat: "ok", ouvertes: [], closes: [] });
  });

  it("sépare les ouvertes de l'historique, le plus récent d'abord", async () => {
    const r = await lireDecisions(
      lecteur({
        data: [
          ligne({ id: "A" }),
          ligne({ id: "B", statut: "tranchee", tranchee_le: "2026-10-28T00:00:00Z" }),
          ligne({ id: "C", statut: "abandonnee", tranchee_le: "2026-10-29T00:00:00Z" }),
        ],
      }),
    );
    expect(r.etat === "ok" && r.ouvertes.map((d) => d.id)).toEqual(["A"]);
    expect(r.etat === "ok" && r.closes.map((d) => d.id)).toEqual(["C", "B"]);
  });
});

describe("cloreDecision", () => {
  function ecrivain(res: { data?: unknown; error?: Erreur }) {
    const appels: Array<[string, unknown]> = [];
    const chaine: Record<string, unknown> = {
      update: (v: unknown) => (appels.push(["update", v]), chaine),
      eq: (c: string, v: unknown) => (appels.push(["eq:" + c, v]), chaine),
      select: async () => ({ data: null, error: null, ...res }),
    };
    return { client: { from: () => chaine } as unknown as SupabaseClient, appels };
  }

  it("ne touche que les décisions encore ouvertes", async () => {
    const { client, appels } = ecrivain({ data: [{ id: "J3.3" }] });
    const fait = await cloreDecision(client, "J3.3", "tranchee", "Oui", new Date("2026-10-30T12:00:00Z"));
    expect(fait).toBe(true);
    expect(appels).toContainEqual(["eq:statut", "ouverte"]);
    expect(appels[0][1]).toMatchObject({
      statut: "tranchee",
      reponse: "Oui",
      tranchee_le: "2026-10-30T12:00:00.000Z",
    });
  });

  it("déjà close : renvoie false", async () => {
    expect(await cloreDecision(ecrivain({ data: [] }).client, "J3.3", "abandonnee", null)).toBe(false);
  });

  it("table absente : message clair", async () => {
    await expect(
      cloreDecision(ecrivain({ error: { code: "PGRST205" } }).client, "J3.3", "tranchee", "x"),
    ).rejects.toThrow("n'existe pas encore");
  });
});
