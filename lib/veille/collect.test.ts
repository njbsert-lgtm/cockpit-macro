import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runVeilleCollect, type VeilleCollector } from "./collect";

type Write = { table: string; rows: unknown[] };
type Delete = { table: string; column: string; value: unknown };

/**
 * Un faux client Supabase qui couvre les trois formes utilisées par `collect.ts` : l'upsert de
 * santé, la lecture du compteur d'échecs précédent, et la purge par suppression filtrée.
 */
function fakeClient(options: { existingFailures?: Record<string, number>; deletedIds?: string[] } = {}) {
  const writes: Write[] = [];
  const deletes: Delete[] = [];
  const existingFailures = options.existingFailures ?? {};
  const deletedIds = options.deletedIds ?? [];

  const client = {
    from(table: string) {
      return {
        upsert(rows: unknown | unknown[]) {
          writes.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
          return Promise.resolve({ error: null });
        },
        select() {
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
        return { written: 3 };
      }),
    ];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 10_000, collectors });

    expect(order).toEqual(["A", "B"]);
    expect(report.outcomes).toEqual([
      { collector: "A", ok: false, written: 0, skipped: false, error: "panne réseau" },
      { collector: "B", ok: true, written: 3, skipped: false },
    ]);
    const health = rowsFor(writes, "veille_health");
    expect(health.find((r) => r.collector === "A")?.last_error).toBe("panne réseau");
    expect(health.find((r) => r.collector === "B")?.last_success_at).toBe(NOW.toISOString());
  });

  it("n'écrit jamais dans series_health — la table est distincte de celle de FRED", async () => {
    const { client, writes } = fakeClient();
    const collectors = [collector("GDELT", async () => ({ written: 1 }))];

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
      collector("institutional", async () => ({ written: 1 })),
      collector("GDELT", async () => ({ written: 99 })),
    ];

    // Budget quasi nul : le premier collecteur ne devrait déjà plus avoir le temps de démarrer.
    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 1, collectors });

    expect(report.outcomes.every((o) => o.skipped)).toBe(true);
    expect(report.outcomes.every((o) => o.ok)).toBe(true);
  });

  it("laisse un collecteur lent consommer le reste du budget sans bloquer le rapport", async () => {
    const { client } = fakeClient();
    const collectors = [collector("GDELT", async () => ({ written: 12 }))];

    const report = await runVeilleCollect(client, { now: NOW, budgetMs: 5_000, collectors });

    expect(report.outcomes).toEqual([{ collector: "GDELT", ok: true, written: 12, skipped: false }]);
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
