import { z } from "zod";
import type { ContextePaquet } from "./context";

/**
 * Le schéma de la sortie du modèle, **construit au run** depuis le corpus réel.
 *
 * Principe directeur : toute référence sortante est un `enum` bâti sur ce qui existe, jamais
 * une chaîne libre. Une référence morte devient impossible à produire, pas seulement
 * détectable après coup. Corollaire : **le modèle n'écrit jamais d'URL** — il choisit un
 * `sourceId` dans un vivier fermé, et une citation inventée n'a pas de représentation.
 *
 * Deux catégories de champs n'y figurent jamais :
 * - les identifiants structurels (`date`, `slug`, `comparesTo`, `version`, `noteSlug`),
 *   calculés par `context.ts` ;
 * - l'objet `Driver` complet pour un nouveau driver — seul un texte libre consultatif est
 *   permis, l'objet structuré restant une proposition à valider à la main.
 */

const LIKELIHOODS = ["central", "moderee", "faible"] as const;
const DIRECTIONS = ["up", "down", "flat"] as const;
const TREND_STATUSES = ["renforce", "maintient", "affaiblit", "invalidee"] as const;
const CLASSES_ACTIFS = ["eq", "fi", "fx", "cm"] as const;

/**
 * `z.enum` exige un tuple non vide. Un vivier vide — aucun item de veille cette semaine —
 * ne peut donc pas produire d'enum : le champ est alors omis du schéma et le code écrit `[]`.
 */
function enumDe<T extends string>(valeurs: readonly T[]): z.ZodEnum<Record<T, T>> | null {
  if (valeurs.length === 0) return null;
  return z.enum(valeurs as unknown as [T, ...T[]]);
}

const impactSchema = z.object({
  direction: z.enum(DIRECTIONS),
  label: z.string().min(1),
  text: z.string().min(1),
});

export type Brouillon = {
  regimeStatement: string;
  keyIndicators: Array<{ label: string; value: string }>;
  channels: string[];
  driverOrder: string[];
  trendRefs: string[];
  instrumentRefs: string[];
  veilleItemRefs: string[];
  blocs: Record<string, string>;
  sources: Array<{ block: string; sourceId: string }>;
  scenarioRevisions: Array<{
    driverId: string;
    branches: Array<{
      branchId: string;
      likelihood: (typeof LIKELIHOODS)[number];
      why: string;
      thesis: string;
      impacts: Record<
        (typeof CLASSES_ACTIFS)[number],
        { direction: (typeof DIRECTIONS)[number]; label: string; text: string }
      >;
      watchSignals: string;
    }>;
  }>;
  trendUpdates: Array<{
    trendId: string;
    status: (typeof TREND_STATUSES)[number];
    why: string;
  }>;
  guets: Array<{
    driverId: string;
    libelle: string;
    attendu: string;
    confirmeSi: string;
    infirmeSi: string;
    echeance: string | null;
    sourceAttendue: string[];
  }>;
  driverCandidate: string | null;
  redactionNotes: string;
};

/** Ce que le modèle a le droit de citer, par bloc — bâti sur le contexte, jamais deviné. */
export type Vivier = {
  driverIds: string[];
  /** Les branches réelles de chaque driver : réviser, c'est émettre les trois d'un coup. */
  branchesParDriver: Map<string, string[]>;
  trendIds: string[];
  instrumentIds: string[];
  veilleItemIds: string[];
  blocsAttendus: string[];
};

export function construireVivier(paquet: ContextePaquet, blocsAttendus: string[]): Vivier {
  const branchesParDriver = new Map<string, string[]>();
  for (const version of paquet.scenariosCourants) {
    const branches = branchesParDriver.get(version.driverId) ?? [];
    if (!branches.includes(version.branchId)) branches.push(version.branchId);
    branchesParDriver.set(version.driverId, branches);
  }

  return {
    driverIds: [...branchesParDriver.keys()].sort(),
    branchesParDriver,
    trendIds: paquet.tendancesCourantes.map((t) => t.id).sort(),
    instrumentIds: paquet.observations.map((o) => o.instrumentId).sort(),
    veilleItemIds: paquet.itemsVeille.map((i) => i.id),
    blocsAttendus,
  };
}

/**
 * Le schéma proprement dit. Les `refine` portent les invariants que l'intégrité exigera de
 * toute façon plus tard — les faire respecter ici évite un aller-retour avec le modèle.
 */
