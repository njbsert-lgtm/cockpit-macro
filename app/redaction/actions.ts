"use server";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { extractBlockText, parseNote } from "@/lib/notes";
import { BLOCK_NAMES, type BlockName } from "@/lib/note-blocks";
import { BROUILLONS_DIR } from "@/lib/redaction/run";
import { sauvegarderDecision as sauvegarderBrut } from "@/lib/redaction/decisions-store";
import type { DecisionGuet, DecisionRegime } from "@/lib/redaction/publication";
import { resoudreRegime } from "@/lib/redaction/publication";
import { RETENUS_REGIME } from "@/lib/regime";
import { idTheme } from "@/lib/themes";
import type { Guet } from "@/lib/types";
import { chargerPortail } from "@/lib/redaction/portail";
import { etatPublication } from "@/lib/redaction/etat-publication";
import { cleChiffre } from "@/lib/redaction/figures";
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
/**
 * Une décision que la base a refusée ne doit pas passer pour prise : sans cela, le bouton ne
 * réagit pas et le portail n'en dit rien. Le message de Supabase est remonté tel quel — contrainte
 * `redaction_decisions_kind_check` non migrée, clé d'écriture absente, table manquante.
 */
async function sauvegarderDecision(
  ...args: Parameters<typeof sauvegarderBrut>
): Promise<void> {
  const r = await sauvegarderBrut(...args);
  if (!r.ok) throw new Error(`décision non enregistrée — ${r.erreur ?? "erreur inconnue"}`);
}

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

/**
 * Accepte ou refuse un thème proposé. La clé est l'identifiant calculé côté serveur depuis le
 * brouillon, jamais un texte du formulaire : on ne tranche que ce que le modèle a réellement proposé.
 */
export async function trancherTheme(slug: string, themeId: string, formData: FormData): Promise<void> {
  const propositions = (await chargerPortail(slug))?.brouillonPropose.themesProposes ?? [];
  if (!propositions.some((t) => idTheme(t.libelle) === themeId)) {
    throw new Error(`aucun thème « ${themeId} » dans ce brouillon`);
  }
  await sauvegarderDecision(slug, "theme", themeId, { action: actionProposition(formData) });
  revalidateApresDecision(slug);
}

/** Retrouve, côté serveur, le verdict visé : on ne tranche que ce que le contrôle a réellement relevé. */
async function verdictFautif(slug: string, cle: string) {
  const etat = await chargerPortail(slug);
  if (!etat) throw new Error(`aucun brouillon chargeable pour « ${slug} »`);
  const publication = etatPublication(etat.note, etat.brouillonPropose, etat.decisions, etat.paquet);
  const verdict = publication.rapportChiffres.verdicts.find(
    (v) => v.verdict !== "conforme" && cleChiffre(v) === cle,
  );
  if (!verdict) throw new Error("ce chiffre n'est plus signalé — la page a changé, rechargez");
  return { etat, verdict };
}

/**
 * Garde un nombre signalé tel qu'il est écrit — après examen, un nombre à la fois. Le rapport
 * continue de le montrer (« gardé ») : la décision se relit, elle ne fait pas disparaître le verdict.
 */
export async function garderChiffre(slug: string, cle: string, formData: FormData): Promise<void> {
  await verdictFautif(slug, cle);
  const reprendre = stringField(formData, "action") === "examiner";
  await sauvegarderDecision(slug, "chiffre", cle, { action: reprendre ? "examiner" : "garder" });
  revalidateApresDecision(slug);
}

/**
 * Remplace la phrase qui porte le nombre signalé. Le bloc passe à `ia-corrigee` s'il diffère du
 * texte proposé : la correction est le geste qui relâche le contrôle, exactement comme une
 * édition du bloc entier.
 */
export async function corrigerPhrase(slug: string, cle: string, formData: FormData): Promise<void> {
  const { etat, verdict } = await verdictFautif(slug, cle);
  const bloc = verdict.bloc;
  if (!(BLOCK_NAMES as readonly string[]).includes(bloc)) {
    throw new Error("cette phrase ne se corrige pas ici — choisissez ou écrivez la phrase de régime");
  }
  const nouvelle = stringField(formData, "phrase");
  if (!nouvelle) throw new Error("la phrase corrigée ne peut pas être vide");

  const original = extractBlockText(etat.note.body, bloc as BlockName)?.trim() ?? "";
  const courant = etat.decisions.blocs[bloc as BlockName]?.texte ?? original;
  if (!courant.includes(verdict.phrase)) {
    throw new Error("la phrase n'est plus dans le bloc — rechargez la page");
  }
  const texte = courant.replace(verdict.phrase, nouvelle);
  const authorship = texte.trim() === original ? "ia-relue" : "ia-corrigee";
  await sauvegarderDecision(slug, "bloc", bloc, { authorship, texte });
  revalidateApresDecision(slug);
}
