import type { Cadence } from "./cadence";
import type { Zone } from "@/lib/types";

/**
 * Table de correspondance entre nos identifiants et les séries e-Stat (portail des statistiques
 * du gouvernement japonais). Même rôle que `config/fred-series.ts`, `config/eurostat-series.ts`
 * et `config/ons-series.ts`, avec une difficulté propre à e-Stat : chaque table a son propre
 * découpage de dimensions (`tab`, `cat01`…`cat0N`, `area`, `time`), sans convention commune
 * d'une table à l'autre — à l'inverse d'Eurostat, où `geo`, `unit`, `freq` se retrouvent partout.
 *
 * Deuxième particularité, qui n'a pas d'équivalent chez les trois autres sources : **l'axe
 * temporel n'est pas encodé de façon uniforme**. Deux schémas coexistent ici :
 *
 * - `"time"` — le code `@time` porte l'année et le mois ensemble, au format `AAAA00MMMM` (le
 *   mois répété deux fois — ex. `2026000808` pour août 2026, vérifié par appel réel sur les
 *   tables CPI et chômage). Une année fiscale s'y glisse sous la forme `AAAA100000`, que le
 *   même motif ignore naturellement puisqu'il ne correspond pas à `AAAA00MMMM`.
 * - `"cat01Month"` — `@time` ne porte que l'année (`AAAA000000`), et le mois vit dans la
 *   dimension `cat01` (« 調査月 », codes `101`…`112` pour janvier à décembre). Cette même
 *   dimension porte aussi des agrégats trimestriels (`94`…`97`) qu'il faut ignorer sans les
 *   confondre avec un mois — vérifié par appel réel sur la table des salaires.
 *
 * Toutes les valeurs ci-dessous ont été confrontées à de vraies réponses `getStatsData` (jamais
 * devinées) via le `workflow_dispatch` de `verification-sources.yml` (`estat-getdata`,
 * `metaGetFlg=Y`). Rien ne passe en collecte sans être sorti vert de `npm run estat:check`.
 */

export type EstatTimeScheme = "time" | "cat01Month";

export type EstatMapping = {
  target: { kind: "macro"; id: string };
  /** L'identifiant de la table e-Stat, ex. `0004052037`. */
  statsDataId: string;
  /**
   * Toutes les dimensions fixées, autres que le temps et — pour `cat01Month` — `cat01`
   * lui-même, qui varie intentionnellement pour porter le mois. Sérialisées telles quelles en
   * paramètres `cd<Dimension>` (`cdTab`, `cdCat01`, `cdArea`…). Chaque ligne de la réponse est
   * confrontée à ces codes : une divergence fait rejeter toute la réponse, même garde-fou que
   * la dimension non fixée d'Eurostat, adapté au style ligne-par-ligne d'e-Stat.
   */
  filters: Record<string, string>;
  timeScheme: EstatTimeScheme;
  cadence: Cadence;
  zone: Zone;
  /**
   * Bornes de plausibilité, en unité finale. Une valeur en dehors fait rejeter **toute la
   * réponse**, pas seulement le point fautif — même principe que les trois autres sources.
   */
  plausible: { min: number; max: number };
  /** Ce que `npm run estat:check` doit retrouver, pour confirmer qu'on lit la bonne série. */
  expect: { unitLabel?: string };
  enabled: boolean;
  /** Pourquoi cette série est désactivée. Obligatoire quand `enabled` est faux. */
  disabledReason?: string;
};

/** Profondeur d'historique demandée, en années — toutes les séries e-Stat actives sont mensuelles. */
export const LOOKBACK_YEARS: Record<Cadence, number> = {
  "business-daily": 1,
  monthly: 6,
  quarterly: 8,
  annual: 15,
};

export const ESTAT_SOURCE = "e-Stat";

const INFLATION_BOUNDS = { min: -5, max: 25 };
const UNEMPLOYMENT_BOUNDS = { min: 0, max: 30 };
// Variation mensuelle (前期比), pas glissement annuel : l'amplitude observée par appel réel
// (janvier, cat01=101) va de -2,8 à +2,2 sur vingt ans. Des bornes plus larges que ça
// attrapent quand même une erreur d'unité — ex. un indice à trois chiffres — sans censurer un
// mois de bonus atypique.
const WAGE_MOM_BOUNDS = { min: -15, max: 15 };

