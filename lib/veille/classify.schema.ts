import { z } from "zod";
import type { VeilleChannel, Zone } from "@/lib/types";

/**
 * Sortie structurée de la passe 2 — la grille des cinq canaux de transmission et le test
 * « flux ou déclaration » du cahier des charges, appliqués par le modèle plutôt que par un
 * mot-clé. `id` est un enum bâti sur le lot en cours : une réponse ne peut donc jamais citer un
 * item hors de ce qu'on lui a montré.
 */

const CHANNELS = [
  "taux-reel",
  "nature-choc",
  "fonction-reaction",
  "dollar",
  "positionnement",
] as const satisfies readonly VeilleChannel[];

// Même liste que `lib/zones.ts` (`ALL_ZONES`), reprise ici en tuple non vide requis par `z.enum`.
const ZONES = [
  "us",
  "ez",
  "fr",
  "de",
  "es",
  "it",
  "uk",
  "jp",
  "cn",
  "in",
  "em",
  "global",
] as const satisfies readonly Zone[];

export function buildClassificationSchema(itemIds: readonly [string, ...string[]], driverIds: string[]) {
  const driverEnum =
    driverIds.length > 0 ? z.enum(driverIds as [string, ...string[]]) : z.never();

  const itemSchema = z.object({
    id: z.enum(itemIds),
    isSignal: z.boolean(),
    nature: z.enum(["flux", "declaration"]),
    driverRefs: driverIds.length > 0 ? z.array(driverEnum) : z.array(z.never()).length(0),
    channels: z.array(z.enum(CHANNELS)),
    zones: z.array(z.enum(ZONES)).min(1),
    horizon: z.enum(["immediat", "semaine", "trimestre", "structurel"]),
    // Traçabilité de l'appel, jamais écrite en base — c'est ce qu'un humain relirait dans les
    // journaux du run s'il voulait comprendre un classement contestable.
    reasoning: z.string().max(300),
  });

  return z.object({ items: z.array(itemSchema) });
}

export type ClassificationBatch = z.infer<ReturnType<typeof buildClassificationSchema>>;
export type ClassifiedItem = ClassificationBatch["items"][number];
