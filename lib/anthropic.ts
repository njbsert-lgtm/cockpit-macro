import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * Client Claude unique pour la rédaction automatique (`lib/redaction/`) et la passe 2 de veille
 * (`lib/veille/classify.ts`) — sur le modèle de `lib/supabase.ts` : mémoïsé, `null` quand la clé
 * manque plutôt qu'une exception, pour que l'absence de configuration se journalise proprement
 * au lieu de faire planter le script qui l'appelle.
 *
 * `claude-opus-5` par défaut pour les deux usages : le coût total estimé (moins de 6 $/mois pour
 * la rédaction hebdomadaire et la classification quotidienne réunies) ne justifie pas de
 * descendre en gamme sur une tâche qui, une fois publiée, n'est plus relue par personne.
 */

export const DEFAULT_MODEL = "claude-opus-5";

/**
 * Assez pour laisser le modèle rédiger une note complète (cinq blocs, révisions de scénario) en
 * une seule réponse structurée. En flux dans tous les cas — obligatoire au-delà de quelques
 * milliers de tokens de sortie pour ne pas heurter les délais HTTP du SDK.
 */
const DEFAULT_MAX_TOKENS = 32_000;

export type StructuredRequest<T> = {
  /** Instructions stables — grille de classification, ton du corpus, règles de citation. */
  system: string;
  /** Le contexte spécifique à ce run — items de veille, feuille de faits, note précédente. */
  user: string;
  /** Schéma Zod de la sortie attendue ; sert à la fois de JSON Schema et de validateur final. */
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

export type StructuredResult<T> = {
  value: T;
  usage: { input: number; output: number };
};

/**
 * Le type injectable — même rôle que `Fetcher` dans `lib/ingest.ts` : tout le pipeline de
 * rédaction et la passe 2 en dépendent en paramètre optionnel, jamais en import direct du SDK,
 * pour rester testables sans appel réseau.
 */
export type StructuredCaller = <T>(req: StructuredRequest<T>) => Promise<StructuredResult<T>>;

export function anthropicCaller(apiKey: string): StructuredCaller {
  const client = new Anthropic({ apiKey });

  return async <T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> => {
    const stream = client.messages.stream({
      model: req.model ?? DEFAULT_MODEL,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      thinking: { type: "adaptive" },
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: {
        effort: req.effort ?? "high",
        format: zodOutputFormat(req.schema),
      },
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new Error(
        `Claude a refusé la requête (${message.stop_details?.category ?? "raison non précisée"})`,
      );
    }
    if (!message.parsed_output) {
      throw new Error(`aucune sortie structurée dans la réponse (stop_reason: ${message.stop_reason})`);
    }

    return {
      value: message.parsed_output,
      usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
    };
  };
}

let caller: StructuredCaller | null | undefined;

/**
 * `ANTHROPIC_API_KEY`, rognée comme les clés Supabase (`lib/supabase.ts`) — un copier-coller
 * depuis un tableau de bord embarque volontiers un espace invisible.
 */
export function getAnthropicCaller(): StructuredCaller | null {
  if (caller !== undefined) return caller;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  caller = apiKey ? anthropicCaller(apiKey) : null;
  return caller;
}

/** Remise à zéro du client mémoïsé — pour les tests, qui changent l'environnement. */
export function resetAnthropicCallerForTests(): void {
  caller = undefined;
}
