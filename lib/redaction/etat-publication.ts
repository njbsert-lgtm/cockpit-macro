import { extractBlockSource, type ParsedNote } from "@/lib/notes";
import type { BlockName } from "@/lib/note-blocks";
import type { Authorship } from "@/lib/types";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import {
  blocsAAuthorshipDirecte,
  conditionsManquantes,
  controlerChiffresPublication,
  resoudreRegime,
  CLE_MARCHES_CORRIGEES,
  type CleControlee,
  type ConditionManquante,
  type Decisions,
} from "./publication";
import type { RapportChiffres } from "./figures";
import { causesAControler, ligneDeLaPhrase } from "./marches-rendu";

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
    textesFinaux[bloc] = decision?.texte ?? extractBlockSource(note.body, bloc) ?? "";
    authorshipFinale[bloc] = decision?.authorship ?? "ia";
  }

  // « Les marchés par driver » : seules les causes sont du texte du modèle (le mouvement est écrit
  // par le code). Une cause du modèle, relue telle quelle, est contrôlée strictement ; une cause
  // retapée par un humain est signalée sans bloquer, comme tout texte corrigé.
  if (note.blocks.includes("LesMarchesParDriver")) {
    const { modele, corrigees } = causesAControler(brouillonPropose.marchesParDriver ?? [], decisions.lignes);
    textesFinaux.LesMarchesParDriver = modele;
    authorshipFinale.LesMarchesParDriver = "ia-relue";
    textesFinaux[CLE_MARCHES_CORRIGEES] = corrigees;
    authorshipFinale[CLE_MARCHES_CORRIGEES] = "ia-corrigee";
  }

  // La phrase de régime retenue est contrôlée sur son texte final. Une proposition du modèle
  // l'est strictement (`ia-relue`) ; une phrase écrite à la main est signalée sans bloquer, comme
  // tout texte qu'un humain a tapé.
  const regime = resoudreRegime(decisions.regime, note.meta.regimeStatementPropositions);
  if (regime) {
    textesFinaux.regimeStatement = regime.texte;
    authorshipFinale.regimeStatement = regime.choix === "propre" ? "humaine" : "ia-relue";
  }

  const rapportBrut = controlerChiffresPublication(
    textesFinaux,
    authorshipFinale,
    paquet,
    decisions.chiffres,
  );

  // Les nombres d'une cause du bloc marchés sont renvoyés à leur ligne : `corrigerPhrase` les refuse.
  const marches = brouillonPropose.marchesParDriver ?? [];
  const rattacher = (v: (typeof rapportBrut.verdicts)[number]) => {
    if (!v.bloc.startsWith("LesMarchesParDriver")) return v;
    const ligne = ligneDeLaPhrase(marches, decisions.lignes, v.phrase);
    return ligne ? { ...v, ligne } : v;
  };
  const rapportChiffres: RapportChiffres = {
    ...rapportBrut,
    verdicts: rapportBrut.verdicts.map(rattacher),
    ...(rapportBrut.bloquants ? { bloquants: rapportBrut.bloquants.map(rattacher) } : {}),
  };

  return { manquantes, rapportChiffres, pret: manquantes.length === 0 && !rapportChiffres.bloque };
}
