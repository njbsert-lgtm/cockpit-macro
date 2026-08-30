import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { declencherPublication } from "./github-dispatch";

const ENV_KEYS = ["GITHUB_DISPATCH_TOKEN", "GITHUB_REPO"];

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("declencherPublication", () => {
  it("échoue proprement sans appeler le réseau quand le jeton manque", async () => {
    const fetcher = vi.fn();
    const resultat = await declencherPublication("2026-S36", fetcher);
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("GITHUB_DISPATCH_TOKEN");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("appelle l'API de dispatch avec le slug en entrée", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "token-de-test";
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const resultat = await declencherPublication("2026-S36", fetcher);
    expect(resultat.ok).toBe(true);

    const [url, init] = fetcher.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(String(url)).toContain("/actions/workflows/publier-note.yml/dispatches");
    expect(JSON.parse(String(init?.body))).toEqual({ ref: "main", inputs: { slug: "2026-S36" } });
    expect(headers.Authorization).toBe("Bearer token-de-test");
  });

  it("relaie le code d'erreur de GitHub sans lever", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "token-de-test";
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    const resultat = await declencherPublication("2026-S36", fetcher);
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("404");
  });

  it("dégrade proprement si GitHub est injoignable", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "token-de-test";
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const resultat = await declencherPublication("2026-S36", fetcher);
    expect(resultat.ok).toBe(false);
    expect(resultat.erreur).toContain("network down");
  });
});
