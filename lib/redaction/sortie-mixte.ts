import { z } from "zod";

/**
 * Le contrat de sortie du modèle, depuis l'abandon de la sortie structurée.
 *
 * **Pourquoi mixte.** Quatre runs réels ont échoué sur le même 400 —
 * « The compiled grammar is too large » — malgré des réductions successives du schéma envoyé à
 * `output_config.format`. La leçon n'est pas qu'il fallait un schéma plus petit : c'est qu'un
 * schéma qui décrit une note entière ne tient pas dans un compilateur de grammaire, et qu'il
 * n'a rien à y faire. **On valide après plutôt que de contraindre pendant.**
 *
 * Le modèle produit donc une réponse unique en deux parties :
 *
 * 1. le MDX complet, frontmatter compris — de la prose, que `parseNote` sait déjà valider ;
 * 2. une section JSON délimitée, portant les seuls objets qui ont besoin d'une forme :
 *    révisions de scénario, guets, changements de statut de tendance, sources par bloc.
 *
 * Les deux parties passent par Zod à la réception. Ce module ne connaît ni le réseau ni le
 * disque : il n'a besoin que du texte brut et du vivier, ce qui le rend testable sans un
 * centime d'API.
 */

/**
 * Un bloc de code clôturé plutôt qu'un marqueur inventé : c'est la construction que les modèles
 * reproduisent le plus fidèlement, et elle survit au fait d'être recopiée dans un message de
 * réparation. L'info-string est distinctive pour qu'aucun bloc de code de la note ne puisse
 * être pris pour la section structurée.
 */
export const MARQUEUR_DEBUT = "```structure-json";
export const MARQUEUR_FIN = "```";

const LIKELIHOODS = ["central", "moderee", "faible"] as const;
const DIRECTIONS = ["up", "down", "flat"] as const;
const TREND_STATUSES = ["renforce", "maintient", "affaiblit", "invalidee"] as const;
const CLASSES_ACTIFS = ["eq", "fi", "fx", "cm"] as const;
const CANAUX = ["taux-reel", "nature-choc", "fonction-reaction", "dollar", "positionnement"] as const;

/**
 * Ce que le modèle a le droit de citer. Même rôle que l'ancien vivier, mais il ne sert plus à
 * fabriquer des `z.enum` envoyés à l'API : il alimente des `superRefine` exécutés chez nous. La
 * garantie est la même — rien n'atteint la note sans être passé par le vivier — mais elle ne
 * coûte plus rien au compilateur de grammaire, donc plus rien ne pousse à l'appauvrir.
 */
export type Vivier = {
  driverIds: string[];
  /** Les branches réelles de chaque driver : réviser, c'est émettre les trois d'un coup. */
  branchesParDriver: Map<string, string[]>;
  trendIds: string[];
  instrumentIds: string[];
  veilleItemIds: string[];
  blocsAttendus: string[];
  /** Trois moins ce qui remonte de la note précédente. */
  budgetGuets: number;
};

// ---------------------------------------------------------------------------
// Le frontmatter — les champs de jugement, les seuls que le modèle écrit
// ---------------------------------------------------------------------------

/**
 * Le code garde la main sur tout ce qui est mécanique : `slug`, `date`, `comparesTo`, `status`,
 * `zones`, les identifiants de guet. Le modèle n'écrit que ce qui relève d'un jugement. Les clés
 * qu'il ajouterait en trop sont ignorées plutôt que refusées — un `kind:` recopié du gabarit ne
 * vaut pas un run perdu, puisque `rendreMdx` réécrit le frontmatter de toute façon.
 */
