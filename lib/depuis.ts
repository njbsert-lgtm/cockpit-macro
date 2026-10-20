import type { Note, ScenarioLikelihood, ScenarioVersion } from "./types";
import { extractBlockSource } from "./notes";
import { branchSemantic, type BranchSemantic } from "./branch-semantics";
import { repereDeRevision } from "./revision";

/**
 * « Depuis S41 » : ce qui a changé entre la note courante et celle à laquelle elle se compare,
 * lu en ouvrant l'application. Trois sortes de lignes, chacune tirée d'un objet déjà écrit — rien
 * n'est résumé ni recalculé :
 *
 * - **révision** : une branche dont la vraisemblance a changé dans cette note
 *   (`likelihoodChangedFrom` non nul sur une version portant son slug) ;
 * - **guet échu** : un guet encore ouvert dont l'échéance est atteinte — il attend un verdict ;
 * - **nouvelle lecture** : les premiers sous-titres du bloc « Ce qui a changé ».
 *
 * Aucune ligne : la section ne se dessine pas, plutôt qu'un vide qui dirait « rien n'a bougé »
 * sans que la note l'ait écrit.
 */
export type LigneDepuis =
  | {
      type: "revision";
      driverId: string;
      driverLabel: string;
      branche: string;
      /**
       * L'état précédent et la semaine de la version qui le portait — `null` quand cette version
       * n'est plus suivie (`lib/revision.ts`) : la ligne dit alors « Première version suivie »,
       * jamais « de X à Y » depuis un état que plus aucune note ne porte.
       */
      avant: ScenarioLikelihood | null;
      semaineAvant: string | null;
      apres: ScenarioLikelihood;
      semantique: BranchSemantic;
    }
  | { type: "guet"; driverLabel: string; libelle: string; echeance: string }
  | { type: "lecture"; sujet: string; libelle: string };

export const LECTURES_MAX = 2;

/** « Le pétrole » → « Pétrole » : le sous-titre nomme, le surtitre n'a pas besoin de l'article. */
export function sujetSansArticle(titre: string): string {
  const sans = titre.trim().replace(/^(les|le|la|l'|l’)\s*/i, "");
  return sans.charAt(0).toUpperCase() + sans.slice(1);
}

/**
 * Le libellé d'une lecture : l'affirmation en gras qui ouvre le paragraphe, dont on garde la
 * partie après les deux-points quand elle en a — « Le pétrole change de récit : de la tension
 * sur l'offre à l'anticipation d'un excédent. » se lit « De la tension sur l'offre… ».
 */
export function libelleDeLecture(paragraphe: string, repli: string): string {
  const gras = /\*\*(.+?)\*\*/.exec(paragraphe)?.[1];
  if (!gras) return repli;
  const apres = gras.includes(" : ") ? gras.slice(gras.indexOf(" : ") + 3) : gras;
  const net = apres.trim().replace(/[.\s]+$/, "");
  return net.charAt(0).toUpperCase() + net.slice(1);
}

export function lecturesDuBloc(body: string, max = LECTURES_MAX): Array<{ sujet: string; libelle: string }> {
  const bloc = extractBlockSource(body, "CeQuiAChange");
  if (!bloc) return [];
  return bloc
    .split(/^###\s+/m)
    .slice(1)
    .map((section) => {
      const [titre, ...reste] = section.split("\n");
      const sujet = sujetSansArticle(titre);
      return { sujet, libelle: libelleDeLecture(reste.join("\n"), sujet) };
    })
    .filter((l) => l.sujet.length > 0)
    .slice(0, max);
}

export function changementsDepuis({
  note,
  body,
  versions,
  driverLabels,
  branchLabels,
  aujourdhui,
}: {
  note: Note;
  body: string | null;
  versions: ScenarioVersion[];
  driverLabels: Record<string, string>;
  branchLabels: Record<string, string>;
  aujourdhui: string;
}): LigneDepuis[] {
  const revisions: LigneDepuis[] = versions
    .filter((v) => v.noteSlug === note.slug && v.likelihoodChangedFrom !== null)
    .map((v) => {
      const repere = repereDeRevision(versions, v);
      return {
        type: "revision" as const,
        driverId: v.driverId,
        driverLabel: driverLabels[v.driverId] ?? v.driverId,
        branche: branchLabels[v.branchId] ?? v.branchId,
        avant: repere?.type === "revision" ? repere.avant : null,
        semaineAvant: repere?.type === "revision" ? repere.semaine : null,
        apres: v.likelihood,
        semantique: branchSemantic(v),
      };
    });

  const guets: LigneDepuis[] = note.guets
    .filter((g) => g.statut === "ouvert" && g.echeance !== null && g.echeance <= aujourdhui)
    .map((g) => ({
      type: "guet" as const,
      driverLabel: driverLabels[g.driverId] ?? g.driverId,
      libelle: g.libelle,
      echeance: g.echeance as string,
    }));

  const lectures: LigneDepuis[] = body
    ? lecturesDuBloc(body).map((l) => ({ type: "lecture" as const, ...l }))
    : [];

  return [...revisions, ...guets, ...lectures];
}
