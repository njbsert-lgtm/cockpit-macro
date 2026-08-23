import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredCaller } from "@/lib/anthropic";
import type { VeilleItem } from "@/lib/types";
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

reasoning : une phrase, pour l'audit du run — jamais écrite en base.`;

function formatDrivers(drivers: Array<{ id: string; label: string; question: string }>): string {
  if (drivers.length === 0) return "Aucun driver actif actuellement.";
  return drivers.map((d) => `- ${d.id} (« ${d.label} ») : ${d.question}`).join("\n");
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
};

export type ClassifyReport = {
  startedAt: string;
  finishedAt: string;
  ok: number;
  failed: number;
  /** Items reçus mais absents de la réponse du modèle — ni réussis ni en échec, repris demain. */
  skipped: number;
  outcomes: ClassifyOutcome[];
};

export type ClassifyContext = {
  drivers: Array<{ id: string; label: string; question: string }>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function writeClassification(
  client: SupabaseClient,
  classified: ClassifiedItem,
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

  return error
    ? { id: classified.id, ok: false, error: error.message }
    : { id: classified.id, ok: true };
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

  for (const batch of batches) {
    if (batch.length === 0) continue;
    const itemIds = batch.map((i) => i.id) as [string, ...string[]];
    const schema = buildClassificationSchema(itemIds, driverIds);

    const user = `Drivers actifs :\n${formatDrivers(context.drivers)}\n\nItems à classer :\n${formatItems(batch)}`;

    let response;
    try {
      response = await caller({ system: SYSTEM_PROMPT, user, schema, effort: "low" });
    } catch (err) {
      // Un lot entier en échec : rien n'est écrit pour ce lot, journalisé une fois par item
      // plutôt que silencieusement — « rejet d'une réponse malformée sans écriture ».
      const message = err instanceof Error ? err.message : String(err);
      for (const item of batch) outcomes.push({ id: item.id, ok: false, error: message });
      continue;
    }

    const classifiedById = new Map(response.value.items.map((c) => [c.id, c]));
    for (const item of batch) {
      const classified = classifiedById.get(item.id);
      if (!classified) continue; // omis par le modèle — repris au passage suivant, pas une erreur
      outcomes.push(await writeClassification(client, classified));
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    skipped: items.length - outcomes.length,
    outcomes,
  };
}
