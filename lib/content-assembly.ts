import { checkIntegrity } from "./integrity";
import { deriveDrivers } from "./drivers";
import { parseNote, validateNoteChain, type BlockName, type ParsedNote } from "./notes";
import type {
  Driver,
  DriverInput,
  Note,
  Outlook,
  ScenarioVersion,
  Trend,
  TrendDelta,
} from "./types";

/**
 * Le cœur d'assemblage du contenu, extrait de `lib/content.ts` pour que le pipeline de
 * rédaction automatique (`lib/redaction/`) puisse valider une note candidate — et ses deltas de
 * scénario/tendance — avec **exactement** les règles que l'application applique déjà au contenu
 * écrit à la main. Pas de duplication de logique : `lib/content.ts` et `lib/redaction/validate.ts`
 * appellent tous deux `assembleContent()`.
 *
 * Pure, sans accès disque : `noteSources` est déjà le texte des fichiers, pas leur chemin.
 */

export type ContentInputs = {
  noteSources: Array<{ slug: string; source: string }>;
  drivers: DriverInput[];
  trends: Trend[];
  scenarios: ScenarioVersion[];
  outlooks: Outlook[];
  /**
   * Contenu produit par la rédaction automatique, jamais écrit à la main — voir
   * `content/generated/*.generated.ts`. Vide en fonctionnement normal de l'application ; c'est
   * `lib/redaction/validate.ts` qui y ajoute la candidate en cours de validation.
   */
  generated: { scenarios: ScenarioVersion[]; trendDeltas: TrendDelta[] };
  instrumentIds: ReadonlySet<string>;
};

export type AssembledContent = {
  notes: Note[];
  bodies: Map<string, string>;
  blocks: Map<string, BlockName[]>;
  drivers: Driver[];
  trends: Trend[];
  scenarios: ScenarioVersion[];
};

/**
 * Fusionne les deltas de statut dans les tendances écrites à la main. Une tendance sans delta
 * est renvoyée **inchangée, par référence** — la fusion ne doit rien coûter au cas normal.
 */
export function mergeTrendDeltas(trends: Trend[], deltas: TrendDelta[]): Trend[] {
  if (deltas.length === 0) return trends;

  const byTrend = new Map<string, TrendDelta[]>();
  for (const delta of deltas) {
    byTrend.set(delta.trendId, [...(byTrend.get(delta.trendId) ?? []), delta]);
  }

  return trends.map((trend) => {
    const trendDeltas = byTrend.get(trend.id);
    if (!trendDeltas || trendDeltas.length === 0) return trend;

    const statusHistory = [...trend.statusHistory, ...trendDeltas.map((d) => d.entry)].sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    const status = statusHistory.at(-1)!.status;

    return { ...trend, status, statusHistory };
  });
}

export function assembleContent(inputs: ContentInputs): AssembledContent {
  const parsed: ParsedNote[] = inputs.noteSources.map(({ slug, source }) =>
    parseNote(slug, source),
  );

  // Règles propres à la chaîne des notes (comparesTo, récapitulatif des spéciales).
  const notes = validateNoteChain(parsed);

  const scenarios = [...inputs.scenarios, ...inputs.generated.scenarios];
  const trends = mergeTrendDeltas(inputs.trends, inputs.generated.trendDeltas);

  // Puis l'intégrité de tout le graphe, contenu généré compris, d'un seul tenant. Toute
  // référence morte lève ici : rien ne peut produire un lien mort à l'écran, le build échoue
  // avant — et une note candidate invalide n'est jamais écrite sur disque.
  checkIntegrity({
    drivers: inputs.drivers,
    trends,
    notes,
    scenarios,
    outlooks: inputs.outlooks,
    instrumentIds: inputs.instrumentIds,
  });

  return {
    notes,
    bodies: new Map(parsed.map((p) => [p.meta.slug, p.body])),
    blocks: new Map(parsed.map((p) => [p.meta.slug, p.blocks])),
    drivers: deriveDrivers(inputs.drivers, notes, scenarios),
    trends,
    scenarios,
  };
}
