"use server";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { extractBlockText } from "@/lib/notes";
import { BLOCK_NAMES, type BlockName } from "@/lib/note-blocks";
import { BROUILLONS_DIR } from "@/lib/redaction/run";
import { sauvegarderDecision } from "@/lib/redaction/decisions-store";
import type { DecisionGuet } from "@/lib/redaction/publication";
import type { Guet } from "@/lib/types";

/**
 * Les quatre gestes du portail, en Server Actions — même forme que `app/triage/actions.ts` :
 * clé de service, revalidation après écriture, erreurs explicites plutôt que des échecs
 * silencieux. Aucune ne publie : elles ne font qu'enregistrer une décision unitaire dans
 * `redaction_decisions`. La publication elle-même est un geste séparé, délibérément plus
 * coûteux — voir le portail lui-même.
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

/** Accepte ou refuse une proposition de révision de scénario pour un driver entier. */
export async function trancherRevision(
  slug: string,
  driverId: string,
  action: "accepter" | "refuser",
): Promise<void> {
  await sauvegarderDecision(slug, "revision", driverId, { action });
  revalidateApresDecision(slug);
}

/** Accepte ou refuse un changement de statut de tendance proposé. */
export async function trancherTendance(
  slug: string,
  trendId: string,
  action: "accepter" | "refuser",
): Promise<void> {
  await sauvegarderDecision(slug, "tendance", trendId, { action });
  revalidateApresDecision(slug);
}
