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
