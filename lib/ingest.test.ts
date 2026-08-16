import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runIngest } from "./ingest";
import { ENABLED_SERIES, type FredMapping } from "@/config/fred-series";
import type { FredFetchResult } from "./fred";

type Write = { table: string; rows: unknown[] };

/** Un faux client Supabase qui enregistre ce qu'on lui demande d'écrire. */
function fakeClient() {
  const writes: Write[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(rows: unknown | unknown[]) {
          writes.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
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

const NOW = new Date("2026-08-15T06:00:00Z");

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

describe("runIngest — écriture", () => {
  it("écrit les points reçus dans la bonne table, datés du relevé", async () => {
    const { client, writes } = fakeClient();
    const fetcher = vi.fn(
      async (m: FredMapping): Promise<FredFetchResult> =>
        m.seriesId === "DGS10"
          ? { ok: true, points: [{ date: "2026-08-14", value: 4.61 }] }
          : { ok: true, points: [] },
    );

    await runIngest(client, "clef", { now: NOW, fetcher });

    const observations = rowsFor(writes, "observations");
    expect(observations).toContainEqual({
      instrument_id: "us10y",
      date: "2026-08-14",
      value: 4.61,
      source: "FRED",
      fetched_at: NOW.toISOString(),
    });
  });

  it("range les indicateurs macro dans macro_observations, pas dans observations", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: FredMapping): Promise<FredFetchResult> =>
      m.target.kind === "macro"
        ? { ok: true, points: [{ date: "2026-07-01", value: 3.4 }] }
        : { ok: true, points: [] };

    await runIngest(client, "clef", { now: NOW, fetcher });

    const macro = rowsFor(writes, "macro_observations");
    expect(macro.length).toBeGreaterThan(0);
    expect(macro.every((r) => "indicator_id" in r)).toBe(true);
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });

  it("réécrit la fenêtre entière : c'est ce qui rafraîchit fetched_at un jour sans publication", async () => {
    const { client, writes } = fakeClient();
    // FRED renvoie la même clôture qu'hier — un samedi, typiquement.
    const fetcher = async (m: FredMapping): Promise<FredFetchResult> =>
      m.seriesId === "DGS10"
        ? { ok: true, points: [{ date: "2026-08-14", value: 4.61 }] }
        : { ok: true, points: [] };

    await runIngest(client, "clef", { now: NOW, fetcher });

    const written = rowsFor(writes, "observations")[0];
    expect(written.fetched_at).toBe(NOW.toISOString());
    expect(written.date).toBe("2026-08-14");
  });
});

describe("runIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand la réponse est malformée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (): Promise<FredFetchResult> => ({
      ok: false,
      error: "réponse malformée",
    });

    const report = await runIngest(client, "clef", { now: NOW, fetcher });

    expect(rowsFor(writes, "observations")).toHaveLength(0);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    expect(report.ok).toBe(0);
    expect(report.failed).toBe(ENABLED_SERIES.length);
  });

  it("enregistre l'échec sans toucher last_success_at, qui porte la fraîcheur", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (): Promise<FredFetchResult> => ({ ok: false, error: "HTTP 500" });

    await runIngest(client, "clef", { now: NOW, fetcher });

    const health = rowsFor(writes, "series_health");
    expect(health.length).toBeGreaterThan(0);
    for (const row of health) {
      expect(row.last_error).toBe("HTTP 500");
      expect(row.consecutive_failures).toBe(1);
      expect(row).not.toHaveProperty("last_success_at");
    }
  });
});

describe("runIngest — résilience", () => {
  it("poursuit les autres séries quand l'une échoue", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: FredMapping): Promise<FredFetchResult> =>
      m.seriesId === "DGS10"
        ? { ok: false, error: "panne isolée" }
        : { ok: true, points: [{ date: "2026-08-14", value: 1 }] };

    const report = await runIngest(client, "clef", { now: NOW, fetcher });

    expect(report.failed).toBe(1);
    expect(report.ok).toBe(ENABLED_SERIES.length - 1);
    // La série en panne n'a rien écrit, les autres si.
    expect(rowsFor(writes, "observations").some((r) => r.instrument_id === "us10y")).toBe(false);
    expect(rowsFor(writes, "observations").some((r) => r.instrument_id === "us6m")).toBe(true);
  });

  it("traite un tableau vide comme un succès — un week-end n'est pas une panne", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (): Promise<FredFetchResult> => ({ ok: true, points: [] });

    const report = await runIngest(client, "clef", { now: NOW, fetcher });

    expect(report.failed).toBe(0);
    expect(report.ok).toBe(ENABLED_SERIES.length);
    // Aucune observation nouvelle, mais la santé de chaque série est bien rafraîchie : c'est
    // elle qui garde le point de la barre au vert.
    expect(rowsFor(writes, "observations")).toHaveLength(0);
    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(ENABLED_SERIES.length);
    for (const row of health) {
      expect(row.last_success_at).toBe(NOW.toISOString());
      expect(row.consecutive_failures).toBe(0);
    }
  });

  it("ne collecte que les séries actives", async () => {
    const { client } = fakeClient();
    const seen: string[] = [];
    const fetcher = async (m: FredMapping): Promise<FredFetchResult> => {
      seen.push(m.seriesId);
      return { ok: true, points: [] };
    };

    await runIngest(client, "clef", { now: NOW, fetcher });

    expect(seen).toEqual(ENABLED_SERIES.map((m) => m.seriesId));
    expect(seen).not.toContain("USPMI");
    expect(seen).not.toContain("IEABC");
  });

  it("n'appelle chaque série qu'une seule fois — un appel par instrument et par jour", async () => {
    const { client } = fakeClient();
    const calls = new Map<string, number>();
    const fetcher = async (m: FredMapping): Promise<FredFetchResult> => {
      calls.set(m.seriesId, (calls.get(m.seriesId) ?? 0) + 1);
      return { ok: true, points: [] };
    };

    await runIngest(client, "clef", { now: NOW, fetcher });

    for (const count of calls.values()) expect(count).toBe(1);
  });
});

describe("runIngest — projection des métadonnées macro", () => {
  it("réécrit macro_indicators depuis la configuration, cadence de la source comprise", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (): Promise<FredFetchResult> => ({ ok: true, points: [] });

    await runIngest(client, "clef", { now: NOW, fetcher });

    const indicators = rowsFor(writes, "macro_indicators");
    const policyRate = indicators.find((r) => r.id === "us-policy-rate");
    // Le seed la déclarait mensuelle ; FRED la publie quotidiennement, et c'est la source qui
    // fait foi.
    expect(policyRate?.frequency).toBe("business-daily");
    expect(policyRate?.series_key).toBe("DFEDTARU");
  });
});
