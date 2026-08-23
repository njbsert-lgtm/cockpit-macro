import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyVeilleItems } from "./classify";
import type { VeilleItem } from "@/lib/types";
import type { StructuredCaller } from "@/lib/anthropic";

type Write = { table: string; id: string; patch: Record<string, unknown> };

/** Un faux client Supabase qui enregistre chaque `update().eq()` sans jamais lire `status`. */
function fakeClient() {
  const writes: Write[] = [];
  const client = {
    from(table: string) {
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(_column: string, id: string) {
              writes.push({ table, id, patch });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

function item(over: Partial<VeilleItem> = {}): VeilleItem {
  return {
    id: "abc123",
    title: "La Fed relève ses taux de 25 points de base",
    url: "https://example.org/fed",
    source: "Federal Reserve",
    publishedAt: "2026-08-20",
    zones: ["us"],
    driverRefs: ["rates"],
    channels: [],
    isSignal: true,
    status: "nouveau",
    attachedToBlock: null,
    draftNoteSlug: null,
    ...over,
  };
}

const CONTEXT = { drivers: [{ id: "rates", label: "Taux directeurs", question: "La Fed monte-t-elle ?" }] };

function classification(over: Record<string, unknown> = {}) {
  return {
    id: "abc123",
    isSignal: true,
    nature: "flux" as const,
    driverRefs: ["rates"],
    channels: ["fonction-reaction" as const],
    zones: ["us"],
    horizon: "immediat" as const,
    reasoning: "Décision effective de politique monétaire.",
    ...over,
  };
}

describe("classifyVeilleItems — écriture", () => {
  it("écrit is_signal, nature, horizon, driver_refs, channels, zones, classified_at", async () => {
    const { client, writes } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification()] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(0);
    expect(writes).toHaveLength(1);
    expect(writes[0].table).toBe("veille_items");
    expect(writes[0].id).toBe("abc123");
    expect(writes[0].patch).toMatchObject({
      is_signal: true,
      nature: "flux",
      horizon: "immediat",
      driver_refs: ["rates"],
      channels: ["fonction-reaction"],
      zones: ["us"],
    });
    expect(writes[0].patch.classified_at).toBeTypeOf("string");
  });

  it("ne touche jamais status — la file de /triage reste celle de la passe 1", async () => {
    const { client, writes } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification()] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(writes[0].patch).not.toHaveProperty("status");
  });
});

describe("classifyVeilleItems — un item omis par le modèle n'est pas une erreur", () => {
  it("laisse la ligne intacte plutôt que de deviner", async () => {
    const { client, writes } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [] }, // le lot ne renvoie rien
      usage: { input: 100, output: 10 },
    })) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(writes).toHaveLength(0);
    expect(report.ok).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.skipped).toBe(1);
  });
});

describe("classifyVeilleItems — un lot en échec n'écrit rien", () => {
  it("règle du cahier : rejet d'une réponse malformée sans écriture", async () => {
    const { client, writes } = fakeClient();
    const caller = vi.fn(async () => {
      throw new Error("réponse malformée");
    }) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, [item(), item({ id: "def456" })], CONTEXT, caller);

    expect(writes).toHaveLength(0);
    expect(report.failed).toBe(2);
    expect(report.outcomes.every((o) => o.error === "réponse malformée")).toBe(true);
  });
});

describe("classifyVeilleItems — découpage en lots", () => {
  it("appelle le caller une fois par lot, jamais un appel par item", async () => {
    const items = Array.from({ length: 25 }, (_, i) => item({ id: `item-${i}` }));
    const { client } = fakeClient();
    const caller = vi.fn(async ({ user }: { user: string }) => {
      const ids = [...user.matchAll(/id=(\S+)/g)].map((m) => m[1]);
      return {
        value: { items: ids.map((id) => classification({ id })) },
        usage: { input: 10, output: 10 },
      };
    }) as unknown as StructuredCaller;

    await classifyVeilleItems(client, items, CONTEXT, caller, { batchSize: 10 });

    expect(caller).toHaveBeenCalledTimes(3); // 10 + 10 + 5
  });
});
