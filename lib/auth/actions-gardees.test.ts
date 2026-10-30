import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Chaque Server Action d'administration refuse sans session, et n'écrit rien.
 *
 * Le test parcourt **toutes** les fonctions exportées des deux modules d'actions, sans les
 * nommer : une action ajoutée demain sans garde le fait échouer d'elle-même.
 */

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
  headers: async () => new Headers({ host: "marguerite.vercel.app" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getWriteClient = vi.fn(() => null);
vi.mock("@/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase")>()),
  getWriteClient: () => getWriteClient(),
}));

const MODULES = {
  "app/redaction/actions.ts": () => import("@/app/redaction/actions"),
  "app/triage/actions.ts": () => import("@/app/triage/actions"),
};

const RACINE = path.resolve(import.meta.dirname, "../..");

describe.each(Object.entries(MODULES))("%s", (fichier, charger) => {
  const fetchEspion = vi.fn();

  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://projet.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-anonyme");
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "jeton");
    vi.stubGlobal("fetch", fetchEspion);
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    getWriteClient.mockClear();
    fetchEspion.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("chaque action exportée refuse sans session et n'écrit rien", async () => {
    const exports_ = (await charger()) as Record<string, unknown>;
    const actions = Object.entries(exports_).filter(([, v]) => typeof v === "function");
    expect(actions.length).toBeGreaterThan(0);

    const formulaire = new FormData();
    formulaire.set("action", "accepter");
    formulaire.set("block", "whatChanged");
    formulaire.set("draftNoteSlug", "2026-S44");

    for (const [nom, action] of actions) {
      const appel = (action as (...a: unknown[]) => Promise<unknown>)(
        "2026-S44",
        "x",
        formulaire,
        formulaire,
      );
      await expect(appel, nom).rejects.toThrow("Non autorisé");
    }
    expect(getWriteClient).not.toHaveBeenCalled();
    expect(fetchEspion).not.toHaveBeenCalled();
  });

  it("refuse aussi un utilisateur connecté qui n'est pas administrateur", async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: { role: "lecteur" } } }, error: null });
    const exports_ = (await charger()) as Record<string, (...a: unknown[]) => Promise<unknown>>;
    const [premiere] = Object.values(exports_).filter((v) => typeof v === "function");
    await expect(premiere("2026-S44", "x", new FormData(), new FormData())).rejects.toThrow(
      "Non autorisé",
    );
  });

  it("la garde est la première instruction de chaque action", () => {
    const source = readFileSync(path.join(RACINE, fichier), "utf-8");
    const corps = [...source.matchAll(/export async function (\w+)\([^{]*?\)[^{]*\{\n(.*)\n/g)];
    expect(corps.length).toBeGreaterThan(0);
    for (const [, nom, premiereLigne] of corps) {
      expect(premiereLigne.trim(), nom).toBe("await exigerAdminAction();");
    }
  });
});
