import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyVeilleItems } from "./classify";
import type { VeilleItem } from "@/lib/types";
import type { StructuredCaller } from "@/lib/anthropic";
import { CLASSIFICATION_MODEL } from "@/config/ai-models";

type Write = { table: string; id: string; patch: Record<string, unknown> };

/** Un faux client Supabase qui enregistre chaque `update().eq()` sans jamais lire `status`. */
function fakeClient(options: { refuseEtape4?: boolean } = {}) {
  const writes: Write[] = [];
  const client = {
    from(table: string) {
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(_column: string, id: string) {
              writes.push({ table, id, patch });
              // Une base dont la migration de l'étape 4 n'est pas appliquée refuse ces colonnes.
              const refus = options.refuseEtape4 && "axe_id" in patch;
              return Promise.resolve({
                error: refus ? { message: 'column "axe_id" of relation "veille_items" does not exist' } : null,
              });
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
    // Deux écritures : la classification d'origine, puis les champs de l'étape 4 à part.
    expect(writes).toHaveLength(2);
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

  it("appelle Claude sur le modèle configuré pour la classification, jamais un autre", async () => {
    // Garde-fou explicite : `config/ai-models.ts` est le seul endroit où ce choix doit se lire.
    // Si ce test casse, c'est que quelque chose a réintroduit un modèle en dur ici.
    const { client } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification()] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(caller).toHaveBeenCalledWith(
      expect.objectContaining({ model: CLASSIFICATION_MODEL }),
    );
  });

  it("désactive la pensée adaptative — Haiku 4.5 la refuse avec un 400", async () => {
    // Confirmé en conditions réelles : sans ce garde-fou, tous les lots échouent avec
    // « adaptive thinking is not supported on this model ». Voir lib/anthropic.ts.
    const { client } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification()] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(caller).toHaveBeenCalledWith(expect.objectContaining({ thinking: false }));
  });

  it("ne passe jamais `effort` — Haiku 4.5 refuse aussi ce champ avec un 400", async () => {
    // Confirmé en conditions réelles : « This model does not support the effort parameter ».
    // Voir lib/anthropic.ts.
    const { client } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification()] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    await classifyVeilleItems(client, [item()], CONTEXT, caller);

    const [[req]] = vi.mocked(caller).mock.calls;
    expect(req).not.toHaveProperty("effort");
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

describe("classifyVeilleItems — statistiques du run", () => {
  it("porte isSignal, driverRefs et source sur chaque item classé avec succès", async () => {
    const { client } = fakeClient();
    const caller = vi.fn(async () => ({
      value: { items: [classification({ isSignal: true, driverRefs: ["rates", "ai"] })] },
      usage: { input: 100, output: 50 },
    })) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(
      client,
      [item({ source: "Federal Reserve" })],
      CONTEXT,
      caller,
    );

    expect(report.outcomes[0]).toMatchObject({
      ok: true,
      isSignal: true,
      driverRefs: ["rates", "ai"],
      source: "Federal Reserve",
    });
  });

  it("cumule les jetons sur tous les lots ayant réellement appelé l'API", async () => {
    const items = Array.from({ length: 15 }, (_, i) => item({ id: `item-${i}` }));
    const { client } = fakeClient();
    const caller = vi.fn(async ({ user }: { user: string }) => {
      const ids = [...user.matchAll(/id=(\S+)/g)].map((m) => m[1]);
      return {
        value: { items: ids.map((id) => classification({ id })) },
        usage: { input: 40, output: 20 },
      };
    }) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, items, CONTEXT, caller, { batchSize: 10 });

    // Deux lots (10 + 5), chacun facturé 40/20 par le faux caller.
    expect(report.usage).toEqual({ input: 80, output: 40 });
  });

  it("n'ajoute rien au cumul de jetons pour un lot qui échoue avant toute réponse", async () => {
    const { client } = fakeClient();
    const caller = vi.fn(async () => {
      throw new Error("panne réseau");
    }) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(report.usage).toEqual({ input: 0, output: 0 });
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

describe("classifyVeilleItems — axes, matérialité et guets (étape 4)", () => {
  const AXES = [
    {
      id: "inflation-sous-jacente",
      driverId: "rates",
      libelle: "Inflation sous-jacente",
      mecanisme: "m",
      instruments: ["us1y"],
      macros: [],
      lisibilite: "directe" as const,
      limite: "",
    },
    {
      id: "monetisation",
      driverId: "ai",
      libelle: "Monétisation",
      mecanisme: "m",
      instruments: ["ndx"],
      macros: [],
      lisibilite: "indirecte" as const,
      limite: "x",
    },
  ];
  const CTX = { ...CONTEXT, axes: AXES, guets: [] };

  function appeler(value: Record<string, unknown>) {
    return vi.fn(async () => ({
      value: { items: [classification(value)] },
      usage: { input: 1, output: 1 },
    })) as unknown as StructuredCaller;
  }

  it("écrit l'axe, la matérialité et le guet dans une écriture séparée", async () => {
    const { client, writes } = fakeClient();
    const report = await classifyVeilleItems(
      client,
      [item()],
      CTX,
      appeler({ axeId: "inflation-sous-jacente", materialite: "haute", resoutGuet: null, axeManquantPropose: null }),
    );

    expect(writes[1].patch).toEqual({
      axe_id: "inflation-sous-jacente",
      materialite: "haute",
      resout_guet: null,
      axe_manquant_propose: null,
    });
    expect(report.outcomes[0]).toMatchObject({ ok: true, axeId: "inflation-sous-jacente", materialite: "haute" });
  });

  it("une base sans les colonnes de l'étape 4 ne casse jamais la classification d'origine", async () => {
    const { client } = fakeClient({ refuseEtape4: true });
    const report = await classifyVeilleItems(
      client,
      [item()],
      CTX,
      appeler({ axeId: null, materialite: "faible", resoutGuet: null, axeManquantPropose: null }),
    );

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.outcomes[0].etape4NonEcrite).toBe(true);
  });

  it("écarte un axe qui n'appartient à aucun driver de l'item, et le signale", async () => {
    const { client, writes } = fakeClient();
    // L'item est rattaché au seul driver `rates` ; l'axe cité appartient à `ai`.
    const report = await classifyVeilleItems(
      client,
      [item()],
      CTX,
      appeler({ axeId: "monetisation", materialite: "moyenne", resoutGuet: null, axeManquantPropose: null }),
    );

    expect(writes[1].patch.axe_id).toBeNull();
    expect(report.outcomes[0]).toMatchObject({ axeId: null, axeIncoherent: true });
  });

  it("garde « aucun axe » : un item avec driver, sans axe, reste visible comme tel", async () => {
    const { client } = fakeClient();
    const report = await classifyVeilleItems(
      client,
      [item()],
      CTX,
      appeler({ axeId: null, materialite: "haute", resoutGuet: null, axeManquantPropose: "Canal du Fed souverain" }),
    );

    expect(report.outcomes[0]).toMatchObject({
      axeId: null,
      materialite: "haute",
      axeManquantPropose: "Canal du Fed souverain",
    });
  });

  it("montre les axes et les guets au modèle, et ne lui laisse citer que ceux-là", async () => {
    const { client } = fakeClient();
    const caller = appeler({ axeId: null, materialite: "faible", resoutGuet: null, axeManquantPropose: null });
    await classifyVeilleItems(client, [item()], { ...CTX, guets: [{ id: "g1", driverId: "rates", libelle: "FOMC", attendu: "a", confirmeSi: "b", infirmeSi: "c" }] }, caller);

    const appel = (caller as unknown as { mock: { calls: Array<[{ user: string; schema: { safeParse: (v: unknown) => { success: boolean } } }]> } }).mock.calls[0][0];
    expect(appel.user).toContain("inflation-sous-jacente");
    expect(appel.user).toContain("g1 | driver rates | FOMC");
    const base = { id: "abc123", isSignal: true, nature: "flux", driverRefs: ["rates"], channels: [], zones: ["us"], horizon: "immediat", materialite: "faible", axeManquantPropose: null, reasoning: "r" };
    // Un axe ou un guet inconnu est refusé par le schéma, jamais écrit.
    expect(appel.schema.safeParse({ items: [{ ...base, axeId: "inventé", resoutGuet: null }] }).success).toBe(false);
    expect(appel.schema.safeParse({ items: [{ ...base, axeId: null, resoutGuet: "inventé" }] }).success).toBe(false);
    expect(appel.schema.safeParse({ items: [{ ...base, axeId: "monetisation", resoutGuet: "g1" }] }).success).toBe(true);
  });

  it("sans grille fournie, aucun axe ni guet n'est acceptable : seul null passe", async () => {
    const { client } = fakeClient();
    const caller = appeler({ axeId: null, materialite: "faible", resoutGuet: null, axeManquantPropose: null });
    await classifyVeilleItems(client, [item()], CONTEXT, caller);

    const appel = (caller as unknown as { mock: { calls: Array<[{ schema: { safeParse: (v: unknown) => { success: boolean } } }]> } }).mock.calls[0][0];
    const base = { id: "abc123", isSignal: true, nature: "flux", driverRefs: ["rates"], channels: [], zones: ["us"], horizon: "immediat", materialite: "faible", axeManquantPropose: null, resoutGuet: null, reasoning: "r" };
    expect(appel.schema.safeParse({ items: [{ ...base, axeId: "monetisation" }] }).success).toBe(false);
    expect(appel.schema.safeParse({ items: [{ ...base, axeId: null }] }).success).toBe(true);
  });
});

describe("classifyVeilleItems — un item fautif ne fait pas perdre tout son lot", () => {
  it("rejoue un lot rejeté item par item, et ne fait échouer que l'item fautif", async () => {
    const { client, writes } = fakeClient();
    let appels = 0;
    const caller = vi.fn(async (req: { user: string }) => {
      appels += 1;
      // Le lot de trois est rejeté ; rejoué seul, « def456 » échoue encore, pas les deux autres.
      if (req.user.includes("def456")) throw new Error("canal invalide");
      const ids = [...req.user.matchAll(/id=(\w+)/g)].map((m) => m[1]);
      return { value: { items: ids.map((id) => classification({ id })) }, usage: { input: 1, output: 1 } };
    }) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(
      client,
      [item({ id: "abc123" }), item({ id: "def456" }), item({ id: "ghi789" })],
      CONTEXT,
      caller,
    );

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.outcomes.find((o) => !o.ok)).toMatchObject({ id: "def456", error: "canal invalide" });
    // Un appel pour le lot, puis un par item.
    expect(appels).toBe(4);
    // Rien n'a été écrit pour l'item fautif.
    expect(writes.some((w) => w.id === "def456")).toBe(false);
  });

  it("n'isole qu'une fois : un item seul qui échoue n'est pas rejoué", async () => {
    const { client } = fakeClient();
    const caller = vi.fn(async () => {
      throw new Error("réponse malformée");
    }) as unknown as StructuredCaller;

    const report = await classifyVeilleItems(client, [item()], CONTEXT, caller);

    expect(report.failed).toBe(1);
    expect(caller).toHaveBeenCalledTimes(1);
  });
});
