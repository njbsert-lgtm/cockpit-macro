import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * La frontière serveur / navigateur, vérifiée sur le texte du dépôt.
 *
 * Un composant `"use client"` part dans le bundle du navigateur avec tout ce qu'il importe. S'il
 * importait le client Supabase ou le module de session, il y embarquerait l'URL, la clé anonyme
 * — qui lit les brouillons — et, au pire, le nom de la clé de service. Ce test le refuse avant
 * le build plutôt qu'à la lecture d'un bundle.
 */

const RACINE = path.resolve(import.meta.dirname, "../..");
const DOSSIERS = ["app", "components", "lib"];

function fichiers(dossier: string): string[] {
  const sortie: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin));
    else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

const CLIENTS = DOSSIERS.flatMap((d) => fichiers(path.join(RACINE, d))).filter((f) =>
  /^\s*["']use client["']/.test(readFileSync(f, "utf-8")),
);

describe("frontière serveur / navigateur", () => {
  it("trouve bien des composants client à contrôler", () => {
    expect(CLIENTS.length).toBeGreaterThan(0);
  });

  it.each(CLIENTS.map((f) => [path.relative(RACINE, f), f]))(
    "%s n'importe ni Supabase ni la session, et ne nomme aucune clé",
    (_relatif, fichier) => {
      const source = readFileSync(fichier, "utf-8");
      expect(source).not.toMatch(/from\s+["'](@\/lib\/supabase|@\/lib\/auth\/session|@supabase\/)/);
      expect(source).not.toMatch(/SERVICE_ROLE|SUPABASE_SECRET|SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE/);
    },
  );

  it("le module de session est marqué server-only", () => {
    const source = readFileSync(path.join(RACINE, "lib/auth/session.ts"), "utf-8");
    expect(source.startsWith('import "server-only";')).toBe(true);
  });
});
