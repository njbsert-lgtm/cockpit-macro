import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AngleMort } from "@/lib/types";
import type { ClassifyOutcome } from "@/lib/veille/classify";
import {
  compterAnglesMorts,
  enAngleMort,
  enregistrerAnglesMorts,
  estAngleMort,
  lireAnglesMorts,
  normaliserSujet,
} from "./angles-morts";

const NOW = new Date("2026-10-03T12:00:00Z");

function outcome(over: Partial<ClassifyOutcome> = {}): ClassifyOutcome {
  return {
    id: "i1",
    ok: true,
    isSignal: true,
    driverRefs: ["iran"],
    source: "ONU",
    axeId: null,
    materialite: "haute",
    axeManquantPropose: "Voies maritimes de contournement",
    title: "Les Houthis prennent des îles dans Bab el-Mandeb",
    url: "https://example.org/x",
    publishedAt: "2026-09-30T00:00:00Z",
    ...over,
  };
}

function angle(over: Partial<AngleMort> = {}): AngleMort {
  return {
    id: "a1",
    date: "2026-09-30",
    driverId: "iran",
    axeManquantPropose: null,
    titre: "t",
    source: "s",
    url: "u",
    statut: "ouvert",
    resoluPar: null,
    ...over,
  };
}

describe("estAngleMort — ce qui compte, et ce qui ne compte pas", () => {
  it("une matérialité haute sans axe est un angle mort", () => {
    expect(estAngleMort(outcome())).toBe(true);
  });

  it("un événement imprévu qui tombe sur un axe n'en est PAS un : le cadre a fonctionné", () => {
    expect(estAngleMort(outcome({ axeId: "transit-ormuz" }))).toBe(false);
  });

  it("seuls les hauts comptent", () => {
    expect(estAngleMort(outcome({ materialite: "moyenne" }))).toBe(false);
    expect(estAngleMort(outcome({ materialite: "faible" }))).toBe(false);
  });

  it("ni un item classé non-signal, ni un échec de classification", () => {
    expect(estAngleMort(outcome({ isSignal: false }))).toBe(false);
    expect(estAngleMort(outcome({ ok: false }))).toBe(false);
  });

  it("un item sans driver est un angle mort sans driver, avec le sujet proposé", () => {
    const a = enAngleMort(outcome({ driverRefs: [] }))!;
    expect(a.driverId).toBeNull();
    expect(a.axeManquantPropose).toBe("Voies maritimes de contournement");
    expect(a.date).toBe("2026-09-30");
  });

  it("un item à plusieurs drivers retient le premier cité, sans deviner", () => {
    expect(enAngleMort(outcome({ driverRefs: ["ai", "rates"] }))!.driverId).toBe("ai");
  });
});

describe("compterAnglesMorts — les deux compteurs", () => {
  it("sépare « avec driver, sans axe » de « sans driver »", () => {
    const c = compterAnglesMorts(
      [angle({ id: "1" }), angle({ id: "2", driverId: "rates" }), angle({ id: "3", driverId: null, axeManquantPropose: "X" })],
      NOW,
    );
    expect(c.avecDriverSansAxe.total).toBe(2);
    expect(c.sansDriver.total).toBe(1);
  });

  it("alerte à trois sur le même driver, pas à trois sur des drivers différents", () => {
    const memeDriver = compterAnglesMorts([1, 2, 3].map((i) => angle({ id: `${i}` })), NOW);
    expect(memeDriver.avecDriverSansAxe.parDriver.get("iran")).toMatchObject({ n: 3, alerte: true });

    const repartis = compterAnglesMorts(
      [angle({ id: "1", driverId: "iran" }), angle({ id: "2", driverId: "rates" }), angle({ id: "3", driverId: "ai" })],
      NOW,
    );
    expect([...repartis.avecDriverSansAxe.parDriver.values()].some((g) => g.alerte)).toBe(false);
  });

  it("deux sur le même driver ne suffisent pas", () => {
    const c = compterAnglesMorts([angle({ id: "1" }), angle({ id: "2" })], NOW);
    expect(c.avecDriverSansAxe.parDriver.get("iran")!.alerte).toBe(false);
  });

  it("alerte à deux sans driver sur un même sujet, à la casse et aux accents près", () => {
    const c = compterAnglesMorts(
      [
        angle({ id: "1", driverId: null, axeManquantPropose: "Risque souverain français" }),
        angle({ id: "2", driverId: null, axeManquantPropose: "risque  souverain francais" }),
      ],
      NOW,
    );
    expect(c.sansDriver.parSujet).toHaveLength(1);
    expect(c.sansDriver.parSujet[0]).toMatchObject({ n: 2, alerte: true });
  });

  it("deux sujets différents ne s'additionnent pas", () => {
    const c = compterAnglesMorts(
      [
        angle({ id: "1", driverId: null, axeManquantPropose: "Risque souverain français" }),
        angle({ id: "2", driverId: null, axeManquantPropose: "Cyber-risque bancaire" }),
      ],
      NOW,
    );
    expect(c.sansDriver.parSujet.every((g) => !g.alerte)).toBe(true);
  });

  it("un angle sans libellé compte au total mais ne s'additionne à aucun sujet", () => {
    const c = compterAnglesMorts(
      [angle({ id: "1", driverId: null }), angle({ id: "2", driverId: null })],
      NOW,
    );
    expect(c.sansDriver.total).toBe(2);
    expect(c.sansDriver.sansLibelle).toBe(2);
    expect(c.sansDriver.parSujet).toHaveLength(0);
  });

  it("ne compte que le trimestre glissant : un angle de plus de 91 jours est sorti", () => {
    const c = compterAnglesMorts(
      [angle({ id: "1", date: "2026-06-01" }), angle({ id: "2", date: "2026-09-01" })],
      NOW,
    );
    expect(c.avecDriverSansAxe.total).toBe(1);
  });

  it("un angle résolu ne compte plus : un axe ou un driver a été créé pour lui", () => {
    const c = compterAnglesMorts([angle({ id: "1", statut: "resolu" }), angle({ id: "2" })], NOW);
    expect(c.avecDriverSansAxe.total).toBe(1);
  });

  it("normaliserSujet", () => {
    expect(normaliserSujet("  Cyber-Risque   Bancaire ")).toBe("cyber-risque bancaire");
    expect(normaliserSujet("Dépendance énergétique")).toBe("dependance energetique");
  });
});

