import { describe, expect, it } from "vitest";
import { runDiagnostic } from "./diagnostic";

describe("runDiagnostic", () => {
  it("nomme les variables absentes sans jamais renvoyer de valeur de clé", async () => {
    const { checks, verdict } = await runDiagnostic();
    const env = checks.find((c) => c.label === "Variables d'environnement")!;

    expect(env.ok).toBe(false);
    expect(env.detail).toMatch(/SUPABASE_URL/);
    expect(verdict).toMatch(/variables manquantes/i);

    // Un écran de diagnostic qui affiche un secret est un secret publié : le détail ne doit
    // porter que des noms de variables, jamais leur contenu.
    const rendu = JSON.stringify(checks);
    for (const valeur of Object.values(process.env)) {
      if (valeur && valeur.length > 12) expect(rendu).not.toContain(valeur);
    }
  });

  it("rend les trois contrôles, quoi qu'il arrive", async () => {
    const { checks } = await runDiagnostic();
    expect(checks.map((c) => c.label)).toEqual([
      "Variables d'environnement",
      "Lecture de la base",
      "Écriture en base",
    ]);
  });
});
