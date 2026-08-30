import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";

/**
 * Le contrôle des chiffres — **bloquant**.
 *
 * C'est le garde-fou le plus important du pipeline, parce que c'est la faute la plus
 * indétectable à la lecture : un chiffre légèrement de travers dans une phrase bien tournée
 * est invisible, et c'est précisément ce qu'un modèle produit quand il reformule.
 *
 * Il ne signale pas, il bloque. Un avertissement qu'on peut ignorer sera ignoré au bout de
 * trois semaines.
 */

export type VerdictChiffre = {
  /** Le nombre tel qu'il apparaît dans le texte. */
  ecrit: string;
  valeur: number;
  bloc: string;
  /** Ce à quoi il a été rattaché, quand il l'a été. */
  source: string | null;
  verdict: "trouve" | "introuvable";
};

export type RapportChiffres = {
  verdicts: VerdictChiffre[];
  /** Vrai dès qu'un seul nombre est introuvable. La publication est alors indisponible. */
  bloque: boolean;
};

/**
 * Repère les nombres d'un texte français : « 3,4 », « 25 249,85 », « +41 », « 2,5 % ».
 * L'espace insécable et l'espace fine sont des séparateurs de milliers courants en français.
 */
const NOMBRE = /[+-]?\d[\d   ]*(?:[.,]\d+)?/g;

/**
 * Les nombres qu'on ne confronte à rien : ils ne prétendent pas à une mesure.
 *
 * Une année ou un identifiant de semaine n'est pas une donnée de marché, et exiger qu'ils
 * figurent dans le paquet ferait bloquer toute note qui écrit « depuis 2024 ». Le seuil de
 * quatre chiffres sans décimale attrape les années sans écarter les valeurs d'indice, qui
 * portent presque toujours une décimale dans le paquet.
 */
function estNeutre(brut: string, valeur: number): boolean {
  if (/^\d{4}$/.test(brut) && valeur >= 1900 && valeur <= 2200) return true; // une année
  if (Number.isInteger(valeur) && Math.abs(valeur) <= 12) return true; // un rang, un compte
  return false;
}

function normaliser(brut: string): number {
  return Number(brut.replace(/[   ]/g, "").replace(",", "."));
}

/**
 * La tolérance est celle de l'arrondi, pas une marge libre : un nombre écrit avec une
 * décimale est comparé à 0,05 près, avec deux décimales à 0,005 près. Écrire « 3,4 » pour
 * 3,42 est correct ; écrire « 3,5 » ne l'est pas.
 */
function toleranceDe(brut: string): number {
  const decimales = brut.includes(",") ? brut.split(",")[1].length : 0;
  return 0.5 * 10 ** -decimales;
}

/** Toutes les valeurs que le paquet autorise à citer, avec leur provenance. */
function valeursAdmises(paquet: ContextePaquet): Array<{ valeur: number; source: string }> {
  const admises: Array<{ valeur: number; source: string }> = [];

  for (const obs of paquet.observations) {
    for (const v of obs.valeurs) {
      admises.push({ valeur: v.value, source: `${obs.instrumentId} au ${v.date}` });
    }
    if (obs.variationSemaine !== null) {
      admises.push({ valeur: obs.variationSemaine, source: `${obs.instrumentId} — var. semaine` });
    }
    if (obs.variationYTD !== null) {
      admises.push({ valeur: obs.variationYTD, source: `${obs.instrumentId} — var. YTD` });
    }
  }

  return admises;
}

/**
 * Le cœur du contrôle, indépendant de la forme de `Brouillon` : confronte chaque nombre d'une
 * liste `[étiquette, texte]` au paquet. Réutilisé tel quel par `lib/redaction/publication.ts`
 * pour re-contrôler après une édition humaine dans le portail — la même règle d'extraction et
 * de tolérance doit s'appliquer aux deux moments, sans quoi un chiffre jugé correct à la
 * rédaction pourrait être jugé faux à la publication pour une raison purement technique.
 */
export function extraireVerdicts(
  aControler: Array<[string, string]>,
  paquet: ContextePaquet,
): VerdictChiffre[] {
  const admises = valeursAdmises(paquet);
  const verdicts: VerdictChiffre[] = [];

  for (const [bloc, texte] of aControler) {
    for (const brut of texte.match(NOMBRE) ?? []) {
      const nettoye = brut.trim();
      const valeur = normaliser(nettoye);
      if (!Number.isFinite(valeur)) continue;
      if (estNeutre(nettoye, valeur)) continue;

      const tolerance = toleranceDe(nettoye);
      const trouve = admises.find((a) => Math.abs(Math.abs(a.valeur) - Math.abs(valeur)) <= tolerance);

      verdicts.push({
        ecrit: nettoye,
        valeur,
        bloc,
        source: trouve?.source ?? null,
        verdict: trouve ? "trouve" : "introuvable",
      });
    }
  }

  return verdicts;
}

/**
 * Confronte chaque nombre des blocs rédigés au paquet de contexte.
 *
 * `keyIndicators` et `regimeStatement` sont contrôlés au même titre que les blocs : un chiffre
 * faux en en-tête de note est au moins aussi visible qu'un chiffre faux dans le corps.
 */
export function controlerChiffres(brouillon: Brouillon, paquet: ContextePaquet): RapportChiffres {
  const aControler: Array<[string, string]> = [
    ["regimeStatement", brouillon.regimeStatement],
    ...brouillon.keyIndicators.map(
      (k): [string, string] => [`keyIndicators/${k.label}`, k.value],
    ),
    ...Object.entries(brouillon.blocs),
    ...brouillon.scenarioRevisions.flatMap((r) =>
      r.branches.flatMap((b): Array<[string, string]> => [
        [`scenarioRevisions/${r.driverId}/${b.branchId}/why`, b.why],
        [`scenarioRevisions/${r.driverId}/${b.branchId}/thesis`, b.thesis],
      ]),
    ),
  ];

  const verdicts = extraireVerdicts(aControler, paquet);
  return { verdicts, bloque: verdicts.some((v) => v.verdict === "introuvable") };
}

/** Le rapport en texte, pour le résumé du run et pour le portail. */
export function rendreRapport(rapport: RapportChiffres): string {
  if (rapport.verdicts.length === 0) return "Aucun chiffre dans le texte.";

  const lignes = rapport.verdicts.map((v) =>
    v.verdict === "trouve"
      ? `  ✓ ${v.ecrit.padEnd(12)} ${v.bloc} — ${v.source}`
      : `  ✗ ${v.ecrit.padEnd(12)} ${v.bloc} — introuvable dans le paquet`,
  );

  const introuvables = rapport.verdicts.filter((v) => v.verdict === "introuvable").length;
  const entete = rapport.bloque
    ? `${introuvables} chiffre(s) introuvable(s) sur ${rapport.verdicts.length} — publication bloquée`
    : `${rapport.verdicts.length} chiffre(s), tous rattachés au paquet`;

  return [entete, ...lignes].join("\n");
}