export const ESTAT_SERIES: EstatMapping[] = [
  // --- Inflation totale et sous-jacente (IPC, glissement annuel) ------------
  // Table 2025年基準消費者物価指数 (base 2025, publiée le 18/09/2026) — succède aux bases 2020,
  // 2015, 2010, 2005, chacune sous son propre statsDataId. `tab=3` : 前年同月比 (glissement
  // annuel, déjà en %). `area=00000` : 全国 (national), seul code du dataset.
  {
    target: { kind: "macro", id: "jp-cpi" },
    statsDataId: "0004052037",
    filters: { tab: "3", cat01: "0001", area: "00000" }, // cat01=0001 : 総合 (ensemble)
    timeScheme: "time",
    cadence: "monthly",
    zone: "jp",
    plausible: INFLATION_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },
  {
    target: { kind: "macro", id: "jp-cpi-core" },
    statsDataId: "0004052037",
    // cat01=0161 : 生鮮食品を除く総合 (hors alimentation fraîche) — trouvé par grep sur la
    // nomenclature réelle (`grep:生鮮食品`), jamais deviné.
    filters: { tab: "3", cat01: "0161", area: "00000" },
    timeScheme: "time",
    cadence: "monthly",
    zone: "jp",
    plausible: INFLATION_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Taux de chômage -------------------------------------------------------
  // Table 労働力調査 (enquête sur la population active), long-terme. `tab=02` : 率 (le taux,
  // seule option du dataset). `cat01=000` : 全産業 (tous secteurs, seule option). `cat02=08` :
  // 完全失業者 (chômeurs complets) — discriminant clé parmi les variantes actifs/employés/
  // chômeurs regroupées dans cette même table. `cat03=0` : 総数 (total, hommes+femmes).
  {
    target: { kind: "macro", id: "jp-unemployment" },
    statsDataId: "0003005865",
    filters: { tab: "02", cat01: "000", cat02: "08", cat03: "0", area: "00000" },
    timeScheme: "time",
    cadence: "monthly",
    zone: "jp",
    plausible: UNEMPLOYMENT_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },

  // --- Salaires ----------------------------------------------------------------
  // 毎月勤労統計調査 (enquête mensuelle sur le travail), 現金給与総額 (rémunération totale en
  // espèces), 季節調整済指数及び増減率 (indice désaisonnalisé et variation) — table courante
  // « 長期時系列表 », distinguée par appel réel d'une table gelée au titre presque identique
  // suffixé « (旧産業分類　2009年12月まで) ». `tab=3062` : 前期比 (variation par rapport à la
  // période précédente, en %) — seule transformation en taux disponible dans cette table
  // stable ; ce n'est **pas** un glissement annuel, à la différence de `uk-wages` (ONS) ou
  // `us-wages` (FRED). `cat02=TL` : 調査産業計 (tous secteurs). `cat03=T` : 5人以上 (5 salariés
  // et plus). `cat04=00` : 就業形態計 (tous statuts d'emploi, seule option).
  //
  // Particularité de cette table : `time` (調査年) ne porte que l'année (`AAAA000000`) ; le
  // mois vit dans `cat01` (調査月), codes `101`…`112` pour janvier à décembre. `cat01` est donc
  // volontairement absent de `filters` — c'est la dimension qui varie pour porter le mois, pas
  // une dimension oubliée. Les codes `94`…`97` (agrégats trimestriels) que porte aussi cette
  // dimension sont ignorés par construction : ils ne correspondent à aucun mois.
  {
    target: { kind: "macro", id: "jp-wages" },
    statsDataId: "0003138222",
    filters: { tab: "3062", cat02: "TL", cat03: "T", cat04: "00", area: "00000" },
    timeScheme: "cat01Month",
    cadence: "monthly",
    zone: "jp",
    plausible: WAGE_MOM_BOUNDS,
    expect: { unitLabel: "%" },
    enabled: true,
  },
];

/**
 * La croissance du PIB japonais (`jp-gdp`) n'a **aucune entrée ici**, et ce n'est pas un oubli.
 *
 * Contrairement aux autres relevés (IPC, chômage, salaires), les publications trimestrielles
 * du PIB (国民経済計算, comptes nationaux, Cabinet Office) n'accumulent pas dans une table
 * « longue série » à `statsDataId` stable : chaque publication trimestrielle reçoit son propre
 * identifiant. Trois recherches réelles via `getStatsList` (mot-clé, `statsCode` du relevé,
 * combinaison des deux) n'ont fait remonter aucune table de série longue exploitable — la
 * dernière renvoyant explicitement « 該当データはありませんでした » (aucune donnée
 * correspondante). Plutôt que de deviner un `statsDataId` qui devra être changé à chaque
 * publication, `jp-gdp` reste au seed jusqu'à ce qu'une table stable soit identifiée — même
 * discipline que `us-pmi` (FRED) et le PMI composite (Eurostat) : on documente l'absence
 * plutôt que d'inventer un identifiant fragile.
 */
export const JP_GDP_NOT_ON_ESTAT =
  "Comptes nationaux trimestriels (Cabinet Office) : chaque publication reçoit un nouveau " +
  "statsDataId, pas de table longue série stable trouvée après recherche réelle.";

/**
 * L'interrupteur général, basculé après un `npm run estat:check` vert.
 *
 * Les quatre séries ont été confrontées à de vraies réponses `getStatsData` le 18/09/2026 :
 * codes de dimension, format des deux schémas temporels, et valeurs plausibles vérifiés par
 * appel réel — jamais devinés.
 */
export const ESTAT_VERIFIED = true;

export const ENABLED_ESTAT_SERIES = ESTAT_VERIFIED ? ESTAT_SERIES.filter((m) => m.enabled) : [];

export function estatMappingFor(indicatorId: string): EstatMapping | null {
  return ENABLED_ESTAT_SERIES.find((m) => m.target.id === indicatorId) ?? null;
}
