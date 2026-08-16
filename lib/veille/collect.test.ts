import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runVeilleCollect, type VeilleCollector } from "./collect";
import type { RawVeilleCandidate } from "./filter";

type Write = { table: string; rows: unknown[] };
type Delete = { table: string; column: string; value: unknown };

/**
 * Un faux client Supabase qui couvre les formes utilisées par `collect.ts` : l'upsert de santé
 * et d'items, la lecture du compteur d'échecs précédent, le comptage du jour, et la purge.
 */
function fakeClient(
  options: {
    existingFailures?: Record<string, number>;
    deletedIds?: string[];
    alreadyToday?: number;
  } = {},
) {
  const writes: Write[] = [];
  const deletes: Delete[] = [];
  const existingFailures = options.existingFailures ?? {};
  const deletedIds = options.deletedIds ?? [];
  const alreadyToday = options.alreadyToday ?? 0;

  const client = {
    from(table: string) {
      return {
        upsert(rows: unknown | unknown[]) {
          writes.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
          return Promise.resolve({ error: null });
        },
        select(_columns?: string, opts?: { count?: string; head?: boolean }) {
          if (opts?.count) {
            // Le comptage du jour (`countItemsCollectedToday`) : `.select(..., {count,head}).gte(...)`.
            return { gte: () => Promise.resolve({ count: alreadyToday, error: null }) };
          }
          return {
            eq(column: string, value: unknown) {
              const key = typeof value === "string" ? value : undefined;
              return {
                maybeSingle: () =>
                  Promise.resolve({
                    data:
                      column === "collector" && key !== undefined && key in existingFailures
                        ? { consecutive_failures: existingFailures[key] }
                        : null,
                  }),
              };
            },
          };
        },
        delete() {
          return {
            lt(column: string, value: unknown) {
              deletes.push({ table, column, value });
              return {
                select: () => Promise.resolve({ data: deletedIds.map((id) => ({ id })), error: null }),
              };
            },
          };
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient, writes, deletes };
}

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

const NOW = new Date("2026-08-16T06:00:05Z");

function collector(name: string, run: VeilleCollector["run"]): VeilleCollector {
  return { name, run };
}

function candidate(overrides: Partial<RawVeilleCandidate> = {}): RawVeilleCandidate {
  return {
    title: "La Fed maintient son taux directeur",
    url: "https://example.org/fed-taux",
    source: "Federal Reserve",
    sourceAuthority: 3,
    publishedAt: "2026-08-16T00:00:00Z",
    zones: ["us"],
    ...overrides,
  };
}

describe("runVeilleCollect — isolation par collecteur", () => {
  it("l'échec d'un collecteur n'empêche pas les suivants de s'exécuter", async () => {
    const { client, writes } = fakeClient();
    const order: string[] = [];
    const collectors = [
      collector("A", async () => {
        order.push("A");
        throw new Error("panne réseau");
      }),
      collector("B", async () => {
        order.push("B");
        return { candidates: [candidate()] };
      }),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(order).toEqual(["A", "B"]);
    expect(report.outcomes).toEqual([
      { collector: "A", ok: false, harvested: 0, skipped: false, error: "panne réseau" },
      { collector: "B", ok: true, harvested: 1, skipped: false },
    ]);
    const health = rowsFor(writes, "veille_health");
    expect(health.find((r) => r.collector === "A")?.last_error).toBe("panne réseau");
    expect(health.find((r) => r.collector === "B")?.last_success_at).toBe(NOW.toISOString());
  });

  it("n'écrit jamais dans series_health — la table est distincte de celle de FRED", async () => {
    const { client, writes } = fakeClient();
    const collectors = [collector("GDELT", async () => ({ candidates: [candidate()] }))];

    await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(rowsFor(writes, "series_health")).toHaveLength(0);
    expect(rowsFor(writes, "veille_health")).toHaveLength(1);
  });

  it("cumule les échecs consécutifs sans jamais toucher last_success_at", async () => {
    const { client, writes } = fakeClient({ existingFailures: { GDELT: 2 } });
    const collectors = [
      collector("GDELT", async () => {
        throw new Error("HTTP 503");
      }),
    ];

    await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    const row = rowsFor(writes, "veille_health")[0];
    expect(row.consecutive_failures).toBe(3);
    expect(row).not.toHaveProperty("last_success_at");
  });
});

describe("runVeilleCollect — budget de temps", () => {
  it("marque un collecteur skipped, pas en échec, quand le budget est épuisé", async () => {
    const { client } = fakeClient();
    const collectors = [
      collector("institutional", async () => ({ candidates: [candidate()] })),
      collector("GDELT", async () => ({ candidates: [candidate()] })),
    ];

    // Budget quasi nul : le premier collecteur ne devrait déjà plus avoir le temps de démarrer.
    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 1, collectors });

    expect(report.outcomes.every((o) => o.skipped)).toBe(true);
    expect(report.outcomes.every((o) => o.ok)).toBe(true);
  });

  it("laisse un collecteur lent consommer le reste du budget sans bloquer le rapport", async () => {
    const { client } = fakeClient();
    const collectors = [collector("GDELT", async () => ({ candidates: [candidate(), candidate()] }))];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 5_000, collectors });

    expect(report.outcomes).toEqual([{ collector: "GDELT", ok: true, harvested: 2, skipped: false }]);
  });
});

