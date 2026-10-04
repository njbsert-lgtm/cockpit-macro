import { extractBlockText, type ParsedNote } from "@/lib/notes";
import type { BlockName } from "@/lib/note-blocks";
import type { Authorship } from "@/lib/types";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import {
  blocsAAuthorshipDirecte,
  conditionsManquantes,
  controlerChiffresPublication,
  resoudreRegime,
  type CleControlee,
  type ConditionManquante,
  type Decisions,
} from "./publication";
import type { RapportChiffres } from "./figures";

export type EtatPublication = {
  manquantes: ConditionManquante[];
  rapportChiffres: RapportChiffres;
  /** Aucune condition manquante et aucun blocage sur les chiffres. */
  pret: boolean;
};

/**
 * L'état de publication **avant** toute décision finale — recalculé à chaque rendu de la page,
 * à partir des décisions déjà prises. Pour un bloc pas encore tranché, le texte considéré est
 * celui que le modèle a proposé (encore sur le disque) avec l'authorship `ia` : c'est
 * exactement ce qui bloquerait si on publiait maintenant, donc c'est ce qu'il faut montrer.
 *
 * `CeQueJeSurveille` en est exclu, pour la même raison qu'à l'assemblage final
 * (`assemblerNoteFinale`) : sa prose n'est jamais publiée telle quelle une fois les guets
 * structurés en place — c'est la liste de guets qui porte le contenu, pas le corps du bloc.
 */
export function etatPublication(
  note: ParsedNote,
  brouillonPropose: Brouillon,
  decisions: Decisions,
  paquet: ContextePaquet,
): EtatPublication {
  const manquantes = conditionsManquantes(note, brouillonPropose, decisions);

  const textesFinaux: Partial<Record<CleControlee, string>> = {};
  const authorshipFinale: Partial<Record<CleControlee, Authorship>> = {};
  for (const bloc of blocsAAuthorshipDirecte(note.blocks)) {
    const decision = decisions.blocs[bloc];
    textesFinaux[bloc] = decision?.texte ?? extractBlockText(note.body, bloc) ?? "";
    authorshipFinale[bloc] = decision?.authorship ?? "ia";
  }

  // La phrase de régime retenue est contrôlée sur son texte final. Une proposition du modèle
  // l'est strictement (`ia-relue`) ; une phrase écrite à la main est signalée sans bloquer, comme
  // tout texte qu'un humain a tapé.
  const regime = resoudreRegime(decisions.regime, note.meta.regimeStatementPropositions);
  if (regime) {
    textesFinaux.regimeStatement = regime.texte;
    authorshipFinale.regimeStatement = regime.choix === "propre" ? "humaine" : "ia-relue";
  }

  const rapportChiffres = controlerChiffresPublication(textesFinaux, authorshipFinale, paquet);

  return { manquantes, rapportChiffres, pret: manquantes.length === 0 && !rapportChiffres.bloque };
}
