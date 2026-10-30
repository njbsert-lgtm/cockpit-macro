import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { resetClientsForTests } from "@/lib/supabase";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const { config, middleware } = await import("./middleware");

const SITE = "https://marguerite.vercel.app";

function requete(chemin: string, entetes: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(chemin, SITE), { headers: { host: "marguerite.vercel.app", ...entetes } });
}

function estRefus(response: Response): boolean {
  const reecriture = response.headers.get("x-middleware-rewrite") ?? "";
  return response.status === 404 && reecriture.endsWith("/_introuvable");
}

describe("matcher du middleware", () => {
  const correspond = (url: string) => unstable_doesMiddlewareMatch({ config, url });

  it.each(["/admin", "/redaction", "/redaction/2026-S43", "/triage", "/diagnostic"])(
    "intercepte %s",
    (url) => {
      expect(correspond(url)).toBe(true);
    },
  );

  it.each(["/", "/notes", "/notes/2026-S43", "/administration", "/api/cron/collect", "/connexion", "/auth/confirmer", "/marches"])(
    "laisse passer %s",
    (url) => {
      expect(correspond(url)).toBe(false);
    },
  );

  it("le cron n'est jamais intercepté, même avec son Bearer et sans session", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/api/cron/collect",
        headers: { authorization: "Bearer secret" },
      }),
    ).toBe(false);
    // Et sa route ne dépend d'aucune session : seul le Bearer y décide.
    const route = readFileSync(path.resolve(import.meta.dirname, "app/api/cron/collect/route.ts"), "utf-8");
    expect(route).not.toMatch(/lib\/auth/);
  });
});

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://projet.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-anonyme");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_LOCAL", "");
    resetClientsForTests();
    getUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetClientsForTests();
  });

  it.each(["/admin", "/redaction", "/redaction/2026-S43", "/triage", "/diagnostic"])(
    "répond 404 sans session sur %s",
    async (chemin) => {
      getUser.mockResolvedValue({ data: { user: null }, error: new Error("pas de session") });
      expect(estRefus(await middleware(requete(chemin)))).toBe(true);
    },
  );

  it("répond 404 à un utilisateur connecté qui n'est pas administrateur", async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: {} } }, error: null });
    expect(estRefus(await middleware(requete("/redaction")))).toBe(true);
  });

  it("échoue fermé quand Supabase est injoignable", async () => {
    getUser.mockRejectedValue(new Error("fetch failed"));
    expect(estRefus(await middleware(requete("/redaction")))).toBe(true);
  });

  it("échoue fermé quand la base n'est pas configurée", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    resetClientsForTests();
    expect(estRefus(await middleware(requete("/redaction")))).toBe(true);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("laisse passer l'administrateur, sans cache", async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: { role: "admin" } } }, error: null });
    const response = await middleware(requete("/redaction"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("ignore ADMIN_LOCAL hors développement local", async () => {
    vi.stubEnv("ADMIN_LOCAL", "1");
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(estRefus(await middleware(requete("/redaction", { host: "localhost:3000" })))).toBe(true);
  });
});
