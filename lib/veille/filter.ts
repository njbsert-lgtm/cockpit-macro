import { createHash } from "node:crypto";
import type { VeilleChannel, VeilleItem, Zone } from "@/lib/types";
import { CHANNEL_KEYWORDS, DRIVER_KEYWORDS } from "@/config/veille-taxonomy";

/**
 * La passe 1 : déterministe, sans IA, appliquée après que tous les collecteurs ont remonté
 * leurs candidats bruts — c'est ce qui permet le plafond quotidien de classer à travers les
 * sources plutôt que par source isolée.
 */

export type RawVeilleCandidate = {
  title: string;
  url: string;
  source: string;
  /** Plus haut = plus autorisé. Un communiqué officiel prime sur une détection GDELT. */
  sourceAuthority: number;
  publishedAt: string;
  zones: Zone[];
  /**
   * Rattachement posé par le collecteur lui-même, en configuration plutôt que par mot-clé —
   * le cas de SEC EDGAR, dont les émetteurs suivis sont déjà associés à un driver
   * (`EDGAR_TRACKED_ISSUERS`) alors qu'un titre de dépôt réglementaire ne contient jamais le
   * mot-clé qui le trahirait. Fusionné avec les mots-clés détectés dans le titre, pas remplacé.
   */
  driverRefs?: string[];
};

export type FilteredVeilleCandidate = RawVeilleCandidate & {
  driverRefs: string[];
  channels: VeilleChannel[];
  /** Nombre de mots-clés reconnus, toutes catégories confondues — la correspondance thématique. */
  relevance: number;
};

export const DAILY_TRANSMISSION_CAP = 40;

function matchKeywords<K extends string>(text: string, dictionary: Record<K, string[]>): K[] {
  const lower = text.toLowerCase();
  return (Object.keys(dictionary) as K[]).filter((key) =>
    dictionary[key].some((keyword) => lower.includes(keyword.toLowerCase())),
  );
}

/**
 * Un item ne survit que s'il cite un mot-clé de driver ou de canal de transmission — ou porte
 * déjà un `driverRefs` posé par son collecteur. Le matching porte uniquement sur le titre :
 * c'est la seule matière qu'on stocke, jamais le texte intégral d'un article (droit d'auteur).
 */
export function applyKeywordGate(candidate: RawVeilleCandidate): FilteredVeilleCandidate | null {
  const fromTitle = matchKeywords(candidate.title, DRIVER_KEYWORDS);
  const driverRefs = Array.from(new Set([...fromTitle, ...(candidate.driverRefs ?? [])]));
  const channels = matchKeywords(candidate.title, CHANNEL_KEYWORDS);
  if (driverRefs.length === 0 && channels.length === 0) return null;

  return { ...candidate, driverRefs, channels, relevance: driverRefs.length + channels.length };
}

/**
 * Classe par autorité de la source puis par correspondance thématique, et ne retient que les
 * `remainingSlots` premiers — le plafond quotidien, moins ce qui a déjà été écrit aujourd'hui.
 * Un `remainingSlots` négatif ou nul ne retient rien : la journée est pleine.
 */
export function rankAndCap(
  candidates: FilteredVeilleCandidate[],
  remainingSlots: number,
): FilteredVeilleCandidate[] {
  const ranked = [...candidates].sort(
    (a, b) => b.sourceAuthority - a.sourceAuthority || b.relevance - a.relevance,
  );
  return ranked.slice(0, Math.max(0, remainingSlots));
}

/** Hash stable de (source, url) — l'upsert sur cet identifiant le rend idempotent. */
export function stableId(source: string, url: string): string {
  return createHash("sha256").update(`${source}|${url}`).digest("hex").slice(0, 24);
}

export function toVeilleItem(candidate: FilteredVeilleCandidate): VeilleItem {
  return {
    id: stableId(candidate.source, candidate.url),
    title: candidate.title,
    url: candidate.url,
    source: candidate.source,
    publishedAt: candidate.publishedAt,
    zones: candidate.zones,
    driverRefs: candidate.driverRefs,
    channels: candidate.channels,
    // Tout ce qui survit à la passe 1 est provisoirement « signal » — la passe 2, qui
    // affinerait ce jugement, n'est pas encore construite (cahier des charges, ordre de
    // construction : passe 1 seule d'abord, l'observer une semaine avant la classification).
    isSignal: true,
    status: "nouveau",
    attachedToBlock: null,
    draftNoteSlug: null,
  };
}
