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

export const MATERIALITES = ["haute", "moyenne", "faible"] as const;

/**
 * Ce que la passe 2 sait de la grille au-delà des drivers : les axes (chemins de transmission,
 * `content/axes.ts`) et les guets ouverts. Absents, les champs correspondants n'acceptent que
 * `null` — une réponse ne peut jamais citer un axe ou un guet qu'on ne lui a pas montré.
 */
export type ClassificationGrille = { axeIds?: string[]; guetIds?: string[] };

export function buildClassificationSchema(
  itemIds: readonly [string, ...string[]],
  driverIds: string[],
  grille: ClassificationGrille = {},
) {
  const driverEnum =
    driverIds.length > 0 ? z.enum(driverIds as [string, ...string[]]) : z.never();
  const axeIds = grille.axeIds ?? [];
  const guetIds = grille.guetIds ?? [];

  const itemSchema = z.object({
    id: z.enum(itemIds),
    isSignal: z.boolean(),
    nature: z.enum(["flux", "declaration"]),
    driverRefs: driverIds.length > 0 ? z.array(driverEnum) : z.array(z.never()).length(0),
    channels: z.array(z.enum(CHANNELS)),
    zones: z.array(z.enum(ZONES)).min(1),
    horizon: z.enum(["immediat", "semaine", "trimestre", "structurel"]),
    // Étape 4 — « aucun » est une réponse légitime : un item rattaché à un driver mais à aucun
    // de ses axes est précisément ce que le compteur d'angles morts doit voir.
    axeId: axeIds.length > 0 ? z.enum(axeIds as [string, ...string[]]).nullable() : z.null(),
    materialite: z.enum(MATERIALITES),
    resoutGuet: guetIds.length > 0 ? z.enum(guetIds as [string, ...string[]]).nullable() : z.null(),
    axeManquantPropose: z.string().max(140).nullable(),
    // Traçabilité de l'appel, jamais écrite en base — c'est ce qu'un humain relirait dans les
    // journaux du run s'il voulait comprendre un classement contestable.
    // Jamais lu ni écrit : une plafond serré ne fait que rejeter un item pour une phrase un peu
    // longue — constaté sur un run réel (« Too big: expected string to have <=300 characters »).
    reasoning: z.string().max(1500),
  });

  return z.object({ items: z.array(itemSchema) });
}

export type ClassificationBatch = z.infer<ReturnType<typeof buildClassificationSchema>>;
export type ClassifiedItem = ClassificationBatch["items"][number];
