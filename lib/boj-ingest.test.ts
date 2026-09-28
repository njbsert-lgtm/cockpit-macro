import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runBojIngest } from "./ingest";
import { BOJ_SERIES, type BojMapping } from "@/config/boj-series";

type Write = { table: string; rows: unknown[]; options?: unknown };

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
          return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

const NOW = new Date("2026-09-28T06:00:00Z");
const JP_POLICY_RATE = BOJ_SERIES.find((m) => m.target.id === "jp-policy-rate")!;

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

describe("runBojIngest — écriture", () => {
  it("écrit dans macro_observations sous la source Bank of Japan", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 0.977 }] });

    await runBojIngest(client, { now: NOW, fetcher, series: [JP_POLICY_RATE] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "jp-policy-rate",
        date: "2026-09-25",
        value: 0.977,
        source: "Bank of Japan",
        fetched_at: NOW.toISOString(),
      },
    ]);
  });
});

describe("runBojIngest — fraîcheur et échecs", () => {
  it("traite une réponse vide comme un succès", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runBojIngest(client, { now: NOW, fetcher, series: [JP_POLICY_RATE] });

    expect(report.ok).toBe(1);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("n'écrit rien quand la série est rejetée (ex. erreur applicative BoJ)", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "API BoJ — statut 400" });

    const report = await runBojIngest(client, { now: NOW, fetcher, series: [JP_POLICY_RATE] });

    expect(report.failed).toBe(1);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("n'appelle la série qu'une seule fois par passage", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runBojIngest(client, { now: NOW, fetcher, series: [JP_POLICY_RATE] });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
