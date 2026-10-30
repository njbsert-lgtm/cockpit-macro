import { describe, expect, it } from "vitest";
import { construireMarchesParDriver } from "./marches";
import { construireContexte } from "./context";

describe("construireMarchesParDriver et le paquet — weeklyChange transmis tel quel", () => {
  const drivers = [
    { id: "rates", label: "Taux directeurs", instrumentRefs: ["us10y", "brent", "bund"], retiredAt: null },
    { id: "ancien", label: "Retiré", instrumentRefs: ["us10y"], retiredAt: "2026-09-01" },
  ];
  const instruments = [
    { id: "us10y", label: "US 10 ans", unit: "percent" as const },
    { id: "brent", label: "Brent", unit: "usd" as const },
    { id: "bund", label: "Bund 10 ans", unit: "percent" as const },
  ];
  const ob = (instrumentId: string, date: string, value: number) => ({
    instrumentId,
    date,
    value,
    source: "FRED",
    fetchedAt: `${date}T06:00:00Z`,
  });
  const clotures = {
    us10y: [ob("us10y", "2026-10-23", 4.1), ob("us10y", "2026-10-30", 4.22)],
    brent: [ob("brent", "2026-10-23", 100), ob("brent", "2026-10-30", 104)],
    bund: [ob("bund", "2026-08-01", 2.5)],
  };

  it("une ligne par instrument de Driver.instrumentRefs, bps pour un taux, % sinon, avec les deux dates", () => {
    const m = construireMarchesParDriver(drivers, instruments, clotures, { dateFin: "2026-10-31", collecte: () => true });
    expect(m.map((d) => d.driverId)).toEqual(["rates"]); // le driver retiré n'est pas dans le paquet
    const [us10y, brent, bund] = m[0].instruments.map((i) => i.mesure);
    expect(us10y).toMatchObject({ status: "ok", unit: "bps", fromDate: "2026-10-23", toDate: "2026-10-30" });
    expect(us10y.status === "ok" && Math.round(us10y.value)).toBe(12);
    expect(brent).toMatchObject({ status: "ok", unit: "pct", value: 4 });
    // Clôture trop ancienne : le message de weeklyChange est transmis, jamais un tiret ni un zéro.
    expect(bund).toMatchObject({ status: "indisponible", reason: "donnee-absente", message: "donnée absente au 31/10" });
  });

  it("un instrument non collecté revient « non suivi »", () => {
    const m = construireMarchesParDriver(drivers, instruments, clotures, { collecte: (id) => id !== "brent" });
    expect(m[0].instruments[1].mesure).toMatchObject({ status: "indisponible", reason: "non-suivi", message: "non suivi" });
  });

  it("construireContexte : le bloc n'existe que pour une hebdo de la nouvelle structure", () => {
    const base = {
      dateCible: "2026-11-07",
      notes: [],
      notePrecedente: null,
      blocsPrecedents: {},
      observations: [],
      itemsVeille: [],
      scenariosCourants: [],
      tendancesCourantes: [],
    };
    const marches = construireMarchesParDriver(drivers, instruments, clotures, { collecte: () => true });
    expect(construireContexte({ ...base, kind: "hebdo", marchesParDriver: marches }).marchesParDriver).toHaveLength(1);
    expect(construireContexte({ ...base, kind: "speciale", marchesParDriver: marches }).marchesParDriver).toBeNull();
    // Avant la bascule (samedi 31/10, S44) : l'ancienne structure, rien à rédiger.
    expect(
      construireContexte({ ...base, dateCible: "2026-10-31", kind: "hebdo", marchesParDriver: marches }).marchesParDriver,
    ).toBeNull();
  });
});
