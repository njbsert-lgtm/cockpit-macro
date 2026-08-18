import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eurostatSeriesKey, runEurostatIngest } from "./ingest";
import { EUROSTAT_SERIES, type EurostatMapping } from "@/config/eurostat-series";

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

const mapping = (id: string): EurostatMapping =>
  EUROSTAT_SERIES.find((m) => m.target.id === id)!;

const CPI = mapping("fr-cpi");
const GDP = mapping("ez-gdp");

describe("runEurostatIngest — écriture", () => {
  it("écrit dans macro_observations sous la source Eurostat, datée du relevé", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 1.9 }] });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toEqual([
      {
        indicator_id: "fr-cpi",
        date: "2026-07-01",
        value: 1.9,
        source: "Eurostat",
        fetched_at: NOW.toISOString(),
      },
    ]);
    // Les indicateurs macro ne passent jamais par la table des instruments.
    expect(rowsFor(writes, "observations")).toHaveLength(0);
  });

  it("fait une mise à jour sur conflit (indicator_id, date) : une révision écrase, elle n'est pas ignorée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-04-01", value: 0.3 }] });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [GDP] });

    const write = writes.find((w) => w.table === "macro_observations");
    expect(write?.options).toEqual({ onConflict: "indicator_id,date" });
    // `ignoreDuplicates` absent : Supabase fait alors un ON CONFLICT DO UPDATE. S'il était posé
    // à vrai, la valeur révisée par Eurostat resterait à la porte.
    expect(write?.options).not.toHaveProperty("ignoreDuplicates");
  });

  it("réécrit toute la fenêtre, pas seulement le dernier point — c'est ce qui rattrape les révisions antérieures", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: true as const,
      points: [
        { date: "2026-05-01", value: 1.7 },
        { date: "2026-06-01", value: 1.8 },
        { date: "2026-07-01", value: 1.9 },
      ],
    });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    const rows = rowsFor(writes, "macro_observations");
    expect(rows).toHaveLength(3);
    // Chaque ligne porte le même `fetched_at` : c'est lui qui porte la fraîcheur, et il se
    // rafraîchit même un jour où Eurostat ne publie rien de neuf.
    expect(rows.every((r) => r.fetched_at === NOW.toISOString())).toBe(true);
  });
});

describe("runEurostatIngest — fraîcheur et journalisation séparée", () => {
  it("journalise dans series_health sous « Eurostat », jamais sous « FRED »", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 1.9 }] });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(1);
    expect(health[0].source).toBe("Eurostat");
    expect(health[0].series_key).toBe(eurostatSeriesKey(CPI));
    expect(health[0].target_kind).toBe("macro");
    expect(health[0].target_id).toBe("fr-cpi");
  });

  it("rafraîchit last_success_at à chaque passage réussi : une série mensuelle ne périme pas entre deux publications", async () => {
    const { client, writes } = fakeClient();
    // Eurostat renvoie la même valeur qu'hier — le cas normal 29 jours sur 30.
    const fetcher = async () => ({ ok: true as const, points: [{ date: "2026-07-01", value: 1.9 }] });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_success_at).toBe(NOW.toISOString());
    expect(health.consecutive_failures).toBe(0);
    // `latest_observation` porte la date du chiffre, séparément : c'est elle qui sert au retard
    // de publication, jamais à la fraîcheur.
    expect(health.latest_observation).toBe("2026-07-01");
  });

  it("traite une réponse vide comme un succès — pas de publication n'est pas une panne", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: true as const, points: [] });

    const report = await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(0);
    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    const health = rowsFor(writes, "series_health");
    expect(health).toHaveLength(2);
    expect(health.every((r) => r.last_success_at === NOW.toISOString())).toBe(true);
  });
});

describe("runEurostatIngest — une réponse invalide n'écrase jamais la dernière valeur valide", () => {
  it("n'écrit aucune observation quand la série est rejetée", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({
      ok: false as const,
      error: "dimension non fixée : age (6 valeurs)",
    });

    const report = await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    expect(rowsFor(writes, "macro_observations")).toHaveLength(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].error).toContain("dimension non fixée");
  });

  it("enregistre l'échec sans toucher last_success_at, qui porte la fraîcheur", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async () => ({ ok: false as const, error: "HTTP 503" });

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI] });

    const health = rowsFor(writes, "series_health")[0];
    expect(health.last_error).toBe("HTTP 503");
    expect(health.consecutive_failures).toBe(1);
    expect(health).not.toHaveProperty("last_success_at");
    expect(health.source).toBe("Eurostat");
  });
});

describe("runEurostatIngest — résilience", () => {
  it("poursuit les autres séries quand l'une échoue", async () => {
    const { client, writes } = fakeClient();
    const fetcher = async (m: EurostatMapping) =>
      m.target.id === "fr-cpi"
        ? { ok: false as const, error: "panne isolée" }
        : { ok: true as const, points: [{ date: "2026-04-01", value: 0.3 }] };

    const report = await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(report.ok).toBe(1);
    expect(report.failed).toBe(1);
    const written = rowsFor(writes, "macro_observations");
    expect(written.map((r) => r.indicator_id)).toEqual(["ez-gdp"]);
  });

  it("n'appelle chaque série qu'une seule fois — un appel par série et par jour", async () => {
    const { client } = fakeClient();
    const fetcher = vi.fn(async () => ({ ok: true as const, points: [] }));

    await runEurostatIngest(client, { now: NOW, fetcher, series: [CPI, GDP] });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("cohérence de la configuration Eurostat avec le reste du dispositif", () => {
  it("ne réclame aucun indicateur déjà collecté par FRED — un identifiant, une source", async () => {
    const { FRED_SERIES } = await import("@/config/fred-series");
    const fredTargets = new Set(FRED_SERIES.map((m) => m.target.id));
    const disputed = EUROSTAT_SERIES.filter((m) => fredTargets.has(m.target.id)).map(
      (m) => m.target.id,
    );
    // Une série moitié FRED moitié Eurostat mentirait sur la provenance de ses points.
    expect(disputed).toEqual([]);
  });

  it("ne vise que des indicateurs présents au catalogue — sinon le chiffre collecté n'aurait aucun écran", async () => {
    const { getMacroIndicators } = await import("./data");
    const known = new Set(getMacroIndicators().map((i) => i.id));
    const orphans = EUROSTAT_SERIES.filter((m) => !known.has(m.target.id)).map((m) => m.target.id);
    expect(orphans).toEqual([]);
  });

  it("range chaque série dans la zone que son identifiant annonce", () => {
    for (const m of EUROSTAT_SERIES) {
      expect(m.target.id.startsWith(`${m.zone}-`)).toBe(true);
    }
  });

  it("fixe explicitement la dimension geo de chaque série", () => {
    for (const m of EUROSTAT_SERIES) {
      expect(m.dimensions.geo, `${m.target.id} sans geo`).toBeTruthy();
    }
  });
});

describe("eurostatSeriesKey", () => {
  it("porte le dataset et toutes ses dimensions : la clé dit quelle série a été lue", () => {
    expect(eurostatSeriesKey(CPI)).toBe("prc_hicp_manr?freq=M,unit=RCH_A,coicop=CP00,geo=FR");
  });

  it("distingue deux séries du même dataset qui ne diffèrent que par une dimension", () => {
    const core = mapping("fr-cpi-core");
    expect(eurostatSeriesKey(core)).not.toBe(eurostatSeriesKey(CPI));
  });
});
