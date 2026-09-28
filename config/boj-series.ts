import type { Zone } from "@/lib/types";

/**
 * Le taux directeur japonais — pas une série e-Stat (voir `config/estat-series.ts`, qui ne
 * couvre que les statistiques macro courantes), mais le taux du marché monétaire sur lequel la
 * BoJ opère : le taux de l'argent au jour le jour sans garantie (« Uncollateralized Overnight
 * Call Rate »), publié par la BoJ elle-même sur son portail « Time-Series Data Search », via son
 * API publique lancée en 2026 — sans clé.
 *
 * La BoJ n'annonce pas de chiffre unique comme cible : ses communiqués de politique monétaire
 * fixent une fourchette ou un objectif en prose, jamais une série numérique publiée. Le taux au
 * jour le jour réellement constaté est la réalisation de cet objectif — c'est ce que les
 * fournisseurs de données financières utilisent en pratique comme proxy du taux directeur
 * japonais (même principe que le Fed funds effectif côté FRED), et la seule série numérique que
 * la BoJ publie elle-même à cette fréquence.
 *
 * Confirmé par deux appels réels le 28/09/2026 (`sonder-brut`, `workflow_dispatch` de
 * `verification-sources.yml`) :
 * - `getMetadata?format=json&lang=en&db=FM01` liste `STRDCLUCON` — « Call Rate, Uncollateralized
 *   Overnight, Average (Daily) », catégorie « Call Rate ».
 * - `getDataCode?db=FM01&code=STRDCLUCON&format=json&startDate=202608&endDate=202609` répond un
 *   taux autour de 0,977 % sur toute la période, avec un saut isolé à 1,227 % — cohérent avec un
 *   relevé de comité de politique monétaire, pas un artefact.
 *
 * **Piège de format découvert par appel réel.** `startDate`/`endDate` se donnent en `AAAAMM`
 * (année-mois), jamais en date complète — une date complète (`2026-08-01`) est rejetée avec
 * `STATUS: 400`, `MESSAGEID: M181008E` (« période de début incorrecte »), y compris pour une
 * série quotidienne. La réponse elle-même date chaque point en `AAAAMMJJ` numérique
 * (`SURVEY_DATES`), jamais en `AAAAMM`.
 *
 * `null` marque les jours sans marché (week-ends) dans `VALUES` — à ignorer, jamais à confondre
 * avec un zéro.
 */

export type BojMapping = {
  target: { kind: "macro"; id: string };
  db: string;
  code: string;
  zone: Zone;
  plausible: { min: number; max: number };
  enabled: boolean;
  disabledReason?: string;
};

export const BOJ_SOURCE = "Bank of Japan";

export const BOJ_SERIES: BojMapping[] = [
  {
    target: { kind: "macro", id: "jp-policy-rate" },
    db: "FM01",
    code: "STRDCLUCON",
    zone: "jp",
    plausible: { min: -2, max: 15 },
    enabled: true,
  },
];

/**
 * L'interrupteur général, sur le modèle d'`ONS_VERIFIED`/`BOE_VERIFIED` — basculé après les deux
 * appels réels confirmés ci-dessus, pas après une simple lecture de documentation tierce.
 */
export const BOJ_VERIFIED = true;

export const ENABLED_BOJ_SERIES = BOJ_VERIFIED ? BOJ_SERIES.filter((m) => m.enabled) : [];

export function bojMappingFor(indicatorId: string): BojMapping | null {
  return ENABLED_BOJ_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
