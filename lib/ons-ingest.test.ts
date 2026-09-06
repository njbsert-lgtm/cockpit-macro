import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { onsSeriesKey, runOnsIngest } from "./ingest";
import { ONS_SERIES, type OnsMapping } from "@/config/ons-series";

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

const NOW = new Date("2026-08-15T06:00:00Z");

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

const mapping = (id: string): OnsMapping => ONS_SERIES.find((m) => m.target.id === id)!;

const CPI = mapping("uk-cpi");
const GDP = mapping("uk-gdp");

describe("runOnsIngest — écriture", () => {
  it("écrit dans macro_observations sous la source ONS, datée du relevé", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 3.8 }] });

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "uk-cpi",
        date: "2026-07-01",
        value: 3.8,
        source: "ONS",
        fetched_at: NOW.toISOString(),
      },
    ]);
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });

  it("fait une mise à jour sur conflit (indicator_id, date) : une révision écrase, elle n'est pas ignorée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-04-01", value: 0.3 }] });

    await runOnsIngest(client, { now: NOW, fetcher, series: [GDP] });

    const write = writes.find((w) => w.table === "macro_observations");
    expect(write?.options).toEqual({ onConflict: "indicator_id,date" });
    expect(write?.options).not.toHaveProperty("ignoreDuplicates");
  });

  it("réécrit toute la fenêtre, pas seulement le dernier point", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: true as const,
      points: [
        { date: "2026-05-01", value: 3.5 },
        { date: "2026-06-01", value: 3.7 },
        { date: "2026-07-01", value: 3.8 },
      ],
    });

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    const rows = rowsFor(writes, "macro_observations");
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.fetched_at === NOW.toISOString())).toBe(true);
  });
});

describe("runOnsIngest — fraîcheur et journalisation séparée", () => {
  it("journalise dans series_health sous « ONS », jamais sous une autre source", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 3.8 }] });

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(1);
    expect(health[0].source).toBe("ONS");
    expect(health[0].series_key).toBe(onsSeriesKey(CPI));
    expect(health[0].target_kind).toBe("macro");
    expect(health[0].target_id).toBe("uk-cpi");
  });

  it("rafraîchit last_success_at à chaque passage réussi", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 3.8 }] });

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_success_at).toBe(NOW.toISOString());
    expect(health.consecutive_failures).toBe(0);
    expect(health.latest_observation).toBe("2026-07-01");
  });

  it("traite une réponse vide comme un succès — pas de publication n'est pas une panne", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runOnsIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(2);
    expect(health.every((r) => r.last_success_at === NOW.toISOString())).toBe(true);
  });
});

describe("runOnsIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand la série est rejetée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: false as const,
      error: "valeur hors bornes en 2026 JUL : 9999",
    });

    const report = await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].error).toContain("hors bornes");
  });

  it("enregistre l'échec sans toucher last_success_at, qui porte la fraîcheur", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "HTTP 503" });

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_error).toBe("HTTP 503");
    expect(health.consecutive_failures).toBe(1);
    expect(health).not.toHaveProperty("last_success_at");
    expect(health.source).toBe("ONS");
  });
});

describe("runOnsIngest — résilience", () => {
  it("poursuit les autres séries quand l'une échoue", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: OnsMapping) =>
      m.target.id === "uk-cpi"
        ? { ok: false as const, error: "panne isolée" }
        : { ok: true as const, points: [{ date: "2026-04-01", value: 0.3 }] };

    const report = await runOnsIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
    const written = rowsFor(writes, "macro_observations");
    expect(written.map((r) => r.indicator_id)).toEqual(["uk-gdp"]);
  });

  it("n'appelle chaque série qu'une seule fois — un appel par série et par jour", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runOnsIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("cohérence de la configuration ONS avec le reste du dispositif", () => {
  it("ne réclame aucun indicateur déjà collecté par FRED — un identifiant, une source", async () => {
    const { FRED_SERIES } = await import("@/config/fred-series");
    const fredTargets = new Set(FRED_SERIES.map((m) => m.target.id));
    const disputed = ONS_SERIES.filter((m) => fredTargets.has(m.target.id)).map((m) => m.target.id);
    expect(disputed).toEqual([]);
  });

  it("ne vise que des indicateurs présents au catalogue", async () => {
    const { getMacroIndicators } = await import("./data");
    const known = new Set(getMacroIndicators().map((i) => i.id));
    const orphans = ONS_SERIES.filter((m) => !known.has(m.target.id)).map((m) => m.target.id);
    expect(orphans).toEqual([]);
  });

  it("ne vise que la zone uk", () => {
    for (const m of ONS_SERIES) {
      expect(m.zone).toBe("uk");
      expect(m.target.id.startsWith("uk-")).toBe(true);
    }
  });
});

describe("onsSeriesKey", () => {
  it("porte la série et le dataset qui la sert", () => {
    expect(onsSeriesKey(CPI)).toBe("D7G7/MM23");
  });

  it("reste unique série par série sur la configuration réelle", () => {
    const keys = ONS_SERIES.map(onsSeriesKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
