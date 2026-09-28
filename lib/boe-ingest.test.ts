import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runBoeIngest } from "./ingest";
import { BOE_SERIES, type BoeMapping } from "@/config/boe-series";

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
const UK_POLICY_RATE = BOE_SERIES.find((m) => m.target.id === "uk-policy-rate")!;

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

describe("runBoeIngest — écriture", () => {
  it("écrit dans macro_observations sous la source Bank of England", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 3.75 }] });

    await runBoeIngest(client, { now: NOW, fetcher, series: [UK_POLICY_RATE] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "uk-policy-rate",
        date: "2026-09-25",
        value: 3.75,
        source: "Bank of England",
        fetched_at: NOW.toISOString(),
      },
    ]);
  });

  it("fait une mise à jour sur conflit (indicator_id, date)", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-09-25", value: 3.75 }] });

    await runBoeIngest(client, { now: NOW, fetcher, series: [UK_POLICY_RATE] });

    const write = writes.find((w) => w.table === "macro_observations");
    expect(write?.options).toEqual({ onConflict: "indicator_id,date" });
  });
});

describe("runBoeIngest — fraîcheur et échecs", () => {
  it("traite une réponse vide comme un succès", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runBoeIngest(client, { now: NOW, fetcher, series: [UK_POLICY_RATE] });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("n'écrit rien quand la série est rejetée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "HTTP 500" });

    const report = await runBoeIngest(client, { now: NOW, fetcher, series: [UK_POLICY_RATE] });

    expect(report.failed).toBe(1);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
  });

  it("n'appelle la série qu'une seule fois par passage", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runBoeIngest(client, { now: NOW, fetcher, series: [UK_POLICY_RATE] });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
