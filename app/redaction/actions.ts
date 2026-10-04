"use server";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { extractBlockText, parseNote } from "@/lib/notes";
import { BLOCK_NAMES, type BlockName } from "@/lib/note-blocks";
import { BROUILLONS_DIR } from "@/lib/redaction/run";
import { sauvegarderDecision } from "@/lib/redaction/decisions-store";
import type { DecisionGuet, DecisionRegime } from "@/lib/redaction/publication";
import { resoudreRegime } from "@/lib/redaction/publication";
import { RETENUS_REGIME } from "@/lib/regime";
import type { Guet } from "@/lib/types";
import { chargerPortail } from "@/lib/redaction/portail";
import { etatPublication } from "@/lib/redaction/etat-publication";
import { declencherPublication } from "@/lib/redaction/github-dispatch";

/**
 * Les gestes du portail, en Server Actions — même forme que `app/triage/actions.ts` : clé de
 * service, revalidation après écriture, erreurs explicites plutôt que des échecs silencieux.
 * Les quatre premières n'enregistrent qu'une décision unitaire dans `redaction_decisions` ;
 * `publierBrouillon` est seule à déclencher la publication, et délibérément plus coûteuse —
 * voir le portail lui-même.
 */

function revalidateApresDecision(slug: string): void {
  revalidatePath(`/redaction/${slug}`);
}

