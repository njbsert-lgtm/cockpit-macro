import type { Zone } from "@/lib/types";

/**
 * OCDE — la croissance trimestrielle du PIB chinois et japonais, que ni FRED (séries OCDE
 * arrêtées en 2024 pour la Chine, voir `config/fred-series.ts`) ni e-Stat (pas de table longue
 * série stable pour le Japon) ni l'IMF (niveaux seulement, voir `config/imf-series.ts`) ne
 * servaient. Comptes nationaux trimestriels (`OECD.SDD.NAD`, structure `DSD_NAMAIN1`) de l'API
 * SDMX de l'OCDE (`sdmx.oecd.org`), sans clé.
 *
 * Confirmé par appels réels le 04/10/2026 (`sonder-brut`, `workflow_dispatch` de
 * `verification-sources.yml`) — **à la quatrième tentative, après trois clés fausses**. La
 * structure a treize dimensions, numérotées de 1 à 13 chez l'OCDE (pas de 0 à 13, ce qui a fait
 * placer le code pays sur la dimension `SECTOR` et rendu trois réponses `NoResultsFound` trompeuses
 * : y compris pour le Japon, qui est bien dans le flux) :
 * `FREQ.ADJUSTMENT.REF_AREA.SECTOR.COUNTERPART_SECTOR.TRANSACTION.INSTR_ASSET.ACTIVITY.EXPENDITURE.
 * UNIT_MEASURE.PRICE_BASE.TRANSFORMATION.TABLE_IDENTIFIER`. La clé est donc écrite en entier,
 * sans joker : `Q.Y.CHN.S1.S1.B1GQ._Z._Z._Z.PC.L.GY.T0102` — PIB (`B1GQ`), en pourcentage (`PC`),
 * en volume (`L`), transformation `GY`.
 *
 * - Chine, flux `DF_QNA_EXPENDITURE_GROWTH_G20` : 4,3 % au T2 2026, 5,0 % au T1.
 * - Japon, flux `DF_QNA_EXPENDITURE_GROWTH_OECD` : 0,73 % au T2 2026, 0,49 % au T1.
 *
 * **Une croissance sur un an, demandée à la source** (`GY`), jamais calculée chez nous : même
 * base de comparaison qu'Eurostat (même trimestre de l'année précédente), donc comparable en mode
 * comparaison avec la zone euro, la France, l'Allemagne, l'Espagne et l'Italie — contrairement à
 * l'ONS, qui publie la croissance sur trimestre. L'OCDE publie aussi `G1`, la croissance sur
 * trimestre (Chine : 0,9 % au T2) : non retenue, pour cette raison. Les valeurs japonaises
 * portent beaucoup de décimales (« 0.726654038 ») : arrondies à deux à la lecture.
 *
 * **Deuxième piège, trouvé au contrôle : `Accept-Language: *`.** Le contrôle officiel a répondu
 * « Internal server error » (500) à quatre reprises, à l'identique, alors que `curl` obtenait seize
 * trimestres chinois (de 3,0 % au T3 2022 à 4,3 % au T2 2026) sur la même URL. Le `fetch` de Node
 * envoie par défaut `Accept-Language: *`, et c'est cette valeur que l'API rejette : avec
 * `Accept-Language: en`, la même requête répond 200 (diagnostic du 04/10/2026, `npm run oecd:check`
 * rejoue les variantes d'en-têtes en cas d'échec). Ni `Accept`, ni le `User-Agent`, ni l'encodage
 * n'y changeaient rien — deux hypothèses fausses successives, écartées par mesure.
 *
 * Le flux est choisi par appartenance : le Japon est membre de l'OCDE, la Chine non — chacun a
 * son flux, et la même clé n'aurait pas de réponse dans l'autre.
 */

export type OecdMapping = {
  target: { kind: "macro"; id: string };
  /** L'identifiant du flux, sans l'agence : `DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_G20`. */
  dataflow: string;
  agency: string;
  version: string;
  /** La clé SDMX complète, treize dimensions séparées par des points. */
  key: string;
  /** Le code pays attendu dans `REF_AREA` — une autre réponse est rejetée. */
  area: string;
  /** La transformation attendue dans `TRANSFORMATION` : `GY`, sur un an. */
  transformation: string;
  zone: Zone;
  plausible: { min: number; max: number };
  enabled: boolean;
  disabledReason?: string;
};

export const OECD_SOURCE = "OCDE";

export const OECD_SERIES: OecdMapping[] = [
  {
    target: { kind: "macro", id: "cn-gdp" },
    dataflow: "DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_G20",
    agency: "OECD.SDD.NAD",
    version: "1.1",
    key: "Q.Y.CHN.S1.S1.B1GQ._Z._Z._Z.PC.L.GY.T0102",
    area: "CHN",
    transformation: "GY",
    zone: "cn",
    plausible: { min: -20, max: 30 },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "jp-gdp" },
    dataflow: "DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_OECD",
    agency: "OECD.SDD.NAD",
    version: "1.1",
    key: "Q.Y.JPN.S1.S1.B1GQ._Z._Z._Z.PC.L.GY.T0102",
    area: "JPN",
    transformation: "GY",
    zone: "jp",
    plausible: { min: -20, max: 20 },
    enabled: true,
  },
];

/** L'interrupteur général — basculé après les appels réels confirmés ci-dessus. */
export const OECD_VERIFIED = true;

export const ENABLED_OECD_SERIES = OECD_VERIFIED ? OECD_SERIES.filter((m) => m.enabled) : [];

export function oecdMappingFor(indicatorId: string): OecdMapping | null {
  return ENABLED_OECD_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
