import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/admin` refuse sans session. Vitest ne compile pas le JSX (`jsx: preserve`) : on ne rend pas
 * la page, on vérifie que layout et page appellent la garde avant toute lecture, puis que la
 * garde elle-même refuse sans administrateur.
 */

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
  headers: async () => new Headers({ host: "marguerite.vercel.app" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const lire = (f: string) => readFileSync(path.resolve(import.meta.dirname, f), "utf-8");

describe("garde de /admin", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://projet.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-anonyme");
    getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("sans session, la garde répond 404", async () => {
    const { exigerAdminPage } = await import("@/lib/auth/session");
    await expect(exigerAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("le layout appelle la garde et porte la barre d'administration", () => {
    const source = lire("layout.tsx");
    expect(source).toMatch(/await exigerAdminPage\(\)/);
    expect(source).toMatch(/<BarreAdmin/);
  });

  it("la page appelle la garde avant toute lecture", () => {
    const source = lire("page.tsx");
    const garde = source.indexOf("await exigerAdminPage()");
    expect(garde).toBeGreaterThan(-1);
    expect(garde).toBeLessThan(source.indexOf("getFreshnessSummary()"));
    expect(garde).toBeLessThan(source.indexOf("compterBrouillons()"));
  });

  it("la page est en lecture seule", () => {
    const source = lire("page.tsx");
    expect(source).not.toMatch(/use server|getWriteClient|<form|<button/);
  });
});

describe("garde de /admin/veille (ex-/triage)", () => {
  it("le layout /admin garde la sous-route, la page aussi avant toute lecture", () => {
    expect(lire("layout.tsx")).toMatch(/await exigerAdminPage\(\)/);
    const source = lire("veille/page.tsx");
    const garde = source.indexOf("await exigerAdminPage()");
    expect(garde).toBeGreaterThan(-1);
    expect(garde).toBeLessThan(source.indexOf("getPendingVeilleItems()"));
  });

  it("/triage garde d'abord, redirige ensuite, sans redirection de configuration", () => {
    const page = lire("../triage/page.tsx");
    const garde = page.indexOf("await exigerAdminPage()");
    expect(garde).toBeGreaterThan(-1);
    expect(garde).toBeLessThan(page.indexOf('redirect("/admin/veille")'));
    expect(lire("../triage/layout.tsx")).toMatch(/await exigerAdminPage\(\)/);
    // Une redirection de next.config.ts passerait avant le middleware et révélerait la route.
    expect(lire("../../next.config.ts")).not.toMatch(/source:\s*["`]\/triage/);
  });

  it("les actions de l'ancienne adresse ont disparu", () => {
    expect(() => lire("../triage/actions.ts")).toThrow();
  });
});

describe("garde de /admin/decisions", () => {
  it("la page garde avant toute lecture, le layout /admin aussi", () => {
    expect(lire("layout.tsx")).toMatch(/await exigerAdminPage\(\)/);
    const source = lire("decisions/page.tsx");
    const garde = source.indexOf("await exigerAdminPage()");
    expect(garde).toBeGreaterThan(-1);
    expect(garde).toBeLessThan(source.indexOf("await lireDecisions()"));
  });

  it("la page n'est pas un composant client et le pied d'administration y mène", () => {
    expect(lire("decisions/page.tsx")).not.toMatch(/["']use client["']/);
    expect(lire("../../components/admin/BarreAdmin.tsx")).toMatch(/href="\/admin\/decisions"/);
  });
});
