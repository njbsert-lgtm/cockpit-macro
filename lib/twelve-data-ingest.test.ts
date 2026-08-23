import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runTwelveDataIngest } from "./ingest";
import { TWELVE_DATA_SERIES, type TwelveDataMapping } from "@/config/twelve-data-series";

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

const NOW = new Date("2026-08-23T06:00:00Z");

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

const mapping = (id: string): TwelveDataMapping =>
  TWELVE_DATA_SERIES.find((m) => m.target.id === id)!;

const GOLD = mapping("gold");
const ACWI = mapping("acwi");

describe("runTwelveDataIngest — écriture", () => {
  it("écrit dans observations sous la source Twelve Data, jamais dans macro_observations", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-21", value: 4608.27 }] });

    await runTwelveDataIngest(client, "clé", { now: NOW, fetcher, series: [GOLD] });

    expect(rowsFor(writes, "observations")).toEqual([
      {
        instrument_id: "gold",
        date: "2026-08-21",
        value: 4608.27,
        source: "Twelve Data",
        fetched_at: NOW.toISOString(),
      },
    ]);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("fait une mise à jour sur conflit (instrument_id, date)", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-21", value: 160.8 }] });

    await runTwelveDataIngest(client, "clé", { now: NOW, fetcher, series: [ACWI] });

    const write = writes.find((w) => w.table === "observations");
    expect(write?.options).toEqual({ onConflict: "instrument_id,date" });
  });
});

describe("runTwelveDataIngest — fraîcheur et journalisation séparée", () => {
  it("journalise dans series_health sous « Twelve Data », jamais sous « FRED » ni « Eurostat »", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-21", value: 4608.27 }] });

    await runTwelveDataIngest(client, "clé", { now: NOW, fetcher, series: [GOLD] });

    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(1);
    expect(health[0].source).toBe("Twelve Data");
    expect(health[0].series_key).toBe("XAU/USD");
    expect(health[0].target_kind).toBe("instrument");
    expect(health[0].target_id).toBe("gold");
  });

  it("traite une réponse vide comme un succès", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runTwelveDataIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [GOLD, ACWI],
    });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });
});

describe("runTwelveDataIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand le symbole est rejeté", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: false as const,
      error: "Twelve Data — This symbol is available starting with the Grow or Venture plan.",
    });

    const report = await runTwelveDataIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [GOLD],
    });

    expect(rowsFor(writes, "observations")).toHaveLength(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].error).toContain("Grow or Venture");
  });
});

describe("runTwelveDataIngest — résilience et limite d'appels", () => {
  it("poursuit les autres symboles quand l'un échoue", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: TwelveDataMapping) =>
      m.target.id === "gold"
        ? { ok: false as const, error: "panne isolée" }
        : { ok: true as const, points: [{ date: "2026-08-21", value: 160.8 }] };

    const report = await runTwelveDataIngest(client, "clé", {
      now: NOW,
      fetcher,
      series: [GOLD, ACWI],
    });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
    expect(rowsFor(writes, "observations").map((r) => r.instrument_id)).toEqual(["acwi"]);
  });

  it("n'appelle chaque symbole qu'une seule fois — un appel par symbole et par jour", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runTwelveDataIngest(client, "clé", { now: NOW, fetcher, series: [GOLD, ACWI] });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
