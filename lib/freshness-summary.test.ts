import { describe, expect, it } from "vitest";
import { getFreshnessSummary } from "./freshness-summary";
import { ENABLED_SERIES } from "@/config/fred-series";
import { getMacroIndicators, getMacroObservations } from "./data";
import { FRED_SOURCE } from "./fred";

const NOW = new Date("2026-08-18T12:00:00Z");

describe("getFreshnessSummary — seules les sources collectées figurent", () => {
  it("n'emprunte jamais la date du seed", async () => {
    // Le bug d'origine : une entrée du seed étiquetée « FRED » et datée d'avril écrasait ce que
    // le cron venait d'écrire, la fusion retenant le relevé le plus ancien. Le seed ne peut plus
    // s'étiqueter FRED (`lib/provenance.test.ts`), mais il porte toujours des dates anciennes :
    // aucune ne doit ressortir au nom d'une source collectée.
    const seedees = getMacroIndicators().flatMap((i) => getMacroObservations(i.id));
    // Il y a bien des dates anciennes à emprunter — sans quoi ce test ne prouverait rien.
    expect(seedees.some((o) => o.fetchedAt < "2026-05")).toBe(true);

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
    for (const seedOnly of ["BLS", "BCE", "Destatis", "S&P Global"]) {
      expect(sources).not.toContain(seedOnly);
    }
    // Il ne reste que ce qui est réellement branché : FRED, Twelve Data, Alpha Vantage,
    // Eurostat, ONS, e-Stat, BoE, BoJ, BRI et IMF au moment d'écrire ce test. Le plafond suit les sources
    // réellement branchées, pas un compte figé — une source de plus qui l'atteint est
    // exactement le signe que ce test doit protéger : jamais un nom de source qui vient du
    // seed (BLS, BCE, Destatis, S&P Global…), déjà vérifié plus haut.
    expect(sources).toContain(FRED_SOURCE);
    expect(sources.length).toBeLessThanOrEqual(10);
  });

  it("liste BoE et BoJ — les deux taux directeurs branchés hors ONS et e-Stat", async () => {
    const summary = await getFreshnessSummary(NOW);
    expect(summary.map((s) => s.source)).toContain("Bank of England");
    expect(summary.map((s) => s.source)).toContain("Bank of Japan");
  });

  it("liste ONS — cinq séries y sont réellement actives depuis la bascule d'ONS_VERIFIED", async () => {
    // CPI, CPI sous-jacent, PIB, chômage et salaires sont vérifiés contre l'API réelle ; le
    // solde budgétaire reste au seed, son chemin sur la nouvelle API n'étant pas confirmé.
    const summary = await getFreshnessSummary(NOW);
    expect(summary.map((s) => s.source)).toContain("ONS");
  });

  it("liste Twelve Data — deux séries y sont réellement actives (or, MSCI ACWI)", async () => {
    // Oubliée lors du branchement initial : Twelve Data collecte bel et bien, mais n'apparaissait
    // jamais dans ce panneau, contrairement à ce que le module promet lui-même.
    const summary = await getFreshnessSummary(NOW);
    expect(summary.map((s) => s.source)).toContain("Twelve Data");
  });

  it("liste e-Stat — oubliée du panneau depuis son activation, malgré trois séries actives", async () => {
    // Même bug que Twelve Data en son temps : ESTAT_SOURCE n'était jamais ajoutée à
    // configuredSources(), donc une base tout juste réinitialisée (aucun relevé de santé
    // encore écrit) aurait fait disparaître e-Stat du panneau plutôt que d'afficher « jamais
    // collectée ».
    const summary = await getFreshnessSummary(NOW);
    expect(summary.map((s) => s.source)).toContain("e-Stat");
  });

  it("liste Alpha Vantage — sept ETF de repli réellement actifs", async () => {
    const summary = await getFreshnessSummary(NOW);
    expect(summary.map((s) => s.source)).toContain("Alpha Vantage");
  });
});

describe("getFreshnessSummary — ne pas confondre deux pannes", () => {
  it("nomme la configuration absente au lieu de laisser croire que la collecte n'a rien produit", async () => {
    // Sans clé de lecture, l'application ne sait pas interroger la base. Le vide affiché ne
    // dit alors rien de la collecte, et le panneau doit le préciser — l'état 5 du cahier
    // nomme la cause, il ne se contente pas de constater.
    const summary = await getFreshnessSummary(NOW);
    const fred = summary.find((s) => s.source === FRED_SOURCE)!;
    expect(fred.tier).toBe("absente");
    expect(fred.error).toMatch(/Base non configurée en lecture/);
    expect(fred.error).toMatch(/SUPABASE_ANON_KEY/);
  });
});
