import type { Authorship, VeilleChannel } from "@/lib/types";
import { structureMarchesParDriver } from "@/config/suivi";
import { cleLigne, type LigneMarche, type MarcheContexte, type MarcheDriver } from "./marches";
import type { WeeklyResult } from "@/lib/performance";

/**
 * Le corps MDX de « Les marchés par driver », **reconstruit par le code** depuis les lignes validées
 * et `weeklyChange` — comme l'ordre canonique du reste de la note. Le modèle n'a écrit aucun
 * caractère de ce que ce module produit, hormis les causes.
 *
 * Aucune moyenne ni agrégat par classe d'actifs : une ligne par instrument, rien d'autre.
 */

/** Le bloc existe pour une hebdo de la nouvelle structure — la même constante que partout. */
export function avecMarchesParDriver(note: { noteType: string; isoWeek: string }): boolean {
  return note.noteType === "hebdo" && structureMarchesParDriver(note.isoWeek);
}

export const SANS_LIEN_CLAIR = "Sans lien clair avec ce driver";

/**
 * Le geste du portail sur une ligne — un à la fois, jamais en bloc. `refuser` écarte la **cause
 * proposée** : le mouvement est un fait que le code écrit, seul le lien causal est un jugement, et
 * la ligne reste donc, « Sans lien clair ». `corriger` remplace la cause (et, si besoin, l'émetteur
 * parmi ceux de la fiche).
 */
export type DecisionLigne = {
  /**
   * `retirer` ne vaut que pour une ligne **sans cause proposée** à laquelle une cause a été ajoutée
   * de la main : elle revient à « Sans lien clair ». Le magasin ne sait pas effacer, c'est donc une
   * décision enregistrée — qui ne compte pour rien : ni ligne tranchée, ni pièce de l'authorship.
   */
  action: "accepter" | "corriger" | "refuser" | "retirer";
  cause?: string;
  emetteur?: string;
  /** Le canal de transmission de la cause corrigée ; absent : celui de la proposition. */
  canal?: VeilleChannel;
};

export type DecisionsLignes = Record<string, DecisionLigne>;

/** Les lignes à plat, avec leur clé de décision. */
export function lignesDuBloc(marches: MarcheDriver[]): Array<{ cle: string; driverId: string; ligne: LigneMarche }> {
  return marches.flatMap((m) =>
    m.lignes.map((ligne) => ({ cle: cleLigne(m.driverId, ligne.instrumentId), driverId: m.driverId, ligne })),
  );
}

/**
 * La ligne telle qu'elle sera publiée, une fois la décision appliquée. Sans décision, la proposition
 * du modèle — c'est ce que montre le brouillon, et ce qui bloque tant que rien n'est tranché.
 */
export function ligneEffective(ligne: LigneMarche, decision: DecisionLigne | undefined): LigneMarche {
  // « Retirer » ne défait que l'ajout d'un humain : une cause du modèle ne s'écarte que par « refuser ».
  if (decision?.action === "retirer") return ligne;
  if (decision?.action === "refuser") return { ...ligne, cause: null, emetteur: null, canal: null };
  if (decision?.action === "corriger" && decision.cause?.trim()) {
    const emetteur = decision.emetteur?.trim() || ligne.emetteur;
    // Une cause sans émetteur n'est pas attribuable : elle ne se publie pas.
    return emetteur
      ? { ...ligne, cause: decision.cause.trim(), emetteur, canal: decision.canal ?? ligne.canal }
      : { ...ligne, cause: null, emetteur: null, canal: null };
  }
  return ligne;
}

/**
 * L'authorship du bloc se déduit des lignes, comme celle du bloc 5 se déduit des guets : toutes
 * relues telles quelles → `ia-relue` ; au moins une corrigée → `ia-corrigee` ; au moins une jamais
 * ouverte → `ia`, donc publication bloquée. Une ligne refusée compte comme relue : elle a été
 * examinée et la cause écartée.
 */
export function authorshipBlocMarches(marches: MarcheDriver[], decisions: DecisionsLignes): Authorship {
  // Une ligne sans cause du modèle n'a aucun texte du modèle à relire (décision d'orchestrateur,
  // J1.4) : elle ne compte que si un humain y a ajouté la sienne.
  //
  // Cas limites, fixés par `marches-rendu.test.ts` :
  //  - aucune ligne à cause, aucune décision : `ia-relue` (rien d'écrit par le modèle à relire) ;
  //  - toutes les causes refusées : `ia-relue` (examinées, écartées) ;
  //  - une cause ajoutée de la main (décision `corriger` sur une ligne sans cause) : la ligne compte
  //    et pèse `ia-corrigee` — y compris si elle est seule, le bloc n'étant alors fait que de ce
  //    qu'un humain a ajouté à un bloc écrit par le code (cas non tranché par le cahier : voir le
  //    compte rendu J1.4) ;
  //  - cette cause ajoutée puis retirée (`retirer`) : comme si de rien n'était.
  const lignes = lignesDuBloc(marches).filter((l) => {
    const decision = decisions[l.cle];
    if (decision?.action === "retirer") return l.ligne.cause !== null; // ne défait que l'ajout d'un humain
    return l.ligne.cause !== null || decision !== undefined;
  });
  if (lignes.length === 0) return "ia-relue";
  const actions = lignes.map((l) => (decisions[l.cle]?.action === "retirer" ? undefined : decisions[l.cle]?.action));
  if (actions.some((a) => a === undefined)) return "ia";
  if (actions.some((a) => a === "corriger")) return "ia-corrigee";
  return "ia-relue";
}

