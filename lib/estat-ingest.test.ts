import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estatSeriesKey, runEstatIngest } from "./ingest";
import { ESTAT_SERIES, type EstatMapping } from "@/config/estat-series";

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

const NOW = new Date("2026-09-18T06:00:00Z");
const APP_ID = "APPID";

const rowsFor = (writes: Write[], table: string) =>
  writes.filter((w) => w.table === table).flatMap((w) => w.rows) as Array<Record<string, unknown>>;

const mapping = (id: string): EstatMapping => ESTAT_SERIES.find((m) => m.target.id === id)!;

const CPI = mapping("jp-cpi");
const WAGES = mapping("jp-wages");

describe("runEstatIngest — écriture", () => {
  it("écrit dans macro_observations sous la source e-Stat, datée du relevé", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-01", value: 3.9 }] });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "jp-cpi",
        date: "2026-08-01",
        value: 3.9,
        source: "e-Stat",
        fetched_at: NOW.toISOString(),
      },
    ]);
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });

  it("passe la clé (appId) au fetcher", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    expect(fetcher).toHaveBeenCalledWith(CPI, APP_ID, NOW);
  });

  it("fait une mise à jour sur conflit (indicator_id, date), pas un ignore", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-01-01", value: -1.3 }] });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [WAGES] });

    const write = writes.find((w) => w.table === "macro_observations");
    expect(write?.options).toEqual({ onConflict: "indicator_id,date" });
    expect(write?.options).not.toHaveProperty("ignoreDuplicates");
  });

  it("réécrit toute la fenêtre, pas seulement le dernier point", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: true as const,
      points: [
        { date: "2026-06-01", value: 3.7 },
        { date: "2026-07-01", value: 3.8 },
        { date: "2026-08-01", value: 3.9 },
      ],
    });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    const rows = rowsFor(writes, "macro_observations");
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.fetched_at === NOW.toISOString())).toBe(true);
  });
});

describe("runEstatIngest — fraîcheur et journalisation séparée", () => {
  it("journalise dans series_health sous « e-Stat », jamais sous une autre source", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-01", value: 3.9 }] });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(1);
    expect(health[0].source).toBe("e-Stat");
    expect(health[0].series_key).toBe(estatSeriesKey(CPI));
    expect(health[0].target_kind).toBe("macro");
    expect(health[0].target_id).toBe("jp-cpi");
  });

  it("rafraîchit last_success_at à chaque passage réussi", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-08-01", value: 3.9 }] });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_success_at).toBe(NOW.toISOString());
    expect(health.consecutive_failures).toBe(0);
    expect(health.latest_observation).toBe("2026-08-01");
  });

  it("traite une réponse vide comme un succès — pas de publication n'est pas une panne", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI, WAGES] });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(2);
    expect(health.every((r) => r.last_success_at === NOW.toISOString())).toBe(true);
  });
});

describe("runEstatIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand la série est rejetée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: false as const,
      error: "valeur hors bornes en 2026000808 : 9999",
    });

    const report = await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].error).toContain("hors bornes");
  });

  it("enregistre l'échec sans toucher last_success_at, qui porte la fraîcheur", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "HTTP 503" });

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_error).toBe("HTTP 503");
    expect(health.consecutive_failures).toBe(1);
    expect(health).not.toHaveProperty("last_success_at");
    expect(health.source).toBe("e-Stat");
  });
});

describe("runEstatIngest — résilience", () => {
  it("poursuit les autres séries quand l'une échoue", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: EstatMapping) =>
      m.target.id === "jp-cpi"
        ? { ok: false as const, error: "panne isolée" }
        : { ok: true as const, points: [{ date: "2026-01-01", value: -1.3 }] };

    const report = await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI, WAGES] });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
    const written = rowsFor(writes, "macro_observations");
    expect(written.map((r) => r.indicator_id)).toEqual(["jp-wages"]);
  });

  it("n'appelle chaque série qu'une seule fois — un appel par série et par jour", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runEstatIngest(client, APP_ID, { now: NOW, fetcher, series: [CPI, WAGES] });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("cohérence de la configuration e-Stat avec le reste du dispositif", () => {
  it("ne réclame aucun indicateur déjà collecté par FRED, Eurostat ou ONS — un identifiant, une source", async () => {
    const { FRED_SERIES } = await import("@/config/fred-series");
    const { EUROSTAT_SERIES } = await import("@/config/eurostat-series");
    const { ONS_SERIES } = await import("@/config/ons-series");
    const others = new Set([
      ...FRED_SERIES.map((m) => m.target.id),
      ...EUROSTAT_SERIES.map((m) => m.target.id),
      ...ONS_SERIES.map((m) => m.target.id),
    ]);
    const disputed = ESTAT_SERIES.filter((m) => others.has(m.target.id)).map((m) => m.target.id);
    expect(disputed).toEqual([]);
  });

  it("ne vise que des indicateurs présents au catalogue", async () => {
    const { getMacroIndicators } = await import("./data");
    const known = new Set(getMacroIndicators().map((i) => i.id));
    const orphans = ESTAT_SERIES.filter((m) => !known.has(m.target.id)).map((m) => m.target.id);
    expect(orphans).toEqual([]);
  });

  it("ne vise que la zone jp", () => {
    for (const m of ESTAT_SERIES) {
      expect(m.zone).toBe("jp");
      expect(m.target.id.startsWith("jp-")).toBe(true);
    }
  });

  it("n'inclut jamais cat01 dans les filtres d'une série cat01Month", () => {
    for (const m of ESTAT_SERIES.filter((m) => m.timeScheme === "cat01Month")) {
      expect(m.filters).not.toHaveProperty("cat01");
    }
  });

  it("exige une raison écrite pour toute série désactivée", () => {
    for (const mapping of ESTAT_SERIES.filter((m) => !m.enabled)) {
      expect(mapping.disabledReason, `${mapping.target.id} est désactivée sans raison`).toBeTruthy();
    }
  });
});

describe("estatSeriesKey", () => {
  it("porte la table et les dimensions fixées", () => {
    expect(estatSeriesKey(CPI)).toBe("0004052037?tab=3,cat01=0001,area=00000");
  });

  it("reste unique série par série sur la configuration réelle", () => {
    const keys = ESTAT_SERIES.map(estatSeriesKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
