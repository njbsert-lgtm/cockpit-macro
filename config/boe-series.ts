import type { Zone } from "@/lib/types";

/**
 * Le taux directeur britannique — pas une série ONS (voir `config/ons-series.ts`), mais la
 * Bank Rate publiée par la Banque d'Angleterre elle-même sur sa base interactive (IADB), en
 * accès libre et sans clé.
 *
 * Confirmé par appel réel le 28/09/2026 (`sonder-brut`, `workflow_dispatch` de
 * `verification-sources.yml`) :
 * `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes
 *   &Datefrom=01/Sep/2026&Dateto=28/Sep/2026&SeriesCodes=IUDBEDR&UsingCodes=Y&CSVF=TN`
 * répond un CSV `DATE,IUDBEDR` avec une ligne par jour ouvré, 3,75 sur tout septembre 2026 —
 * la Bank Rate ne change qu'aux réunions du comité de politique monétaire (MPC), exactement le
 * comportement en palier attendu pour un taux directeur (voir le cahier, Onglet 2).
 *
 * `IUDBEDR` est la série quotidienne. `IUMABEDR` (moyenne mensuelle) existe aussi mais n'apporte
 * rien de plus : la série quotidienne suffit à construire la vue en escalier.
 */

export type BoeMapping = {
  target: { kind: "macro"; id: string };
  seriesCode: string;
  zone: Zone;
  plausible: { min: number; max: number };
  enabled: boolean;
  disabledReason?: string;
};

export const BOE_SOURCE = "Bank of England";

export const BOE_SERIES: BoeMapping[] = [
  {
    target: { kind: "macro", id: "uk-policy-rate" },
    seriesCode: "IUDBEDR",
    zone: "uk",
    plausible: { min: -2, max: 20 },
    enabled: true,
  },
];

/**
 * L'interrupteur général, sur le modèle d'`ONS_VERIFIED` — basculé après un appel réel confirmé
 * (voir ci-dessus), pas après une simple lecture de documentation tierce.
 */
export const BOE_VERIFIED = true;

export const ENABLED_BOE_SERIES = BOE_VERIFIED ? BOE_SERIES.filter((m) => m.enabled) : [];

export function boeMappingFor(indicatorId: string): BoeMapping | null {
  return ENABLED_BOE_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