const frontmatterSchema = z.object({
  regimeStatement: z.string().min(1),
  keyIndicators: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(3)
    .max(6),
  channels: z.array(z.enum(CANAUX)).min(1).max(3),
  driverOrder: z.array(z.string().min(1)),
  trendRefs: z.array(z.string().min(1)),
  instrumentRefs: z.array(z.string().min(1)),
  veilleItemRefs: z.array(z.string().min(1)),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

// ---------------------------------------------------------------------------
// La section JSON
// ---------------------------------------------------------------------------

const impactSchema = z.object({
  classe: z.enum(CLASSES_ACTIFS),
  direction: z.enum(DIRECTIONS),
  label: z.string().min(1),
  text: z.string().min(1),
});

const brancheSchema = z.object({
  branchId: z.string().min(1),
  likelihood: z.enum(LIKELIHOODS),
  why: z.string().min(1),
  thesis: z.string().min(1),
  impacts: z.array(impactSchema).length(4),
  watchSignals: z.string().min(1),
});

const revisionSchema = z.object({
  driverId: z.string().min(1),
  branches: z.array(brancheSchema).length(3),
});

const guetSchema = z.object({
  driverId: z.string().min(1),
  /**
   * L'axe du driver sur lequel se joue ce guet — « Contournement » plutôt qu'« Ormuz ». Un
   * libellé libre, porté par le guet lui-même : pas de registre d'axes à tenir à jour, donc pas
   * de cycle de vie à maintenir pour un objet dont la seule fonction est de dire *par où*
   * regarder. `null` quand le driver n'a qu'un angle.
   */
  axeLibelle: z.string().min(1).nullable(),
  libelle: z.string().min(1),
  attendu: z.string().min(1),
  confirmeSi: z.string().min(1),
  infirmeSi: z.string().min(1),
  echeance: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "échéance attendue au format AAAA-MM-JJ")
    .nullable(),
  sourceAttendue: z.array(z.string().min(1)),
});

const trendUpdateSchema = z.object({
  trendId: z.string().min(1),
  status: z.enum(TREND_STATUSES),
  why: z.string().min(1),
});

/**
 * Les sources restent dans la section JSON plutôt que dans le frontmatter : le modèle y cite un
 * identifiant choisi dans un vivier fermé, jamais une URL. Une citation inventée n'a donc pas de
 * représentation valide, et le rendu résout l'identifiant en `{ label, url }`.
 */
const sourceSchema = z.object({
  block: z.string().min(1),
  sourceId: z.string().min(1),
});

const structureSchema = z.object({
  scenarioRevisions: z.array(revisionSchema),
  guets: z.array(guetSchema),
  trendUpdates: z.array(trendUpdateSchema),
  sources: z.array(sourceSchema),
  /** Texte libre : la création d'un driver reste une décision humaine, jamais un objet émis. */
  driverCandidate: z.string().nullable().default(null),
  redactionNotes: z.string().default(""),
});

export type BrancheProposee = z.infer<typeof brancheSchema>;
export type RevisionProposee = z.infer<typeof revisionSchema>;
export type GuetPropose = z.infer<typeof guetSchema>;
export type TrendUpdateProposee = z.infer<typeof trendUpdateSchema>;
export type Structure = z.infer<typeof structureSchema>;

/**
 * Les invariants du vivier, appliqués aux deux parties d'un coup.
 *
 * Ils portent ce que l'intégrité exigerait de toute façon plus tard : les faire respecter ici
 * évite d'écrire un brouillon qu'on saurait déjà invalide, et donne au modèle un message de
 * réparation utilisable tel quel.
 */
function invariants(
  d: { frontmatter: Frontmatter; structure: Structure },
  vivier: Vivier,
  ctx: z.RefinementCtx,
) {
  const { frontmatter: fm, structure: s } = d;

  if (
    fm.driverOrder.length !== vivier.driverIds.length ||
    new Set(fm.driverOrder).size !== fm.driverOrder.length ||
    !vivier.driverIds.every((id) => fm.driverOrder.includes(id))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["frontmatter", "driverOrder"],
      message: `driverOrder doit être une permutation exacte des drivers actifs (${vivier.driverIds.join(", ")}), sans doublon ni omission`,
    });
  }

  for (const [champ, vivierIds] of [
    ["trendRefs", vivier.trendIds],
    ["instrumentRefs", vivier.instrumentIds],
    ["veilleItemRefs", vivier.veilleItemIds],
  ] as const) {
    for (const [i, id] of fm[champ].entries()) {
      if (!vivierIds.includes(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["frontmatter", champ, i],
          message: `« ${id} » ne figure pas dans le contexte — ${champ} n'accepte que : ${vivierIds.join(", ") || "rien cette semaine"}`,
        });
      }
    }
  }

  for (const [i, revision] of s.scenarioRevisions.entries()) {
    if (!vivier.driverIds.includes(revision.driverId)) {
      ctx.addIssue({
        code: "custom",
        path: ["scenarioRevisions", i, "driverId"],
        message: `driver inconnu « ${revision.driverId} » — drivers actifs : ${vivier.driverIds.join(", ")}`,
      });
      continue;
    }

    // Réviser un driver, c'est réémettre ses trois branches d'un coup : une branche isolée
    // laisserait les deux autres à une vraisemblance qui n'a plus de sens à côté.
    const attendues = vivier.branchesParDriver.get(revision.driverId) ?? [];
    const emises = revision.branches.map((b) => b.branchId);
    const memeEnsemble =
      emises.length === attendues.length && attendues.every((b) => emises.includes(b));
    if (!memeEnsemble) {
      ctx.addIssue({
        code: "custom",
        path: ["scenarioRevisions", i, "branches"],
        message: `branches attendues pour « ${revision.driverId} » : ${attendues.join(", ")} — reçues : ${emises.join(", ")}`,
      });
    }
    if (revision.branches.filter((b) => b.likelihood === "central").length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["scenarioRevisions", i, "branches"],
        message: "exactement une branche doit porter « central »",
      });
    }
    for (const [j, branche] of revision.branches.entries()) {
      const classes = branche.impacts.map((im) => im.classe);
      if (new Set(classes).size !== CLASSES_ACTIFS.length) {
        ctx.addIssue({
          code: "custom",
          path: ["scenarioRevisions", i, "branches", j, "impacts"],
          message: "impacts doit couvrir exactement eq, fi, fx et cm, sans doublon",
        });
      }
    }
  }

  if (s.guets.length > vivier.budgetGuets) {
    ctx.addIssue({
      code: "custom",
      path: ["guets"],
      message: `${s.guets.length} guets proposés pour ${vivier.budgetGuets} place(s) — les guets remontés de la note précédente occupent déjà les autres`,
    });
  }
  for (const [i, guet] of s.guets.entries()) {
    if (!vivier.driverIds.includes(guet.driverId)) {
      ctx.addIssue({
        code: "custom",
        path: ["guets", i, "driverId"],
        message: `driver inconnu « ${guet.driverId} » — un guet sans driver n'a pas de sens`,
      });
    }
  }

  for (const [i, update] of s.trendUpdates.entries()) {
    if (!vivier.trendIds.includes(update.trendId)) {
      ctx.addIssue({
        code: "custom",
        path: ["trendUpdates", i, "trendId"],
        message: `tendance inconnue « ${update.trendId} »`,
      });
    }
  }

  for (const [i, source] of s.sources.entries()) {
    if (!vivier.blocsAttendus.includes(source.block)) {
      ctx.addIssue({
        code: "custom",
        path: ["sources", i, "block"],
        message: `« ${source.block} » n'est pas un bloc de cette note (${vivier.blocsAttendus.join(", ")}) — une source rattachée à un bloc absent ne s'afficherait nulle part`,
      });
    }
    if (!vivier.veilleItemIds.includes(source.sourceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["sources", i, "sourceId"],
        message: `source inconnue « ${source.sourceId} » — cite un item de veille du contexte, jamais une URL`,
      });
    }
  }
}

