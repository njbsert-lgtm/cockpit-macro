import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { DEBUT_DU_SUIVI, NOTES_PURGEES, estPurgee } from "@/config/suivi";
import { TREND_NON_REVISEE, trendEstRevisee } from "./trend-labels";

describe("le début du suivi", () => {
  it("ne confond pas la première note réelle avec une note retirée", () => {
    expect(estPurgee(DEBUT_DU_SUIVI.slug)).toBe(false);
    expect(estPurgee(DEBUT_DU_SUIVI.precedentePurgee)).toBe(true);
  });

  it("redirige chaque ancienne adresse de note vers /notes, sans 404 ni redirection permanente", async () => {
    const redirections = await nextConfig.redirects!();
    expect(redirections.map((r) => r.source).sort()).toEqual(NOTES_PURGEES.map((s) => `/notes/${s}`).sort());
    for (const r of redirections) {
      expect(r.destination).toBe("/notes");
      expect(r.permanent).toBe(false);
    }
  });
});

describe("une tendance sans historique", () => {
  it("n'est pas révisée : elle affiche « pas encore révisée », jamais un statut hérité", () => {
    expect(trendEstRevisee({ statusHistory: [] })).toBe(false);
    expect(trendEstRevisee({ statusHistory: [{}] })).toBe(true);
    expect(TREND_NON_REVISEE).toBe("Pas encore révisée par une note");
  });
});

describe("le prompt de rédaction", () => {
  it("ne présente aucun statut pour une tendance sans historique", async () => {
    const { construirePromptUtilisateur } = await import("./redaction/prompt");
    const trend = (id: string, statusHistory: unknown[]) =>
      ({ id, title: id, status: "renforce", statusHistory }) as never;
    const paquet = {
      noteType: "hebdo",
      isoWeek: "2026-S43",
      date: "2026-10-24",
      comparesTo: "2026-S42",
      slug: "2026-S43",
      specialesDeLaSemaine: [],
      notePrecedente: null,
      ficheNotion: null,
      observations: [],
      drivers: [],
      itemsVeille: [],
      scenariosCourants: [],
      tendancesCourantes: [trend("revisee", [{}]), trend("jamais", [])],
      guetsOuverts: [],
      guetsExpires: [],
      budgetGuets: 3,
      placesThemes: 5,
      themesExistants: [],
      echeancesSemaine: [],
      trigger: null,
    } as never;
    const prompt = construirePromptUtilisateur(paquet, ["CeQuiAChange"]);
    expect(prompt).toContain("`revisee` — **renforce**");
    expect(prompt).toContain("`jamais` — **pas encore révisée par une note**");
  });
});
