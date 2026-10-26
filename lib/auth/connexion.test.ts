import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { confirmerLien, envoyerLien } from "./connexion";

function client(auth: Record<string, unknown>): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

const ORIGINE = "https://marguerite.vercel.app";

describe("envoyerLien", () => {
  it("n'inscrit jamais personne et renvoie vers /auth/confirmer", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    expect(await envoyerLien(client({ signInWithOtp }), " Moi@Exemple.fr ", ORIGINE)).toBe("envoye");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "moi@exemple.fr",
      options: { shouldCreateUser: false, emailRedirectTo: `${ORIGINE}/auth/confirmer` },
    });
  });

  it("répond exactement pareil pour une adresse inconnue", async () => {
    const inconnue = vi.fn().mockResolvedValue({ error: { status: 422, message: "Signups not allowed for otp" } });
    const connue = vi.fn().mockResolvedValue({ error: null });
    expect(await envoyerLien(client({ signInWithOtp: inconnue }), "x@y.fr", ORIGINE)).toBe(
      await envoyerLien(client({ signInWithOtp: connue }), "moi@exemple.fr", ORIGINE),
    );
  });

  it("répond pareil quand Supabase limite le débit", async () => {
    const limite = vi.fn().mockResolvedValue({ error: { status: 429, message: "rate limit" } });
    expect(await envoyerLien(client({ signInWithOtp: limite }), "x@y.fr", ORIGINE)).toBe("envoye");
  });

  it("signale une panne de service, qui ne dit rien de l'adresse", async () => {
    const reseau = vi.fn().mockResolvedValue({ error: { status: 0, message: "fetch failed" } });
    const serveur = vi.fn().mockResolvedValue({ error: { status: 503, message: "down" } });
    const leve = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await envoyerLien(client({ signInWithOtp: reseau }), "x@y.fr", ORIGINE)).toBe("erreur");
    expect(await envoyerLien(client({ signInWithOtp: serveur }), "x@y.fr", ORIGINE)).toBe("erreur");
    expect(await envoyerLien(client({ signInWithOtp: leve }), "x@y.fr", ORIGINE)).toBe("erreur");
    expect(await envoyerLien(null, "x@y.fr", ORIGINE)).toBe("erreur");
  });

  it("refuse une adresse illisible sans appeler Supabase", async () => {
    const signInWithOtp = vi.fn();
    expect(await envoyerLien(client({ signInWithOtp }), "pas-une-adresse", ORIGINE)).toBe("invalide");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("confirmerLien", () => {
  const admin = { data: { user: { app_metadata: { role: "admin" } } }, error: null };
  const lecteur = { data: { user: { app_metadata: {} } }, error: null };

  it("ouvre la session depuis un token_hash", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue(admin);
    const ok = await confirmerLien(
      client({ verifyOtp, getUser }),
      new URLSearchParams("token_hash=abc&type=email"),
    );
    expect(ok).toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" });
  });

  it("ouvre la session depuis un code PKCE", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue(admin);
    expect(
      await confirmerLien(client({ exchangeCodeForSession, getUser }), new URLSearchParams("code=xyz")),
    ).toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz");
  });

  it("referme aussitôt la session d'un compte non administrateur", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const ok = await confirmerLien(
      client({ verifyOtp: vi.fn().mockResolvedValue({ error: null }), getUser: vi.fn().mockResolvedValue(lecteur), signOut }),
      new URLSearchParams("token_hash=abc&type=email"),
    );
    expect(ok).toBe(false);
    expect(signOut).toHaveBeenCalled();
  });

  it("refuse un lien expiré, sans paramètre, ou d'un type inattendu", async () => {
    const expire = client({ verifyOtp: vi.fn().mockResolvedValue({ error: { message: "expired" } }) });
    expect(await confirmerLien(expire, new URLSearchParams("token_hash=abc&type=email"))).toBe(false);
    expect(await confirmerLien(client({}), new URLSearchParams(""))).toBe(false);
    expect(await confirmerLien(client({}), new URLSearchParams("token_hash=abc&type=recovery"))).toBe(false);
    expect(await confirmerLien(null, new URLSearchParams("code=xyz"))).toBe(false);
  });
});