export function construireSchema(paquet: ContextePaquet, vivier: Vivier) {
  const driverEnum = enumDe(vivier.driverIds);
  const trendEnum = enumDe(vivier.trendIds);
  const instrumentEnum = enumDe(vivier.instrumentIds);
  const veilleEnum = enumDe(vivier.veilleItemIds);
  const blocEnum = enumDe(vivier.blocsAttendus);

  if (!driverEnum || !blocEnum) {
    throw new Error(
      "le paquet de contexte ne porte ni driver actif ni bloc attendu : rien à rédiger",
    );
  }

  const brancheEnum = enumDe([...new Set([...vivier.branchesParDriver.values()].flat())]);

  const base = z.object({
    regimeStatement: z.string().min(1).describe("Le régime en une phrase, à cette date."),
    keyIndicators: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .min(3)
      .max(6),
    channels: z
      .array(z.enum(["taux-reel", "nature-choc", "fonction-reaction", "dollar", "positionnement"]))
      .min(1)
      .max(3)
      .describe("Le premier est le canal dominant : il donne sa couleur à la carte."),
    driverOrder: z
      .array(driverEnum)
      .describe("Permutation exacte des drivers actifs, du plus explicatif au moins."),
    trendRefs: trendEnum ? z.array(trendEnum) : z.array(z.never()).max(0),
    instrumentRefs: instrumentEnum ? z.array(instrumentEnum) : z.array(z.never()).max(0),
    veilleItemRefs: veilleEnum ? z.array(veilleEnum) : z.array(z.never()).max(0),

    blocs: z.object(
      Object.fromEntries(
        vivier.blocsAttendus.map((b) => [b, z.string().min(1)]),
      ) as Record<string, z.ZodString>,
    ),

    // Liste plate plutôt qu'un Record à clés dynamiques : mal sérialisé en JSON Schema strict.
    sources: z.array(z.object({ block: blocEnum, sourceId: veilleEnum ?? z.string().min(1) })),

    scenarioRevisions: z
      .array(
        z.object({
          driverId: driverEnum,
          branches: z
            .array(
              z.object({
                branchId: brancheEnum ?? z.string().min(1),
                likelihood: z.enum(LIKELIHOODS),
                why: z.string().min(1).describe("Obligatoire dès qu'une vraisemblance bouge."),
                thesis: z.string().min(1),
                impacts: z.object(
                  Object.fromEntries(CLASSES_ACTIFS.map((c) => [c, impactSchema])) as Record<
                    string,
                    typeof impactSchema
                  >,
                ),
                watchSignals: z.string().min(1),
              }),
            )
            .length(3)
            .describe("Réviser un driver, c'est émettre ses trois branches d'un coup."),
        }),
      )
      .describe("Vide si rien ne justifie une révision cette semaine — c'est une réponse valide."),

    trendUpdates: trendEnum
      ? z.array(z.object({ trendId: trendEnum, status: z.enum(TREND_STATUSES), why: z.string().min(1) }))
      : z.array(z.never()).max(0),

    guets: z
      .array(
        z.object({
          driverId: driverEnum,
          libelle: z.string().min(1),
          attendu: z.string().min(1),
          confirmeSi: z.string().min(1),
          infirmeSi: z.string().min(1),
          echeance: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .describe("null quand l'événement n'a pas de date connue — il n'expirera jamais."),
          sourceAttendue: z.array(z.string().min(1)).default([]),
        }),
      )
      .max(paquet.budgetGuets),

    driverCandidate: z
      .string()
      .nullable()
      .describe(
        "Texte libre si un driver nouveau semble émerger. Jamais un objet structuré : sa " +
          "création reste une décision humaine.",
      ),

    redactionNotes: z.string().describe("Ce qui a manqué, ce qui a été difficile à trancher."),
  });

  return base
    .refine(
      (d) =>
        d.driverOrder.length === vivier.driverIds.length &&
        new Set(d.driverOrder).size === d.driverOrder.length,
      {
        message: `driverOrder doit être une permutation exacte des ${vivier.driverIds.length} drivers actifs, sans doublon`,
        path: ["driverOrder"],
      },
    )
    .refine((d) => d.scenarioRevisions.every((r) => estCoherente(r, vivier)), {
      message:
        "chaque révision doit couvrir exactement les trois branches de son driver, avec une seule « central »",
      path: ["scenarioRevisions"],
    })
    .refine(
      (d) => d.sources.every((s) => vivier.blocsAttendus.includes(s.block)),
      { message: "une source cite un bloc absent de la note", path: ["sources"] },
    );
}

function estCoherente(
  revision: { driverId: string; branches: Array<{ branchId: string; likelihood: string }> },
  vivier: Vivier,
): boolean {
  const attendues = vivier.branchesParDriver.get(revision.driverId);
  if (!attendues) return false;

  const emises = revision.branches.map((b) => b.branchId);
  const memeEnsemble =
    emises.length === attendues.length && attendues.every((b) => emises.includes(b));
  const uneSeuleCentrale =
    revision.branches.filter((b) => b.likelihood === "central").length === 1;

  return memeEnsemble && uneSeuleCentrale;
}
