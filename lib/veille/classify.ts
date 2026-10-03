import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredCaller } from "@/lib/anthropic";
import type { Axe, VeilleItem } from "@/lib/types";
import { CLASSIFICATION_MODEL } from "@/config/ai-models";
import { buildClassificationSchema, type ClassifiedItem } from "./classify.schema";

/**
 * Passe 2 — classification par l'API Claude, quotidienne, dans son propre workflow GitHub
 * Actions (`.github/workflows/veille-passe2.yml`), séparée de la rédaction hebdomadaire.
 *
 * Reprend le point d'extension déjà nommé dans `lib/veille/filter.ts` : la passe 1 pose
 * `isSignal: true` en dur pour tout ce qui survit au filtre par mots-clés ; cette passe raffine
 * ce jugement en appliquant la grille des cinq canaux de transmission et le test « flux ou
 * déclaration » du cahier des charges, comme un humain le ferait sur `/triage`.
 *
 * Ne touche jamais `status` : la file que l'humain peut encore consulter reste celle que la
 * passe 1 a écrite. Un item non repris dans la réponse du modèle (lot mal formé, item omis)
 * n'est pas écrit — sa dernière classification connue reste en place, jamais remplacée par une
 * valeur devinée.
 */

const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `Vous classez des items de veille macroéconomique et géopolitique pour un tableau de bord d'analyse personnel. Chaque item n'est connu que par son titre, sa source et sa date — jamais le texte intégral (droit d'auteur) : classez uniquement à partir de ce qui vous est montré, sans supposer de contenu que vous ne voyez pas.

La grille des cinq canaux de transmission — attribuez-en un ou plusieurs par pertinence, jamais par défaut :
- taux-reel : taux réels, TIPS, points morts d'inflation.
- nature-choc : la nature d'un choc — offre contre demande (embargo, blocus, réduction de production).
- fonction-reaction : ce que ça change à la réaction des banques centrales (dot plot, forward guidance, biais).
- dollar : flux de capitaux, devise refuge, indice dollar.
- positionnement : positionnement spéculatif (CFTC, flux acheteurs/vendeurs, short covering).

Le test « flux ou déclaration » — c'est la distinction qui sépare "nature" :
- "flux" : quelque chose s'est physiquement ou financièrement produit (une frappe, un embargo appliqué, une saisie, un chiffre publié).
- "declaration" : quelqu'un a dit quelque chose sur ce qui pourrait se produire (une menace, une anticipation, une déclaration d'intention).

isSignal : true seulement si l'item peut plausiblement faire bouger la vraisemblance d'une branche de scénario d'un des drivers ci-dessous, ou révéler qu'un thème mérite de devenir un nouveau driver. Un item qui ne fait que confirmer ce qui est déjà su, sans rien changer à la lecture, est isSignal: false — la répétition n'est pas un signal.

horizon : sur quel délai l'item pèse — immediat (jours), semaine, trimestre, ou structurel (années).

Ce qui suit s'applique quand une grille d'axes et des guets vous sont fournis.

materialite : haute si l'événement, à supposer qu'il se confirme, déplace à lui seul la vraisemblance d'une branche d'un driver ; moyenne s'il informe un axe sans le déplacer ; faible s'il ne fait que donner du contexte. Vous ne voyez que le titre : un titre qui ne dit pas ce qui s'est produit — par exemple « dépôt 8-K du 2026-09-21 » — ne justifie jamais une matérialité haute.

axeId : chaque driver a des axes, c'est-à-dire des chemins précis par lesquels son incertitude atteint les prix. Rattachez l'item à un axe SEULEMENT si le mécanisme décrit est bien celui par lequel l'événement atteint les prix — une proximité de thème ne suffit pas. « Aucun axe » (null) est une réponse légitime et attendue, jamais un échec : ne forcez jamais un rattachement. Un item qui touche un driver sans entrer dans aucun de ses axes montre que la grille n'a pas de case pour lui, et c'est une information précieuse. L'axe choisi doit appartenir à l'un des drivers de l'item.

axeManquantPropose : seulement quand axeId est null et que la matérialité est haute ou moyenne — en une courte expression, le chemin de transmission qui manque, pas un résumé de l'item. Sinon null.

resoutGuet : l'identifiant d'un guet ouvert, seulement si le TITRE porte lui-même l'événement que ce guet attend. L'émetteur, la source ou le thème ne suffisent pas à résoudre un guet. Dans le doute, null.

reasoning : une phrase, pour l'audit du run — jamais écrite en base.`;

