import type { Zone } from "@/lib/types";

/**
 * Fonds monétaire international — l'inflation totale chinoise et indienne, que ni FRED (séries
 * OCDE discontinuées en 2025, voir `config/fred-series.ts`) ni une source nationale n'ont servie.
 * Dataflow `IMF.STA/CPI` (version 5.0.0) de l'API SDMX 2.1 de l'IMF (`api.imf.org`), sans clé.
 *
 * Confirmé par appels réels le 04/10/2026 (`sonder-brut`, `workflow_dispatch` de
 * `verification-sources.yml`) :
 * - La structure : cinq dimensions, dans l'ordre `COUNTRY.INDEX_TYPE.COICOP_1999.
 *   TYPE_OF_TRANSFORMATION.FREQUENCY`. La clé `CHN.CPI._T.YOY_PCH_PA_PT.M` désigne l'indice
 *   général (`_T`, tous postes) en glissement annuel (`YOY_PCH_PA_PT`), mensuel.
 * - Chine : 1,0 % en juin, 0,5 % en juillet, 0,8 % en août 2026.
 * - Inde : 3,5 % en avril, 3,9 % en mai, 4,4 % en juin, 4,4 % en juillet 2026.
 *
 * **Le glissement annuel est demandé à la source, pas calculé chez nous** — même règle que
 * `units=pc1` chez FRED (CLAUDE.md, « Ce qu'une source publie fait foi »). La source calcule le
 * taux depuis l'indice et le publie avec ses décimales de calcul (« 1.000065040145302 ») : on
 * arrondit à deux décimales à la lecture, c'est de la présentation d'un nombre déjà publié, pas
 * un recalcul.
 *
 * **Deux pièges de format, découverts par appel réel.** L'API répond du XML SDMX
 * (`StructureSpecificData`) quel que soit le `format` demandé — `lib/imf.ts` le lit sans
 * dépendance, attribut par attribut. Et les périodes sont de la forme `2026-M06`, pas `2026-06`.
 *
 * La mise à jour de l'IMF suit celle des instituts nationaux : l'Inde a deux mois de retard sur
 * la Chine (juillet contre août).
 */

export type ImfMapping = {
  target: { kind: "macro"; id: string };
  /** Le dataflow, sans l'agence : `CPI`. */
  flow: string;
  agency: string;
  version: string;
  /** La clé SDMX, dimensions séparées par des points. */
  key: string;
  /** Le code pays IMF attendu — une réponse qui en porterait un autre est rejetée. */
  country: string;
  /** La transformation attendue — une réponse en niveau d'indice serait une série entière fausse. */
  transformation: string;
  zone: Zone;
  plausible: { min: number; max: number };
  enabled: boolean;
  disabledReason?: string;
};

export const IMF_SOURCE = "IMF";

export const IMF_SERIES: ImfMapping[] = [
  {
    target: { kind: "macro", id: "cn-cpi" },
    flow: "CPI",
    agency: "IMF.STA",
    version: "5.0.0",
    key: "CHN.CPI._T.YOY_PCH_PA_PT.M",
    country: "CHN",
    transformation: "YOY_PCH_PA_PT",
    zone: "cn",
    plausible: { min: -10, max: 20 },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "in-cpi" },
    flow: "CPI",
    agency: "IMF.STA",
    version: "5.0.0",
    key: "IND.CPI._T.YOY_PCH_PA_PT.M",
    country: "IND",
    transformation: "YOY_PCH_PA_PT",
    zone: "in",
    plausible: { min: -5, max: 30 },
    enabled: true,
  },
];

/**
 * L'interrupteur général, sur le modèle de `BIS_VERIFIED` — basculé après les appels réels
 * confirmés ci-dessus.
 */
export const IMF_VERIFIED = true;

export const ENABLED_IMF_SERIES = IMF_VERIFIED ? IMF_SERIES.filter((m) => m.enabled) : [];

export function imfMappingFor(indicatorId: string): ImfMapping | null {
  return ENABLED_IMF_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
