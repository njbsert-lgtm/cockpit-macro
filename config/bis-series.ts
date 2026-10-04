import type { Zone } from "@/lib/types";

/**
 * Banque des règlements internationaux — trois séries que ni FRED, ni Eurostat, ni les sources
 * nationales déjà branchées ne servaient : le taux directeur chinois et indien, et la dette
 * publique japonaise. Portail statistique de la BRI (`stats.bis.org`, API SDMX v2), sans clé.
 *
 * Confirmé par appels réels le 04/10/2026 (`sonder-brut`, `workflow_dispatch` de
 * `verification-sources.yml`) :
 * - `WS_CBPOL` (« Central bank policy rates »), `M.CN` : le **LPR à 1 an** de la PBOC — 3 % en
 *   juin, juillet et août 2026. La BRI y chaîne le taux officiel de prêt à 1 an jusqu'au
 *   19/08/2019 puis le LPR : c'est exactement la série que le catalogue désigne (« Taux
 *   directeur (PBOC, LPR 1 an) »).
 * - `WS_CBPOL`, `M.IN` : le taux de repo au jour le jour de la RBI — 5,25 % d'avril à juin 2026.
 *   La BRI a trois mois de retard sur l'Inde, un seulement sur la Chine : la source publie à la
 *   cadence de chaque banque centrale, pas à la sienne.
 * - `WS_TC` (« Total credit »), `Q.JP.G.A.N.770.A` : crédit aux administrations publiques,
 *   **en valeur nominale**, en part du PIB, corrigé des ruptures — 195,9 % au T3 2025, 193,3 % au
 *   T4, 193,6 % au T1 2026. La variante en valeur de marché (`M`) donne 175,6 % : elle réévalue
 *   les titres au prix du jour, ce qui n'est pas la dette brute que le catalogue désigne.
 *
 * **Piège de format découvert par appel réel.** L'API v2 refuse `format=jsondata`
 * (« Unsupported format », code 406) : le CSV, lui, répond. D'où `lib/bis.ts`, qui lit du CSV.
 *
 * Le taux directeur japonais reste servi par la BoJ (`config/boj-series.ts`) : la BRI le publie
 * aussi, sous forme de cible officielle (1,25 % depuis le 24/09/2026), mais deux sources pour un
 * même identifiant ne se mélangent jamais — voir CLAUDE.md, « Aucune donnée en dur ».
 */

export type BisMapping = {
  target: { kind: "macro"; id: string };
  /** Le flux, sans l'agence : `WS_CBPOL`, `WS_TC`. */
  flow: string;
  version: string;
  /** La clé SDMX, dimensions séparées par des points. */
  key: string;
  /** La colonne qui porte le pays dans la réponse — `REF_AREA` ou `BORROWERS_CTY` selon le flux. */
  areaColumn: string;
  /** Le pays attendu : une réponse qui porterait un autre pays est rejetée. */
  area: string;
  frequency: "monthly" | "quarterly";
  zone: Zone;
  plausible: { min: number; max: number };
  enabled: boolean;
  disabledReason?: string;
};

export const BIS_SOURCE = "BIS";

export const BIS_SERIES: BisMapping[] = [
  {
    target: { kind: "macro", id: "cn-policy-rate" },
    flow: "WS_CBPOL",
    version: "1.0",
    key: "M.CN",
    areaColumn: "REF_AREA",
    area: "CN",
    frequency: "monthly",
    zone: "cn",
    plausible: { min: 0, max: 15 },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "in-policy-rate" },
    flow: "WS_CBPOL",
    version: "1.0",
    key: "M.IN",
    areaColumn: "REF_AREA",
    area: "IN",
    frequency: "monthly",
    zone: "in",
    plausible: { min: 0, max: 25 },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "jp-debt-gdp" },
    flow: "WS_TC",
    version: "2.0",
    key: "Q.JP.G.A.N.770.A",
    areaColumn: "BORROWERS_CTY",
    area: "JP",
    frequency: "quarterly",
    zone: "jp",
    plausible: { min: 50, max: 400 },
    enabled: true,
  },
];

/**
 * L'interrupteur général, sur le modèle de `BOJ_VERIFIED` — basculé après les appels réels
 * confirmés ci-dessus, pas après une simple lecture de documentation.
 */
export const BIS_VERIFIED = true;

export const ENABLED_BIS_SERIES = BIS_VERIFIED ? BIS_SERIES.filter((m) => m.enabled) : [];

export function bisMappingFor(indicatorId: string): BisMapping | null {
  return ENABLED_BIS_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