function formatDrivers(drivers: Array<{ id: string; label: string; question: string }>): string {
  if (drivers.length === 0) return "Aucun driver actif actuellement.";
  return drivers.map((d) => `- ${d.id} (« ${d.label} ») : ${d.question}`).join("\n");
}

function formatGrille(drivers: ClassifyContext["drivers"], axes: Axe[]): string {
  if (axes.length === 0) return "";
  const lignes = drivers.map((d) => {
    const siens = axes.filter((a) => a.driverId === d.id);
    if (siens.length === 0) return "";
    return `- ${d.id} :\n${siens.map((a) => `    - ${a.id} (« ${a.libelle} ») : ${a.mecanisme}`).join("\n")}`;
  });
  return `\n\nAxes de chaque driver :\n${lignes.filter(Boolean).join("\n")}`;
}

function formatGuets(guets: NonNullable<ClassifyContext["guets"]>): string {
  if (guets.length === 0) return "";
  return `\n\nGuets ouverts :\n${guets
    .map((g) => `- ${g.id} | driver ${g.driverId} | ${g.libelle} | attendu : ${g.attendu} | confirmé si : ${g.confirmeSi} | infirmé si : ${g.infirmeSi}`)
    .join("\n")}`;
}

function formatItems(items: VeilleItem[]): string {
  return items
    .map((item) => `- id=${item.id} | ${item.publishedAt} | ${item.source} | ${item.title}`)
    .join("\n");
}

export type ClassifyOutcome = {
  id: string;
  ok: boolean;
  error?: string;
  /**
   * Étape 4 : vrai quand les colonnes `axe_id`, `materialite`… n'ont pas pu être écrites — la
   * migration de `supabase/schema.sql` n'est pas appliquée. La classification d'origine est, elle,
   * bien écrite : l'absence de ces colonnes ne doit jamais casser la passe quotidienne.
   */
  etape4NonEcrite?: boolean;
  axeId?: string | null;
  materialite?: "haute" | "moyenne" | "faible";
  resoutGuet?: string | null;
  axeManquantPropose?: string | null;
  /** Le modèle avait cité un axe qui n'appartient à aucun des drivers de l'item : écarté. */
  axeIncoherent?: boolean;
  title?: string;
  url?: string;
  publishedAt?: string;
  /**
   * Renseignés uniquement quand `ok` est vrai — c'est ce qui permet au script appelant de
   * calculer la répartition par signal, par driver et par source sans relire la base.
   */
  isSignal?: boolean;
  driverRefs?: string[];
  source?: string;
};

export type ClassifyReport = {
  startedAt: string;
  finishedAt: string;
  ok: number;
  failed: number;
  /** Items reçus mais absents de la réponse du modèle — ni réussis ni en échec, repris demain. */
  skipped: number;
  outcomes: ClassifyOutcome[];
  /**
   * Cumulé sur tous les lots ayant réellement appelé l'API — un lot en échec (exception avant
   * toute réponse) n'y contribue pas, faute de `usage` à lire.
   */
  usage: { input: number; output: number };
};

