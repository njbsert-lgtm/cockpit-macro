import { z } from "zod";
import { getInstruments } from "@/lib/data";
import type { ContextePaquet } from "./context";

/**
 * Le schéma de la sortie du modèle, **construit au run** depuis le corpus réel.
 *
 * Principe directeur : toute référence sortante est vérifiée contre ce qui existe, jamais
 * laissée à une chaîne libre incontrôlée. Une référence morte ne doit jamais survivre à la
 * validation. Corollaire : **le modèle n'écrit jamais d'URL** — il choisit un `sourceId` dans un
 * vivier fermé, et une citation inventée n'a pas de représentation valide.
 *
 * Deux mécanismes portent cette garantie :
 * - un `z.enum` pour les viviers les plus petits et les plus stables (drivers, tendances,
 *   blocs) — une référence morte devient alors *impossible à produire*, pas seulement
 *   détectable après coup ;
 * - une chaîne libre confrontée à un `.refine()` de ce module partout ailleurs — instruments,
 *   items de veille (vivier non borné, voir `getPendingVeilleItems`), branches de scénario.
 *   Un premier run réel a échoué à la compilation de la sortie structurée
 *   (« The compiled grammar is too large ») avec un schéma qui n'utilisait pourtant que des
 *   viviers de quelques dizaines d'entrées au plus : chaque `z.enum`, chaque objet imbriqué et
 *   chaque `.describe()` pèse sur cette compilation, pas seulement les gros viviers. Le refine
 *   s'exécute après coup, jamais compilé en grammaire, mais donne la même garantie : rien
 *   n'atteint `Note` sans être passé par le vivier.
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

/**
 * Un objet à quatre propriétés fixes (`eq`/`fi`/`fx`/`cm`), chacune un sous-objet à trois
 * propriétés, référencé depuis chaque branche proposée : la compilation de la sortie
 * structurée expanse chaque site d'utilisation d'un `$ref` plutôt que de le partager, et ce
 * seul champ, à cette forme, a suffi à faire échouer un run réel (« The compiled grammar is
 * too large »). Sous forme de **tableau** de quatre entrées `{ classe, direction, label, text }`,
 * le compilateur n'a plus qu'une seule forme d'objet à traiter, quelle que soit la classe —
 * même contenu, un site d'utilisation au lieu de quatre. `impactsVersRecord` (`deltas.ts`)
 * reconvertit ce tableau dans la forme `Record` qu'exige `ScenarioVersion`, la seule qui compte
 * une fois la révision acceptée.
 */