/** L'authorship d'une ligne seule (pour le portail) : `ia` tant qu'elle n'est pas tranchée. */
export function authorshipLigne(decision: DecisionLigne | undefined): Authorship {
  if (!decision || decision.action === "retirer") return "ia";
  return decision.action === "corriger" ? "ia-corrigee" : "ia-relue";
}

const jourMois = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * « +12 bps » pour un taux ou un spread, « −2,3 % » pour le reste. Le signe est toujours écrit :
 * la couleur ne porte jamais l'information seule. Les bps s'arrondissent à l'entier — une clôture
 * de taux n'a que deux décimales ; le pourcentage garde une décimale.
 */
export function formaterVariation(m: Extract<WeeklyResult, { status: "ok" }>): string {
  const brut = m.unit === "bps" ? Math.round(m.value) : Math.round(m.value * 10) / 10;
  const signe = brut > 0 ? "+" : brut < 0 ? "−" : "";
  const nombre = m.unit === "bps" ? String(Math.abs(brut)) : Math.abs(brut).toFixed(1).replace(".", ",");
  return `${signe}${nombre}${m.unit === "bps" ? " bps" : " %"}`;
}

function sansPointFinal(texte: string): string {
  return texte.trim().replace(/[.;:\s]+$/, "");
}

/** Une ligne du bloc : le mouvement (écrit par le code), puis la cause attribuée ou l'aveu. */
export function rendreLigne(libelle: string, mesure: WeeklyResult, ligne: LigneMarche): string {
  const mouvement =
    mesure.status === "ok"
      ? `${formaterVariation(mesure)} sur la semaine (du ${jourMois(mesure.fromDate)} au ${jourMois(mesure.toDate)})`
      : mesure.message;
  const suite =
    ligne.cause !== null && ligne.emetteur !== null
      ? `cause : ${sansPointFinal(ligne.cause)} (${ligne.emetteur}).`
      : `${SANS_LIEN_CLAIR}.`;
  return `- **${libelle}** : ${mouvement} ; ${suite}`;
}

/**
 * Le corps du bloc. `### <nom du driver>`, puis une ligne par instrument. Un driver qui ne pilote
 * aucun instrument collecté ne produit pas de section : pas de ligne inventée.
 */
export function rendreBlocMarches(
  marches: MarcheDriver[],
  contexte: MarcheContexte[],
  decisions: DecisionsLignes = {},
): string {
  const parDriver = new Map(contexte.map((c) => [c.driverId, c]));
  const sections = marches.flatMap((m) => {
    const driver = parDriver.get(m.driverId);
    if (!driver || m.lignes.length === 0) return [];
    const instruments = new Map(driver.instruments.map((i) => [i.instrumentId, i]));
    const lignes = m.lignes.flatMap((l) => {
      const instrument = instruments.get(l.instrumentId);
      if (!instrument) return [];
      return [rendreLigne(instrument.label, instrument.mesure, ligneEffective(l, decisions[cleLigne(m.driverId, l.instrumentId)]))];
    });
    return lignes.length === 0 ? [] : [`### ${driver.label}\n\n${lignes.join("\n")}`];
  });
  return sections.length > 0
    ? sections.join("\n\n")
    : "Aucun instrument collecté ne pilote les drivers de cette note : le bloc n'a pas de ligne à écrire.";
}

/**
 * La clé de la ligne (`driverId/instrumentId`) dont la cause — telle qu'elle sera publiée, décisions
 * appliquées — contient la phrase d'un verdict de chiffres. Les chiffres d'une cause se règlent
 * depuis leur ligne (`trancherLigneMarche`), pas par `corrigerPhrase` : le portail s'en sert pour
 * renvoyer le nombre à sa ligne. `null` : aucune ligne ne porte cette phrase.
 */
export function ligneDeLaPhrase(marches: MarcheDriver[], decisions: DecisionsLignes, phrase: string): string | null {
  const cherchee = phrase.trim();
  if (!cherchee) return null;
  for (const { cle, ligne } of lignesDuBloc(marches)) {
    const effective = ligneEffective(ligne, decisions[cle]);
    if (effective.cause === null || effective.emetteur === null) continue;
    if (`${sansPointFinal(effective.cause)} (${effective.emetteur}).`.includes(cherchee)) return cle;
  }
  return null;
}

/**
 * Les causes à passer au contrôle des chiffres — **une phrase par ligne**, l'émetteur dans la même
 * phrase : c'est là que le régime B cherche l'attribution, et c'est là qu'un instrument nommé
 * bascule un nombre en régime A, où il lui faut une date. Le mouvement écrit par le code n'en fait
 * pas partie : il n'est pas du texte du modèle.
 *
 * `corrigees` sépare les causes retapées par un humain, relâchées comme tout texte corrigé.
 */
export function causesAControler(
  marches: MarcheDriver[],
  decisions: DecisionsLignes = {},
): { modele: string; corrigees: string } {
  const modele: string[] = [];
  const corrigees: string[] = [];
  for (const { cle, ligne } of lignesDuBloc(marches)) {
    const decision = decisions[cle];
    const effective = ligneEffective(ligne, decision);
    if (effective.cause === null || effective.emetteur === null) continue;
    const phrase = `${sansPointFinal(effective.cause)} (${effective.emetteur}).`;
    (decision?.action === "corriger" ? corrigees : modele).push(phrase);
  }
  return { modele: modele.join("\n"), corrigees: corrigees.join("\n") };
}
