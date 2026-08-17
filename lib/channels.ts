import type { VeilleChannel } from "./types";

/**
 * Les cinq canaux de transmission — le vocabulaire commun aux items de veille et aux notes.
 *
 * Ce sont des **couleurs de contenu** (DESIGN.md) : elles qualifient un sujet, une bande de
 * carte, une pastille. Elles ne touchent jamais un chiffre, où seuls `--hausse` et `--baisse`
 * ont cours.
 */

export const ALL_CHANNELS: VeilleChannel[] = [
  "taux-reel",
  "nature-choc",
  "fonction-reaction",
  "dollar",
  "positionnement",
];

export const CHANNEL_LABELS: Record<VeilleChannel, string> = {
  "taux-reel": "Taux réel",
  "nature-choc": "Nature du choc",
  "fonction-reaction": "Fonction de réaction",
  dollar: "Dollar",
  positionnement: "Positionnement",
};

/**
 * Les classes Tailwind par canal, énumérées en clair : une classe construite par
 * interpolation (`text-${...}`) ne serait pas vue par le compilateur et disparaîtrait du CSS.
 */
export const CHANNEL_TEXT: Record<VeilleChannel, string> = {
  "taux-reel": "text-k-taux",
  "nature-choc": "text-k-choc",
  "fonction-reaction": "text-k-reac",
  dollar: "text-k-usd",
  positionnement: "text-k-pos",
};

export const CHANNEL_BG: Record<VeilleChannel, string> = {
  "taux-reel": "bg-k-taux",
  "nature-choc": "bg-k-choc",
  "fonction-reaction": "bg-k-reac",
  dollar: "bg-k-usd",
  positionnement: "bg-k-pos",
};

/**
 * Le canal dominant d'une note : le premier déclaré. L'ordre du frontmatter est donc un
 * jugement — le canal par lequel la semaine s'explique le mieux vient en tête.
 */
export function dominantChannel(channels: VeilleChannel[]): VeilleChannel | null {
  return channels[0] ?? null;
}