export type ClassifyContext = {
  drivers: Array<{ id: string; label: string; question: string }>;
  /** Les axes posés a priori (`content/axes.ts`). Absents : la passe n'attache rien à un axe. */
  axes?: Axe[];
  /** Les guets ouverts, pour `resoutGuet`. */
  guets?: Array<{ id: string; driverId: string; libelle: string; attendu: string; confirmeSi: string; infirmeSi: string }>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function writeClassification(
  client: SupabaseClient,
  item: VeilleItem,
  classified: ClassifiedItem,
  axeIncoherent: boolean,
): Promise<ClassifyOutcome> {
  const { error } = await client
    .from("veille_items")
    .update({
      is_signal: classified.isSignal,
      nature: classified.nature,
      horizon: classified.horizon,
      driver_refs: classified.driverRefs,
      channels: classified.channels,
      zones: classified.zones,
      classified_at: new Date().toISOString(),
    })
    .eq("id", classified.id);

  if (error) return { id: classified.id, ok: false, error: error.message };

  // Les champs de l'étape 4 s'écrivent à part : si leur migration n'est pas appliquée, la
  // classification d'origine reste écrite et la passe quotidienne n'en est pas affectée.
  const { error: erreurEtape4 } = await client
    .from("veille_items")
    .update({
      axe_id: classified.axeId,
      materialite: classified.materialite,
      resout_guet: classified.resoutGuet,
      axe_manquant_propose: classified.axeManquantPropose,
    })
    .eq("id", classified.id);

  return {
    id: classified.id,
    ok: true,
    isSignal: classified.isSignal,
    driverRefs: classified.driverRefs,
    source: item.source,
    etape4NonEcrite: erreurEtape4 ? true : undefined,
    axeId: classified.axeId,
    materialite: classified.materialite,
    resoutGuet: classified.resoutGuet,
    axeManquantPropose: classified.axeManquantPropose,
    axeIncoherent: axeIncoherent || undefined,
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
  };
}

/**
 * Classe un lot d'items déjà chargés (typiquement `getPendingVeilleItems()`) et écrit le
 * résultat en base. Le *caller* est injecté — jamais d'appel réseau réel dans les tests.
 */
export async function classifyVeilleItems(
  client: SupabaseClient,
  items: VeilleItem[],
  context: ClassifyContext,
  caller: StructuredCaller,
  options: { batchSize?: number } = {},
): Promise<ClassifyReport> {
  const startedAt = new Date().toISOString();
  const outcomes: ClassifyOutcome[] = [];
  const driverIds = context.drivers.map((d) => d.id);
  const batches = chunk(items, options.batchSize ?? BATCH_SIZE);
  let usageInput = 0;
  let usageOutput = 0;

  for (const batch of batches) {
    if (batch.length === 0) continue;
    const itemIds = batch.map((i) => i.id) as [string, ...string[]];
    const axes = context.axes ?? [];
    const guets = context.guets ?? [];
    const schema = buildClassificationSchema(itemIds, driverIds, {
      axeIds: axes.map((a) => a.id),
      guetIds: guets.map((g) => g.id),
    });

    const user =
      `Drivers actifs :\n${formatDrivers(context.drivers)}` +
      formatGrille(context.drivers, axes) +
      formatGuets(guets) +
      `\n\nItems à classer :\n${formatItems(batch)}`;

    let response;
    try {
      response = await caller({
        system: SYSTEM_PROMPT,
        user,
        schema,
        model: CLASSIFICATION_MODEL,
        // Ni la pensée adaptative ni `effort` ne sont envoyés : Haiku 4.5 rejette les deux avec
        // un 400 (« adaptive thinking is not supported on this model »,
        // « This model does not support the effort parameter »), confirmé en conditions
        // réelles. Une classification contre une grille fermée n'a de toute façon besoin ni de
        // l'un ni de l'autre.
        thinking: false,
      });
    } catch (err) {
      // Un lot entier en échec : rien n'est écrit pour ce lot, journalisé une fois par item
      // plutôt que silencieusement — « rejet d'une réponse malformée sans écriture ».
      const message = err instanceof Error ? err.message : String(err);
      for (const item of batch) outcomes.push({ id: item.id, ok: false, error: message });
      continue;
    }

    usageInput += response.usage.input;
    usageOutput += response.usage.output;

    const classifiedById = new Map(response.value.items.map((c) => [c.id, c]));
    for (const item of batch) {
      const classified = classifiedById.get(item.id);
      if (!classified) continue; // omis par le modèle — repris au passage suivant, pas une erreur
      // Un axe n'a de sens que dans l'un des drivers de l'item : un rattachement croisé est écarté
      // (et signalé), jamais écrit.
      const axe = classified.axeId ? axes.find((a) => a.id === classified.axeId) : undefined;
      const axeIncoherent = axe !== undefined && !classified.driverRefs.includes(axe.driverId);
      const retenu = axeIncoherent ? { ...classified, axeId: null } : classified;
      outcomes.push(await writeClassification(client, item, retenu, axeIncoherent));
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    skipped: items.length - outcomes.length,
    outcomes,
    usage: { input: usageInput, output: usageOutput },
  };
}