function corpsBrouillon(slug: string): string {
  const fichier = path.join(BROUILLONS_DIR, `${slug}.mdx`);
  if (!existsSync(fichier)) throw new Error(`aucun brouillon pour « ${slug} »`);
  return readFileSync(fichier, "utf-8");
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Enregistre le texte final d'un bloc et en déduit l'authorship : identique au texte proposé
 * par le modèle → `ia-relue` (ouvert et validé sans modification) ; différent → `ia-corrigee`.
 * `CeQueJavaisMalLu` est toujours `humaine` — il n'a pas de proposition du modèle à comparer,
 * il part vide par construction (voir le cahier, § Rédaction assistée).
 */
export async function corrigerBloc(slug: string, bloc: string, formData: FormData): Promise<void> {
  if (!(BLOCK_NAMES as readonly string[]).includes(bloc)) {
    throw new Error(`bloc inconnu : « ${bloc} »`);
  }
  const texte = stringField(formData, "texte");

  if (bloc === "CeQueJavaisMalLu") {
    await sauvegarderDecision(slug, "bloc", bloc, { authorship: "humaine", texte });
    revalidateApresDecision(slug);
    return;
  }

  const source = corpsBrouillon(slug);
  const original = extractBlockText(source, bloc as BlockName)?.trim() ?? "";
  const authorship = texte.trim() === original ? "ia-relue" : "ia-corrigee";

  await sauvegarderDecision(slug, "bloc", bloc, { authorship, texte });
  revalidateApresDecision(slug);
}

/**
 * Retient une phrase de régime : l'un des trois angles proposés, ou une phrase écrite à la main.
 *
 * Pour un angle, le texte n'est **pas** lu dans le formulaire : il vient de la proposition du
 * brouillon, relue ici. Ce que le client renvoie n'est qu'un choix, jamais une phrase — sans quoi
 * un formulaire trafiqué ferait publier une phrase que le modèle n'a pas proposée et qu'aucun
 * contrôle de chiffres n'a vue. Aucune des trois n'est retenue par défaut : sans ce geste,
 * `conditionsManquantes` interdit la publication.
 */
export async function retenirRegime(slug: string, formData: FormData): Promise<void> {
  const choix = stringField(formData, "choix");
  if (!(RETENUS_REGIME as readonly string[]).includes(choix)) {
    throw new Error(`choix de phrase de régime inconnu : « ${choix} »`);
  }

  const propositions = parseNote(slug, corpsBrouillon(slug)).meta.regimeStatementPropositions;
  const demande: DecisionRegime = {
    choix: choix as DecisionRegime["choix"],
    texte: stringField(formData, "texte"),
  };
  const retenue = resoudreRegime(demande, propositions);
  if (!retenue) {
    throw new Error(
      choix === "propre"
        ? "une phrase écrite à la main ne peut pas être vide"
        : `aucune proposition « ${choix} » dans ce brouillon`,
    );
  }

  await sauvegarderDecision(slug, "regime", "regime", { choix: retenue.choix, texte: retenue.texte });
  revalidateApresDecision(slug);
}

const ACTIONS_GUET = ["accepter", "corriger", "refuser"] as const;
const CHAMPS_CORRECTION: Array<keyof Guet> = [
  "libelle",
  "attendu",
  "confirmeSi",
  "infirmeSi",
  "echeance",
  "sourceAttendue",
];

/** Tranche un guet proposé ou remonté — jamais en bloc, un à la fois. */
export async function trancherGuet(slug: string, guetId: string, formData: FormData): Promise<void> {
  const action = stringField(formData, "action");
  if (!(ACTIONS_GUET as readonly string[]).includes(action)) {
    throw new Error(`action de guet inconnue : « ${action} »`);
  }

  const decision: DecisionGuet = { action: action as DecisionGuet["action"] };
  if (action === "corriger") {
    const correction: DecisionGuet["correction"] = {};
    for (const champ of CHAMPS_CORRECTION) {
      const valeur = stringField(formData, champ);
      if (!valeur) continue;
      if (champ === "sourceAttendue") {
        correction.sourceAttendue = valeur.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (champ === "echeance") {
        correction.echeance = valeur;
      } else {
        (correction as Record<string, string>)[champ] = valeur;
      }
    }
    decision.correction = correction;
  }

  await sauvegarderDecision(slug, "guet", guetId, decision);
  revalidateApresDecision(slug);
}

const ACTIONS_PROPOSITION = ["accepter", "refuser"] as const;

function actionProposition(formData: FormData): "accepter" | "refuser" {
  const action = stringField(formData, "action");
  if (!(ACTIONS_PROPOSITION as readonly string[]).includes(action)) {
    throw new Error(`action de proposition inconnue : « ${action} »`);
  }
  return action as "accepter" | "refuser";
}

/** Accepte ou refuse une proposition de révision de scénario pour un driver entier. */
export async function trancherRevision(
  slug: string,
  driverId: string,
  formData: FormData,
): Promise<void> {
  await sauvegarderDecision(slug, "revision", driverId, { action: actionProposition(formData) });
  revalidateApresDecision(slug);
}

/** Accepte ou refuse un changement de statut de tendance proposé. */
export async function trancherTendance(
  slug: string,
  trendId: string,
  formData: FormData,
): Promise<void> {
  await sauvegarderDecision(slug, "tendance", trendId, { action: actionProposition(formData) });
  revalidateApresDecision(slug);
}

/**
 * Déclenche la publication — jamais ne l'exécute. Revérifie les conditions côté serveur avant
 * d'appeler GitHub : le bouton du portail est désactivé tant qu'elles manquent, mais un geste
 * qui commite ne doit jamais dépendre uniquement d'un état d'interface qui aurait pu dériver
 * (deux onglets ouverts, une décision prise entre le rendu de la page et le clic).
 *
 * Le workflow déclenché recharge les décisions depuis Supabase et refait le même calcul —
 * c'est lui l'autorité finale, cette revérification n'est qu'un premier filtre qui évite un
 * aller-retour GitHub inutile pour un brouillon manifestement pas prêt.
 */
export async function publierBrouillon(slug: string): Promise<void> {
  const etat = await chargerPortail(slug);
  if (!etat) throw new Error(`aucun brouillon chargeable pour « ${slug} »`);

  const publication = etatPublication(etat.note, etat.brouillonPropose, etat.decisions, etat.paquet);
  if (!publication.pret) {
    throw new Error(
      publication.rapportChiffres.bloque
        ? "un chiffre reste non conforme dans un bloc non relu"
        : (publication.manquantes[0]?.message ?? "des conditions de publication manquent"),
    );
  }

  const resultat = await declencherPublication(slug);
  if (!resultat.ok) throw new Error(resultat.erreur ?? "échec du déclenchement de la publication");

  revalidateApresDecision(slug);
}
