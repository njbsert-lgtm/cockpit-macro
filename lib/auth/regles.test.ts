import { describe, expect, it } from "vitest";
import {
  contournementLocal,
  estAdmin,
  estRouteProtegee,
  verifierContournementAuBuild,
} from "./regles";

const DEV_LOCAL = { ADMIN_LOCAL: "1", NODE_ENV: "development" };

describe("contournementLocal", () => {
  it("s'ouvre quand les quatre conditions sont réunies", () => {
    expect(contournementLocal(DEV_LOCAL, "localhost:3000")).toBe(true);
    expect(contournementLocal(DEV_LOCAL, "127.0.0.1:3000")).toBe(true);
  });

  it("refuse sans ADMIN_LOCAL=1", () => {
    expect(contournementLocal({ NODE_ENV: "development" }, "localhost")).toBe(false);
    expect(contournementLocal({ ...DEV_LOCAL, ADMIN_LOCAL: "true" }, "localhost")).toBe(false);
  });

  it("refuse hors mode développement", () => {
    expect(contournementLocal({ ...DEV_LOCAL, NODE_ENV: "production" }, "localhost")).toBe(false);
    expect(contournementLocal({ ...DEV_LOCAL, NODE_ENV: "test" }, "localhost")).toBe(false);
  });

  it("refuse sur Vercel, même en développement", () => {
    expect(contournementLocal({ ...DEV_LOCAL, VERCEL: "1" }, "localhost")).toBe(false);
  });

  it("refuse un hôte qui n'est pas local", () => {
    expect(contournementLocal(DEV_LOCAL, "marguerite.vercel.app")).toBe(false);
    expect(contournementLocal(DEV_LOCAL, "localhost.evil.example")).toBe(false);
    expect(contournementLocal(DEV_LOCAL, null)).toBe(false);
  });
});

describe("verifierContournementAuBuild", () => {
  it("fait échouer le build en production", () => {
    expect(() => verifierContournementAuBuild({ ADMIN_LOCAL: "1", NODE_ENV: "production" })).toThrow(
      /ADMIN_LOCAL/,
    );
  });

  it("fait échouer le build sur Vercel", () => {
    expect(() =>
      verifierContournementAuBuild({ ADMIN_LOCAL: "1", NODE_ENV: "development", VERCEL: "1" }),
    ).toThrow(/ADMIN_LOCAL/);
  });

  it("laisse passer le développement local, et tout build sans la variable", () => {
    expect(() => verifierContournementAuBuild(DEV_LOCAL)).not.toThrow();
    expect(() => verifierContournementAuBuild({ NODE_ENV: "production", VERCEL: "1" })).not.toThrow();
  });
});

describe("estAdmin", () => {
  it("lit le rôle dans app_metadata, jamais ailleurs", () => {
    expect(estAdmin({ app_metadata: { role: "admin" } })).toBe(true);
    expect(estAdmin({ app_metadata: { role: "lecteur" } })).toBe(false);
    expect(estAdmin({ app_metadata: {} })).toBe(false);
    // user_metadata est modifiable par l'utilisateur : il ne prouve rien.
    expect(estAdmin({ app_metadata: {}, user_metadata: { role: "admin" } } as never)).toBe(false);
    expect(estAdmin(null)).toBe(false);
  });
});

describe("estRouteProtegee", () => {
  it("couvre les routes d'administration et leurs sous-pages, rien d'autre", () => {
    expect(estRouteProtegee("/admin")).toBe(true);
    expect(estRouteProtegee("/administration")).toBe(false);
    expect(estRouteProtegee("/redaction")).toBe(true);
    expect(estRouteProtegee("/redaction/2026-S43")).toBe(true);
    expect(estRouteProtegee("/triage")).toBe(true);
    expect(estRouteProtegee("/diagnostic")).toBe(true);
    expect(estRouteProtegee("/redactions")).toBe(false);
    expect(estRouteProtegee("/")).toBe(false);
    expect(estRouteProtegee("/notes")).toBe(false);
  });
});
