import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runAlphaVantageIngest } from "./ingest";
import { ALPHA_VANTAGE_SERIES, type AlphaVantageMapping } from "@/config/alpha-vantage-series";

type Write = { table: string; rows: unknown[]; options?: unknown };

/** Un faux client Supabase qui enregistre ce qu'on lui demande d'écrire, options comprises. */
function fakeClient() {
  const writes: Write[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(rows: unknown | unknown[], options?: unknown) {
          writes.push({ table, rows: Array.isArray(rows) ? rows : [rows], options });
          return Promise.resolve({ error: null });
        },
        select() {
          return {
            eq() {
              return { maybeSingle: () => Promise.resolve({ data: null }) };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

const NOW = new Date("2026-09-28T06:00:00Z");

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

const mapping = (id: string): AlphaVantageMapping =>
  ALPHA_VANTAGE_SERIES.find((m) => m.target.id === id)!;

const SX5E = mapping("sx5e");
const SILVER = mapping("silver");

describe("runAlphaVantageIngest — écriture", () => {
  it("écrit dans observations sous la source Alpha Vantage, jamais dans macro_observations", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 169.6 }] });

    await runAlphaVantageIngest(client, "clé", { now: NOW, fetcher, series: [SX5E] });

    expect(rowsFor(writes, "observations")).toEqual([
      {
        instrument_id: "sx5e",
        date: "2026-09-25",
        value: 169.6,
        source: "Alpha Vantage",
        fetched_at: NOW.toISOString(),
      },
    ]);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("fait une mise à jour sur conflit (instrument_id, date)", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 64.42 }] });

    await runAlphaVantageIngest(client, "clé", { now: NOW, fetcher, series: [SILVER] });

    const write = writes.find((w) => w.table === "observations");
    expect(write?.options).toEqual({ onConflict: "instrument_id,date" });
  });
});

describe("runAlphaVantageIngest — fraîcheur et journalisation séparée", () => {
  it("journalise dans series_health sous « Alpha Vantage », jamais sous une autre source", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 169.6 }] });

    await runAlphaVantageIngest(client, "clé", { now: NOW, fetcher, series: [SX5E] });

    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(1);
    expect(health[0].source).toBe("Alpha Vantage");
    expect(health[0].series_key).toBe("C50.PAR");
    expect(health[0].target_kind).toBe("instrument");
    expect(health[0].target_id).toBe("sx5e");
  });

  it("traite une réponse vide comme un succès", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E, SILVER],
      spacingMs: 0,
    });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });
});

describe("runAlphaVantageIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand le symbole est rejeté", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: false as const,
      error: "Alpha Vantage — Invalid API call. Please retry or visit the documentation.",
    });

    const report = await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E],
    });

    expect(rowsFor(writes, "observations")).toHaveLength(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].error).toContain("Invalid API call");
  });
});

describe("runAlphaVantageIngest — résilience et limite d'appels", () => {
  it("poursuit les autres symboles quand l'un échoue — un refus de quota n'en emporte pas d'autres", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: AlphaVantageMapping) =>
      m.target.id === "sx5e"
        ? { ok: false as const, error: "Alpha Vantage — plafond d'appels dépassé" }
        : { ok: true as const, points: [{ date: "2026-09-25", value: 64.42 }] };

    const report = await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E, SILVER],
      spacingMs: 0,
    });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
    expect(rowsFor(writes, "observations").map((r) => r.instrument_id)).toEqual(["silver"]);
  });

  it("n'appelle chaque symbole qu'une seule fois — un appel par symbole et par jour", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E, SILVER],
      spacingMs: 0,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("espace les appels — constaté en production le 29/09 : sans espacement, 4 échecs sur 7 par manque d'1 s entre appels", async () => {
    const { client } = fakeClient();
    const calledAt: number[] = [];
    const fetcher = vi.fn(async () => {
      calledAt.push(Date.now());
      return { ok: true as const, points: [] };
    });

    await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E, SILVER],
      spacingMs: 30,
    });

    expect(calledAt).toHaveLength(2);
    // `setTimeout(30)` peut se déclencher une milliseconde avant les 30 ms mesurées par `Date.now()`
    // (granularité du minuteur) : exiger 30 pile rendait ce test instable, 3 fois sur 8. Sans
    // espacement, l'écart serait d'environ zéro — 25 ms suffit à prouver qu'il existe.
    expect(calledAt[1] - calledAt[0]).toBeGreaterThanOrEqual(25);
  });

  it("n'attend pas avant le premier appel ni après le dernier", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));
    const startedAt = Date.now();

    await runAlphaVantageIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [SX5E],
      spacingMs: 5_000,
    });

    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
