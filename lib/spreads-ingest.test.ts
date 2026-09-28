import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runSpreadIngest } from "./ingest";
import type { Observation } from "./types";
import { SPREAD_DEFINITIONS } from "@/config/spreads";

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
      };
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

const NOW = new Date("2026-09-28T04:00:00Z");

const obs = (id: string, date: string, value: number): Observation => ({
  instrumentId: id,
  date,
  value,
  source: "FRED",
  fetchedAt: "2026-09-01T04:00:00Z",
});

const rowsFor = (writes: Write[]) =>
  writes.filter((w) => w.table === "observations").flatMap((w) => w.rows) as Array<
    Record<string, unknown>
  >;

describe("runSpreadIngest — écriture", () => {
  it("calcule et écrit les deux spreads à partir des jambes lues en base", async () => {
    const { client, writes } = fakeClient();
    const legs: Record<string, Observation[]> = {
      us10y: [obs("us10y", "2026-09-01", 4.3)],
      de10y: [obs("de10y", "2026-09-01", 3.0)],
      fr10y: [obs("fr10y", "2026-09-01", 3.7)],
    };
    const readLeg = async (_c: SupabaseClient, id: string) => legs[id] ?? [];

    const report = await runSpreadIngest(client, { now: NOW, readLeg });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    const rows = rowsFor(writes);
    expect(rows).toContainEqual({
      instrument_id: "spread-us10y-bund10y",
      date: "2026-09-01",
      value: 1.2999999999999998,
      source: "Calculé (FRED)",
      fetched_at: NOW.toISOString(),
    });
    expect(rows).toContainEqual({
      instrument_id: "spread-oat10y-bund10y",
      date: "2026-09-01",
      value: 0.7000000000000002,
      source: "Calculé (FRED)",
      fetched_at: NOW.toISOString(),
    });
  });

  it("fait une mise à jour sur conflit (instrument_id, date)", async () => {
    const { client, writes } = fakeClient();
    const legs: Record<string, Observation[]> = {
      us10y: [obs("us10y", "2026-09-01", 4.3)],
      de10y: [obs("de10y", "2026-09-01", 3.0)],
    };
    const readLeg = async (_c: SupabaseClient, id: string) => legs[id] ?? [];

    await runSpreadIngest(client, {
      now: NOW,
      readLeg,
      definitions: [SPREAD_DEFINITIONS[0]],
    });

    const write = writes.find((w) => w.table === "observations");
    expect(write?.options).toEqual({ onConflict: "instrument_id,date" });
  });
});

describe("runSpreadIngest — une jambe manquante n'est pas un échec", () => {
  it("traite l'absence de recoupement entre les deux jambes comme un succès à vide", async () => {
    const { client, writes } = fakeClient();
    const readLeg = async () => [] as Observation[];

    const report = await runSpreadIngest(client, { now: NOW, readLeg });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes)).toHaveLength(0);
  });
});

describe("runSpreadIngest — résilience", () => {
  it("l'échec d'écriture d'un spread n'empêche pas l'autre", async () => {
    const legs: Record<string, Observation[]> = {
      us10y: [obs("us10y", "2026-09-01", 4.3)],
      de10y: [obs("de10y", "2026-09-01", 3.0)],
      fr10y: [obs("fr10y", "2026-09-01", 3.7)],
    };
    const readLeg = async (_c: SupabaseClient, id: string) => legs[id] ?? [];

    let call = 0;
    const client = {
      from(table: string) {
        return {
          upsert(rows: unknown[]) {
            call += 1;
            if (call === 1) return Promise.resolve({ error: { message: "refus temporaire" } });
            return Promise.resolve({ error: null });
          },
        };
      },
    } as unknown as SupabaseClient;

    const report = await runSpreadIngest(client, { now: NOW, readLeg });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
  });
});
