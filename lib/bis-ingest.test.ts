import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runBisIngest } from "./ingest";
import { BIS_SERIES } from "@/config/bis-series";

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

const NOW = new Date("2026-10-04T06:00:00Z");
const CN = BIS_SERIES.find((m) => m.target.id === "cn-policy-rate")!;
const JP = BIS_SERIES.find((m) => m.target.id === "jp-debt-gdp")!;

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

describe("runBisIngest", () => {
  it("écrit dans macro_observations sous la source BIS", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-01", value: 3 }] });

    const rapport = await runBisIngest(client, { now: NOW, fetcher, series: [CN] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "cn-policy-rate",
        date: "2026-08-01",
        value: 3,
        source: "BIS",
        fetched_at: NOW.toISOString(),
      },
    ]);
    expect(rapport.ok).toBe(1);
  });

  it("n'écrit rien d'une réponse en échec, et journalise l'échec", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "HTTP 406" });

    const rapport = await runBisIngest(client, { now: NOW, fetcher, series: [JP] });

    expect(rowsFor(writes, "macro_observations")).toEqual([]);
    expect(rapport.failed).toBe(1);
    expect(rowsFor(writes, "series_health")[0]).toMatchObject({ source: "BIS", target_id: "jp-debt-gdp" });
  });

  it("traite une réponse vide comme un succès sans écriture", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const rapport = await runBisIngest(client, { now: NOW, fetcher, series: [CN] });

    expect(rowsFor(writes, "macro_observations")).toEqual([]);
    expect(rapport.ok).toBe(1);
  });

  it("s'arrête quand le budget de temps est épuisé", async () => {
    const { client } = fakeClient();
    let appels = 0;
    const fetcher = async () => {
      appels++;
      return { ok: true as const, points: [] };
    };
    await runBisIngest(client, { now: NOW, fetcher, series: [CN, JP], deadline: Date.now() - 1 });
    expect(appels).toBe(0);
  });
});
