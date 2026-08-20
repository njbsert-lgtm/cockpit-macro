import { describe, expect, it } from "vitest";
import { runDiagnostic } from "./diagnostic";

describe("runDiagnostic", () => {
  it("nomme les variables absentes sans jamais renvoyer de valeur de clé", async () => {
    const { checks, verdict } = await runDiagnostic();
    const env = checks.find((c) => c.label === "Variables d'environnement")!;

    expect(env.ok).toBe(false);
    expect(env.detail).toMatch(/SUPABASE_URL/);
    expect(verdict).toMatch(/variables manquantes/i);

    // Un écran de diagnostic qui affiche un secret est un secret publié : aucune valeur de
    // clé ne doit ressortir. L'hôte Supabase fait exception et est affiché sciemment — c'est
    // le point d'entrée public d'un projet, protégé par RLS et non par son obscurité.
    const rendu = JSON.stringify(checks);
    const secrets = [
      "FRED_API_KEY",
      "CRON_SECRET",
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SECRET_KEY",
    ];
    for (const nom of secrets) {
      const valeur = process.env[nom];
      if (valeur) expect(rendu).not.toContain(valeur);
    }
  });

  it("rend les quatre contrôles, quoi qu'il arrive", async () => {
    const { checks } = await runDiagnostic();
    expect(checks.map((c) => c.label)).toEqual([
      "Variables d'environnement",
      "Forme de l'URL",
      "Lecture de la base",
      "Écriture en base",
    ]);
  });
});

describe("checkUrlShape — via runDiagnostic", () => {
  const cas: Array<[string, RegExp]> = [
    ["https://supabase.com/dashboard/project/abcdef", /tableau de bord/],
    ["postgresql://postgres:x@db.abcdef.supabase.co:5432/postgres", /protocole/],
    ["https://abcdef.supabase.co/rest/v1", /chemin/],
    ["pas une adresse", /illisible/],
  ];

  it.each(cas)("reconnaît « %s »", async (valeur, attendu) => {
    const avant = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = valeur;
    try {
      const { checks } = await runDiagnostic();
      const url = checks.find((c) => c.label === "Forme de l'URL")!;
      expect(url.ok).toBe(false);
      expect(url.detail).toMatch(attendu);
    } finally {
      if (avant === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = avant;
    }
  });

  it("accepte la forme attendue", async () => {
    const avant = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = "https://abcdefghij.supabase.co";
    try {
      const { checks } = await runDiagnostic();
      const url = checks.find((c) => c.label === "Forme de l'URL")!;
      expect(url.ok).toBe(true);
      expect(url.detail).toMatch(/abcdefghij\.supabase\.co/);
    } finally {
      if (avant === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = avant;
    }
  });
});

describe("checkEnvironment — les valeurs salies", () => {
  it("signale une espace parasite plutôt que de la corriger en silence", async () => {
    const avant = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_ANON_KEY = "une-cle-quelconque\n";
    try {
      const { checks } = await runDiagnostic();
      const env = checks.find((c) => c.label === "Variables d'environnement")!;
      expect(env.detail).toMatch(/Espace ou retour à la ligne/);
      expect(env.detail).toMatch(/SUPABASE_ANON_KEY/);
    } finally {
      if (avant === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = avant;
    }
  });
});
