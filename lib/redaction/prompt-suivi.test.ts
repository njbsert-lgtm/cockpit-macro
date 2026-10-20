import { describe, expect, it } from "vitest";

describe("le prompt de rédaction", () => {
  it("interdit d'invoquer une note antérieure au début du suivi, et nomme la semaine de départ", async () => {
    const { construirePromptSysteme } = await import("./prompt");
    const prompt = construirePromptSysteme(["CeQuiAChange"], ["rates"]);
    expect(prompt).toContain("## Le suivi commence à la S38");
    expect(prompt).toContain("Tu n'invoques jamais une note, une analyse ou un régime antérieur au début du suivi");
    expect(prompt).toContain("Un fait de marché daté");
  });
});

describe("le prompt utilisateur : « Scénarios courants »", () => {
  it("ne présente que la version en vigueur de chaque branche, pas l'historique", async () => {
    const { construirePromptUtilisateur } = await import("./prompt");
    const version = (n: number, thesis: string) =>
      ({ driverId: "rates", branchId: "rates-baisses", version: n, likelihood: "faible", thesis }) as never;
    const paquet = {
      noteType: "hebdo", isoWeek: "2026-S43", date: "2026-10-24", comparesTo: "2026-S42", slug: "2026-S43",
      specialesDeLaSemaine: [], notePrecedente: null, ficheNotion: null, observations: [], drivers: [],
      itemsVeille: [], tendancesCourantes: [], guetsOuverts: [], guetsExpires: [], budgetGuets: 3,
      placesThemes: 5, themesExistants: [], echeancesSemaine: [], trigger: null,
      scenariosCourants: [version(4, "Inchangée, pour la même raison qu'en août."), version(6, "La version en vigueur.")],
    } as never;
    const prompt = construirePromptUtilisateur(paquet, ["CeQuiAChange"]);
    expect(prompt).toContain("La version en vigueur.");
    expect(prompt).not.toContain("même raison qu'en août");
  });
});