// ---------------------------------------------------------------------------

function fakeClient(opts: { erreur?: string } = {}) {
  const appels: Array<{ op: string; payload?: unknown; filtres?: unknown[] }> = [];
  const client = {
    from() {
      return {
        upsert(payload: unknown) {
          appels.push({ op: "upsert", payload });
          return Promise.resolve({ error: opts.erreur ? { message: opts.erreur } : null });
        },
        delete() {
          const filtres: unknown[] = [];
          const chaine = {
            in(col: string, valeurs: unknown) {
              filtres.push(["in", col, valeurs]);
              return chaine;
            },
            eq(col: string, valeur: unknown) {
              filtres.push(["eq", col, valeur]);
              appels.push({ op: "delete", filtres });
              return Promise.resolve({ error: opts.erreur ? { message: opts.erreur } : null });
            },
          };
          return chaine;
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, appels };
}

describe("enregistrerAnglesMorts", () => {
  it("écrit les angles morts sans jamais envoyer statut ni resolu_par", async () => {
    const { client, appels } = fakeClient();
    const bilan = await enregistrerAnglesMorts(client, [outcome()]);

    expect(bilan.enregistres).toBe(1);
    const lignes = appels.find((a) => a.op === "upsert")!.payload as Array<Record<string, unknown>>;
    expect(lignes[0]).toMatchObject({ item_id: "i1", driver_id: "iran" });
    // Un humain seul clôt un angle mort : la passe ne doit pas pouvoir rouvrir ni clore.
    expect("statut" in lignes[0]).toBe(false);
    expect("resolu_par" in lignes[0]).toBe(false);
  });

  it("retire un item reclassé et désormais rattaché à un axe, mais seulement s'il est encore ouvert", async () => {
    const { client, appels } = fakeClient();
    const bilan = await enregistrerAnglesMorts(client, [outcome({ id: "i2", axeId: "transit-ormuz" })]);

    expect(bilan.retires).toBe(1);
    const suppression = appels.find((a) => a.op === "delete")!;
    expect(suppression.filtres).toContainEqual(["eq", "statut", "ouvert"]);
    expect(suppression.filtres).toContainEqual(["in", "item_id", ["i2"]]);
  });

  it("une table absente ne casse rien et se signale", async () => {
    const { client } = fakeClient({ erreur: 'relation "angles_morts" does not exist' });
    const bilan = await enregistrerAnglesMorts(client, [outcome()]);

    expect(bilan.tableAbsente).toBe(true);
    expect(bilan.enregistres).toBe(0);
  });

  it("n'écrit rien quand rien n'est un angle mort", async () => {
    const { client, appels } = fakeClient();
    await enregistrerAnglesMorts(client, [outcome({ materialite: "faible" })]);
    expect(appels.some((a) => a.op === "upsert")).toBe(false);
  });
});

describe("lireAnglesMorts — jamais un zéro quand la lecture échoue", () => {
  it("renvoie null sans client", async () => {
    expect(await lireAnglesMorts(null)).toBeNull();
  });

  it("renvoie null sur une erreur de lecture, pas une liste vide", async () => {
    const client = {
      from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: "x" } }) }) }),
    } as unknown as SupabaseClient;
    expect(await lireAnglesMorts(client)).toBeNull();
  });

  it("une table lisible et vide donne bien une liste vide : c'est un vrai zéro", async () => {
    const client = {
      from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    } as unknown as SupabaseClient;
    expect(await lireAnglesMorts(client)).toEqual([]);
  });
});