export function schemaReponse(vivier: Vivier) {
  return z
    .object({ frontmatter: frontmatterSchema, structure: structureSchema })
    .superRefine((d, ctx) => invariants(d, vivier, ctx));
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export type ResultatExtraction =
  | { ok: true; mdx: string; jsonBrut: string }
  | { ok: false; raison: string };

/**
 * Sépare les deux parties de la réponse. Tolérant sur ce qui entoure la section — un modèle
 * qui ajoute une phrase après la section ne doit pas faire échouer le run pour si peu — et
 * strict sur ce qui la compose : sans section JSON, il n'y a rien à valider, et on le dit.
 */
export function extraireSortieMixte(brut: string): ResultatExtraction {
  const debut = brut.indexOf(MARQUEUR_DEBUT);
  if (debut < 0) {
    return {
      ok: false,
      raison: `section structurée introuvable : la réponse doit porter un bloc « ${MARQUEUR_DEBUT} … ${MARQUEUR_FIN} » après le MDX`,
    };
  }
  const apres = debut + MARQUEUR_DEBUT.length;
  const fin = brut.indexOf(MARQUEUR_FIN, apres);
  if (fin < 0) {
    return {
      ok: false,
      raison: `section structurée jamais refermée : il manque « ${MARQUEUR_FIN} » après le JSON`,
    };
  }

  const mdx = brut.slice(0, debut).trim();
  if (!mdx.startsWith("---")) {
    return {
      ok: false,
      raison: "le MDX doit commencer par son frontmatter, délimité par « --- »",
    };
  }

  return { ok: true, mdx, jsonBrut: brut.slice(apres, fin).trim() };
}

export type ResultatValidation =
  | { ok: true; frontmatter: Frontmatter; structure: Structure }
  | { ok: false; raison: string };

/**
 * Le frontmatter lu et le JSON brut, confrontés au vivier d'un seul coup — un unique message
 * d'échec plutôt que deux allers-retours pour deux fautes de la même réponse. Ce message est
 * écrit pour être renvoyé tel quel au modèle.
 */
export function validerReponse(
  frontmatterBrut: unknown,
  jsonBrut: string,
  vivier: Vivier,
): ResultatValidation {
  let structure: unknown;
  try {
    structure = JSON.parse(jsonBrut);
  } catch (error) {
    return { ok: false, raison: `section JSON invalide : ${(error as Error).message}` };
  }

  const parsed = schemaReponse(vivier).safeParse({ frontmatter: frontmatterBrut, structure });
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, raison: detail };
  }

  return { ok: true, frontmatter: parsed.data.frontmatter, structure: parsed.data.structure };
}