describe("runVeilleCollect — passe 1 : filtre par mot-clé", () => {
  it("écarte un candidat qui ne cite ni driver ni canal de transmission", async () => {
    const { client } = fakeClient();
    const collectors = [
      collector("institutional", async () => ({
        candidates: [candidate({ title: "Le musée du Louvre prolonge une exposition" })],
      })),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(report.gated).toBe(0);
    expect(report.written).toBe(0);
  });

  it("retient un candidat dont le titre cite un mot-clé de driver", async () => {
    const { client, writes } = fakeClient();
    const collectors = [
      collector("institutional", async () => ({
        candidates: [candidate({ title: "La Fed maintient son taux directeur" })],
      })),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(report.gated).toBe(1);
    expect(report.written).toBe(1);
    const item = rowsFor(writes, "veille_items")[0];
    expect(item.driver_refs).toEqual(["rates"]);
    expect(item.status).toBe("nouveau");
  });

  it("retient un candidat dont le driverRefs est pré-attaché par le collecteur (EDGAR)", async () => {
    const { client } = fakeClient();
    const collectors = [
      collector("SEC EDGAR", async () => ({
        candidates: [
          candidate({
            title: "Nvidia — dépôt 8-K du 2026-08-15",
            driverRefs: ["ai"],
          }),
        ],
      })),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(report.gated).toBe(1);
  });
});

describe("runVeilleCollect — plafond quotidien", () => {
  it("classe par autorité de source puis par correspondance thématique avant de couper", async () => {
    const { client, writes } = fakeClient();
    const collectors = [
      collector("mixte", async () => ({
        candidates: [
          candidate({ title: "Fed rate hike", source: "GDELT", sourceAuthority: 1, url: "u1" }),
          candidate({
            title: "Fed rate hike affects real yield",
            source: "Federal Reserve",
            sourceAuthority: 3,
            url: "u2",
          }),
        ],
      })),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(report.written).toBe(2);
    const items = rowsFor(writes, "veille_items");
    // La source la plus autorisée en tête.
    expect(items[0].source).toBe("Federal Reserve");
    expect(items[1].source).toBe("GDELT");
  });

  it("ne retient rien si le plafond du jour est déjà atteint", async () => {
    const { client, writes } = fakeClient({ alreadyToday: 40 });
    const collectors = [
      collector("institutional", async () => ({ candidates: [candidate()] })),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(report.gated).toBe(1);
    expect(report.written).toBe(0);
    expect(rowsFor(writes, "veille_items")).toHaveLength(0);
  });
});

describe("runVeilleCollect — purge", () => {
  it("supprime les items de plus de quinze jours et compte ce qui a été retiré", async () => {
    const { client, deletes } = fakeClient({ deletedIds: ["a", "b"] });

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors: [] });

    expect(report.purged).toBe(2);
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toEqual({
      table: "veille_items",
      column: "published_at",
      value: "2026-08-01T06:00:05.000Z",
    });
  });
});