const impactEntrySchema = z.object({
  classe: z.enum(CLASSES_ACTIFS),
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
      /** Tableau de quatre entrées, une par classe d'actifs — voir `impactEntrySchema`. */
      impacts: Array<{
        classe: (typeof CLASSES_ACTIFS)[number];
        direction: (typeof DIRECTIONS)[number];
        label: string;
        text: string;
      }>;
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

  // `Note.instrumentRefs` n'a de sens que pour des instruments de marché — c'est ce que
  // `lib/integrity.ts` valide, et c'est ce que la fiche instrument sait résoudre. Un indicateur
  // macro peut figurer dans `paquet.observations` (pour être cité en prose, contrôlé comme
  // n'importe quel chiffre) sans pour autant devenir un `instrumentRefs` citable : les deux
  // catalogues ne se recoupent jamais, même ici.
  const idsInstruments = new Set(getInstruments().map((i) => i.id));

  return {
    driverIds: [...branchesParDriver.keys()].sort(),
    branchesParDriver,
    trendIds: paquet.tendancesCourantes.map((t) => t.id).sort(),
    instrumentIds: paquet.observations
      .map((o) => o.instrumentId)
      .filter((id) => idsInstruments.has(id))
      .sort(),
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
  const blocEnum = enumDe(vivier.blocsAttendus);

  if (!driverEnum || !blocEnum) {
    throw new Error(
      "le paquet de contexte ne porte ni driver actif ni bloc attendu : rien à rédiger",
    );
  }

  // Aucune description de champ (`.describe()`) dans ce schéma : chacune ajoutait un nœud à la
  // sortie structurée compilée, et la grammaire d'un schéma déjà chargé (révisions de scénario,
  // guets) a échoué en conditions réelles (« The compiled grammar is too large »). Toute
  // instruction qu'un `.describe()` aurait portée vit maintenant dans SYSTEM_PROMPT (prompt.ts),
  // lu une fois par le modèle, jamais recompilé en grammaire à chaque run.
  const base = z.object({
    regimeStatement: z.string().min(1),
    keyIndicators: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .min(3)
      .max(6),
    channels: z
      .array(z.enum(["taux-reel", "nature-choc", "fonction-reaction", "dollar", "positionnement"]))
      .min(1)
      .max(3),
    driverOrder: z.array(driverEnum),
    trendRefs: trendEnum ? z.array(trendEnum) : z.array(z.never()).max(0),
    // `instrumentIds` et `veilleItemIds` ne sont jamais des `z.enum` : le premier grossit avec
    // la couverture des sources, le second avec la file de veille (aucune limite dessus — voir
    // `getPendingVeilleItems`), et une énumération de plusieurs dizaines de valeurs, répétée à
    // deux endroits du schéma pour la veille, a fait échouer la compilation de la sortie
    // structurée en conditions réelles (« The compiled grammar is too large »). L'appartenance
    // au vivier est vérifiée par les `refine` ci-dessous plutôt que par le schéma envoyé à
    // l'API — même garantie, jamais compilée en grammaire.
    instrumentRefs: z.array(z.string()),
    veilleItemRefs: z.array(z.string()),

    blocs: z.object(
      Object.fromEntries(
        vivier.blocsAttendus.map((b) => [b, z.string().min(1)]),
      ) as Record<string, z.ZodString>,
    ),

    // Liste plate plutôt qu'un Record à clés dynamiques : mal sérialisé en JSON Schema strict.
    sources: z.array(z.object({ block: blocEnum, sourceId: z.string().min(1) })),

    scenarioRevisions: z
      .array(
        z.object({
          driverId: driverEnum,
          branches: z
            .array(
              z.object({
                // Chaîne libre plutôt qu'un `z.enum` : `estCoherente` (plus bas) vérifie déjà
                // que l'ensemble des branchId émis correspond exactement aux branches réelles
                // du driver, une garantie équivalente à un enum sans en payer le coût de
                // compilation.
                branchId: z.string().min(1),
                likelihood: z.enum(LIKELIHOODS),
                why: z.string().min(1),
                thesis: z.string().min(1),
                impacts: z.array(impactEntrySchema).length(4),
                watchSignals: z.string().min(1),
              }),
            )
            .length(3),
        }),
      ),

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
          echeance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
          // Pas de `.default([])` : un champ optionnel double l'espace d'états du compilateur de
          // grammaire (présent/absent) pour un gain nul — le modèle peut très bien écrire `[]`.
          sourceAttendue: z.array(z.string().min(1)),
        }),
      )
      .max(paquet.budgetGuets),

    driverCandidate: z.string().nullable(),

    redactionNotes: z.string(),
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
      (d) =>
        d.scenarioRevisions.every((r) =>
          r.branches.every((b) => couvreLesClassesActifs(b.impacts)),
        ),
      {
        message: "impacts doit couvrir exactement eq, fi, fx et cm, sans doublon",
        path: ["scenarioRevisions"],
      },
    )
    .refine(
      (d) => d.sources.every((s) => vivier.blocsAttendus.includes(s.block)),
      { message: "une source cite un bloc absent de la note", path: ["sources"] },
    )
    .refine((d) => d.instrumentRefs.every((id) => vivier.instrumentIds.includes(id)), {
      message: "instrumentRefs cite un instrument absent du paquet",
      path: ["instrumentRefs"],
    })
    .refine((d) => d.veilleItemRefs.every((id) => vivier.veilleItemIds.includes(id)), {
      message: "veilleItemRefs cite un item de veille absent du paquet",
      path: ["veilleItemRefs"],
    })
    .refine((d) => d.sources.every((s) => vivier.veilleItemIds.includes(s.sourceId)), {
      message: "une source cite un item de veille absent du paquet",
      path: ["sources"],
    });
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

/**
 * `impacts` est un tableau plutôt qu'un `Record` dans le schéma envoyé au modèle (voir
 * `impactEntrySchema`) ; cette fonction restaure la garantie qu'un `Record` aurait donnée
 * gratuitement — exactement les quatre classes, sans doublon.
 */
function couvreLesClassesActifs(impacts: Array<{ classe: string }>): boolean {
  const classes = impacts.map((i) => i.classe);
  return (
    classes.length === CLASSES_ACTIFS.length &&
    CLASSES_ACTIFS.every((c) => classes.includes(c)) &&
    new Set(classes).size === classes.length
  );
}
