import { getReadClient, getWriteClient } from "@/lib/supabase";
import type { BlockName } from "@/lib/note-blocks";
import {
  decisionsVides,
  type Decisions,
  type DecisionBloc,
  type DecisionGuet,
  type DecisionProposition,
} from "./publication";

/**
 * Une ligne par décision, jamais un blob JSON par brouillon — pour que deux onglets ouverts
 * sur le même brouillon n'écrasent pas les décisions l'un de l'autre : `trancherGuet` sur
 * l'onglet A n'efface pas `corrigerBloc` pris sur l'onglet B entre-temps.
 *
 * `kind` couvre `bloc`, `guet`, `revision`, `tendance` — le bloc 4 se range sous `bloc` avec
 * `ref: "CeQueJavaisMalLu"`, exactement comme les autres blocs ; la valeur `bloc4` du schéma
 * SQL reste un vestige inerte, sans lecture ni écriture ici.
 */
export type DecisionKind = "bloc" | "guet" | "revision" | "tendance";

export async function sauvegarderDecision(
  slug: string,
  kind: DecisionKind,
  ref: string,
  decision: DecisionBloc | DecisionGuet | DecisionProposition,
): Promise<{ ok: boolean; erreur?: string }> {
  const client = getWriteClient();
  if (!client) return { ok: false, erreur: "Supabase non configuré côté écriture" };

  const { error } = await client
    .from("redaction_decisions")
    .upsert(
      { note_slug: slug, kind, ref, decision, updated_at: new Date().toISOString() },
      { onConflict: "note_slug,kind,ref" },
    );

  if (error) return { ok: false, erreur: error.message };
  return { ok: true };
}

/**
 * Recompose l'état complet des décisions d'un brouillon depuis ses lignes. Dégrade vers
 * `decisionsVides()` si Supabase est absent ou injoignable — un portail sans base ne doit pas
 * planter, il n'a simplement rien à afficher de tranché.
 */
export async function chargerDecisions(slug: string): Promise<Decisions> {
  const client = getReadClient();
  if (!client) return decisionsVides();

  const { data, error } = await client
    .from("redaction_decisions")
    .select("kind, ref, decision")
    .eq("note_slug", slug);

  if (error || !data) return decisionsVides();

  const decisions = decisionsVides();
  for (const row of data as Array<{ kind: string; ref: string; decision: unknown }>) {
    switch (row.kind) {
      case "bloc":
        decisions.blocs[row.ref as BlockName] = row.decision as DecisionBloc;
        break;
      case "guet":
        decisions.guets[row.ref] = row.decision as DecisionGuet;
        break;
      case "revision":
        decisions.revisions[row.ref] = row.decision as DecisionProposition;
        break;
      case "tendance":
        decisions.tendances[row.ref] = row.decision as DecisionProposition;
        break;
      default:
        break;
    }
  }
  return decisions;
}
