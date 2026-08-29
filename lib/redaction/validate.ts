import { parseNote, validateNoteChain, readNoteSources } from "@/lib/notes";
import { assembleContent } from "@/lib/content-assembly";
import { DRIVERS } from "@/content/drivers";
import { TRENDS } from "@/content/tendances";
import { SCENARIO_VERSIONS } from "@/content/scenarios";
import { OUTLOOKS } from "@/content/outlooks";
import { GENERATED_SCENARIO_VERSIONS } from "@/content/generated/scenarios.generated";
import { GENERATED_TREND_DELTAS } from "@/content/generated/tendances.generated";
import { getInstruments } from "@/lib/data";

/**
 * Le portail de validation — il assemble la note candidate **avec le corpus réel** et fait
 * tourner les mêmes validateurs que l'application, par construction et non par convention.
 *
 * C'est le seul argument qui rend une rédaction automatique tolérable, et il faut être
 * honnête sur sa limite : il attrape les mensonges *structurels* — référence morte, bloc
 * manquant, ordre non canonique, révision sans justification — pas un chiffre faux dans une
 * prose par ailleurs plausible. C'est le contrôle des chiffres qui s'en charge, séparément,
 * et lui aussi bloque.
 */

export class RedactionRejeteeError extends Error {
  constructor(
    public readonly raison: string,
    public readonly origine: unknown,
  ) {
    super(raison);
    this.name = "RedactionRejeteeError";
  }
}

export type ResultatValidation =
  | { ok: true }
  | { ok: false; raison: string };

/**
 * Valide une note candidate sans rien écrire sur le disque.
 *
 * Le brouillon est ajouté au corpus **en mémoire**, exactement comme s'il était publié : c'est
 * la seule façon de savoir s'il passerait la validation le jour où on le publiera. On ne veut
 * pas découvrir au moment de publier que la note est invalide depuis une semaine.
 */
export type GrapheInjecte = {
  drivers: typeof DRIVERS;
  trends: typeof TRENDS;
  scenarios: typeof SCENARIO_VERSIONS;
  outlooks: typeof OUTLOOKS;
  instrumentIds: ReadonlySet<string>;
};

export function validerBrouillon(input: {
  slug: string;
  mdx: string;
  /** Les sources du corpus déjà sur le disque — injectées pour rester testable. */
  sourcesExistantes?: Array<{ slug: string; source: string }>;
  /**
   * Le reste du graphe. Injectable pour la même raison : les tendances et scénarios réels
   * citent les notes réelles, et un corpus de test réduit les ferait lever pour une raison
   * qui n'a rien à voir avec le brouillon qu'on éprouve.
   */
  graphe?: GrapheInjecte;
}): ResultatValidation {
  const existantes = input.sourcesExistantes ?? readNoteSources();
  const graphe: GrapheInjecte = input.graphe ?? {
    drivers: DRIVERS,
    trends: TRENDS,
    scenarios: SCENARIO_VERSIONS,
    outlooks: OUTLOOKS,
    instrumentIds: new Set(getInstruments().map((i) => i.id)),
  };

  try {
    // `parseNote` d'abord et seul, pour que l'erreur nomme la note candidate plutôt que de se
    // perdre dans un message de chaîne.
    parseNote(input.slug, input.mdx);
  } catch (error) {
    return { ok: false, raison: (error as Error).message };
  }

  try {
    assembleContent({
      noteSources: [...existantes, { slug: input.slug, source: input.mdx }],
      drivers: graphe.drivers,
      trends: graphe.trends,
      scenarios: graphe.scenarios,
      outlooks: graphe.outlooks,
      generated: {
        scenarios: GENERATED_SCENARIO_VERSIONS,
        trendDeltas: GENERATED_TREND_DELTAS,
      },
      instrumentIds: graphe.instrumentIds,
    });
  } catch (error) {
    return { ok: false, raison: (error as Error).message };
  }

  return { ok: true };
}

/**
 * La chaîne des notes seule — vérification rapide, sans le graphe d'intégrité complet. Sert
 * au portail, qui rejoue la validation à chaque édition de bloc et n'a pas besoin de
 * recharger drivers, tendances et scénarios à chaque frappe.
 */
export function validerChaine(
  sources: Array<{ slug: string; source: string }>,
): ResultatValidation {
  try {
    validateNoteChain(sources.map((s) => parseNote(s.slug, s.source)));
    return { ok: true };
  } catch (error) {
    return { ok: false, raison: (error as Error).message };
  }
}
