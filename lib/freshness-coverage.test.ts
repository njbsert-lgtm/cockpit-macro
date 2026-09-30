import { describe, expect, it, vi } from "vitest";
import { ENABLED_ESTAT_SERIES } from "@/config/estat-series";

const NOW = new Date("2026-08-18T12:00:00Z");
const RECENT = "2026-08-18T05:00:00Z";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock("./supabase", () => ({
  getFreshReadClient: () => ({
    from: () => ({ select: () => Promise.resolve({ data: rows.value, error: null }) }),
  }),
  missingSupabaseConfig: () => [],
}));

import { getFreshnessSummary } from "./freshness-summary";

describe("getFreshnessSummary — une série active jamais servie ne laisse pas la source verte", () => {
  it("passe e-Stat en périmé quand une de ses séries n'a aucun succès", async () => {
    const [premiere, ...reste] = ENABLED_ESTAT_SERIES;
    expect(reste.length).toBeGreaterThan(0);
    rows.value = [
      {
        source: "e-Stat",
        target_id: premiere.target.id,
        last_success_at: RECENT,
        last_error: null,
        consecutive_failures: 0,
      },
    ];
    const estat = (await getFreshnessSummary(NOW)).find((s) => s.source === "e-Stat")!;
    expect(estat.tier).toBe("perime");
    expect(estat.error).toMatch(/jamais collectée/);
    expect(estat.error).toContain(reste[0].target.id);
  });

  it("reste vert quand toutes les séries actives ont un succès", async () => {
    rows.value = ENABLED_ESTAT_SERIES.map((m) => ({
      source: "e-Stat",
      target_id: m.target.id,
      last_success_at: RECENT,
      last_error: null,
      consecutive_failures: 0,
    }));
    const estat = (await getFreshnessSummary(NOW)).find((s) => s.source === "e-Stat")!;
    expect(estat.tier).toBe("frais");
    expect(estat.error).toBeUndefined();
  });
});
