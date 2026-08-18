import { describe, expect, it } from "vitest";
import { getFreshnessSummary } from "./freshness-summary";
import { ENABLED_SERIES } from "@/config/fred-series";
import { getMacroIndicators, getMacroObservations } from "./data";
import { FRED_SOURCE } from "./fred";

const NOW = new Date("2026-08-18T12:00:00Z");

describe("getFreshnessSummary — seules les sources collectées figurent", () => {
  it("n'emprunte jamais la date du seed, même pour une source qui y est étiquetée", async () => {
    // Le bug : une entrée du seed étiquetée « FRED » et datée d'avril écrasait ce que le cron
    // venait d'écrire, la fusion retenant le relevé le plus ancien. `us-current-account` en
    // est le cas le plus retors — il n'est même pas collecté, mais son entrée porte quand même
    // l'étiquette FRED, donc l'exclure série par série n'aurait pas suffi.
    const piegees = getMacroIndicators()
      .flatMap((i) => getMacroObservations(i.id))
      .filter((o) => o.source === FRED_SOURCE);
    // Le cas existe bel et bien dans le seed — sans quoi ce test ne prouverait rien.
    expect(piegees.length).toBeGreaterThan(0);
    expect(piegees.some((o) => o.fetchedAt < "2026-05")).toBe(true);

    // Et pourtant aucune de ces dates ne ressort au nom de FRED.
    const summary = await getFreshnessSummary(NOW);
    expect(summary.find((s) => s.source === FRED_SOURCE)?.fetchedAt).toBeNull();
  });

  it("annonce une source configurée mais jamais collectée, au lieu de la faire disparaître", async () => {
    // Sans base configurée, `series_health` est vide : FRED n'a aucun relevé. Il doit quand
    // même figurer, sans date — un tuyau branché qui n'a jamais coulé est une information.
    const summary = await getFreshnessSummary(NOW);
    const fred = summary.find((s) => s.source === FRED_SOURCE);

    expect(ENABLED_SERIES.length).toBeGreaterThan(0);
    expect(fred).toBeDefined();
    expect(fred!.fetchedAt).toBeNull();
    expect(fred!.tier).toBe("absente");
  });

  it("place les sources sans relevé en tête : c'est le cas le plus grave", async () => {
    const summary = await getFreshnessSummary(NOW);
    const sansReleve = summary.filter((s) => s.fetchedAt === null);
    expect(sansReleve.length).toBeGreaterThan(0);
    // Toutes avant la première source datée.
    expect(summary.slice(0, sansReleve.length).every((s) => s.fetchedAt === null)).toBe(true);
  });
});

describe("getFreshnessSummary — aucune donnée en dur ne s'y affiche", () => {
  it("ne liste que les sources configurées, jamais celles du seed", async () => {
    const summary = await getFreshnessSummary(NOW);
    const sources = summary.map((s) => s.source);

    // Le seed étiquette une trentaine de sources — BLS, BCE, Destatis, S&P Global… Aucune
    // n'est collectée, aucune n'a donc à parler de la santé de la collecte.
    for (const seedOnly of ["BLS", "BCE", "Destatis", "S&P Global", "Twelve Data"]) {
      expect(sources).not.toContain(seedOnly);
    }
    // Il ne reste que ce qui est réellement branché.
    expect(sources).toContain(FRED_SOURCE);
    expect(sources.length).toBeLessThanOrEqual(2);
  });
});
