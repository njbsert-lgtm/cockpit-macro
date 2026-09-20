import matter from "gray-matter";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import type { Guet } from "@/lib/types";
import { BLOCK_NAMES, type BlockName } from "@/lib/note-blocks";

/**
 * Sortie structurée → fichier MDX.
 *
 * **L'ordre canonique est imposé par le code**, jamais par le modèle : `parseNote` le vérifie
 * de toute façon, autant ne pas lui donner l'occasion de se tromper. Le bloc « ce que j'avais
 * mal lu » est émis vide — il ne sera rempli que dans le portail, par un humain.
 */

const ORDRE_CANONIQUE: BlockName[] = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
  "CeQueJeSurveille",
  "RecapDesSpeciales",
  "LeFilDeLaSemaine",
];

/** Les blocs que le modèle doit rédiger — le bloc 4 n'en fait jamais partie. */
export function blocsARediger(paquet: ContextePaquet): BlockName[] {
  if (paquet.noteType === "speciale") {
    return ["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"];
  }
  const blocs: BlockName[] = [
    "CeQuiAChange",
    "CeQuiSestConfirme",
    "RevisionDesScenarios",
    "CeQueJeSurveille",
  ];
  if (paquet.specialesDeLaSemaine.length > 0) blocs.push("RecapDesSpeciales");
  return blocs;
}

/**
 * Un identifiant de guet stable et lisible : la note qui l'a posé, plus un rang. Il sert de
 * clé de remontée d'une note à l'autre, donc il ne doit dépendre ni de l'ordre d'affichage
 * ni du texte, qui peut être corrigé dans le portail.
 */
function idGuet(slug: string, rang: number): string {
  return `${slug.toLowerCase()}-g${rang + 1}`;
}

/**
 * Les guets de la note : ceux qui **remontent** de la précédente d'abord, puis ceux que le
 * modèle propose.
 *
 * Les remontés gardent leur identifiant, leur statut et leur note d'origine — c'est ce qui
 * permet d'écrire « posé en 2026-S35 » trois semaines plus tard, et de voir qu'une question
 * traîne. Les oublier ici les ferait disparaître en silence au premier report, ce qui viderait
 * le mécanisme de sa raison d'être.
 */
export function guetsDuBrouillon(
  brouillon: Brouillon,
  slug: string,
  remontes: Guet[] = [],
): Guet[] {
  const neufs = brouillon.guets.map((g, i) => ({
    id: idGuet(slug, i),
    noteSlug: slug,
    driverId: g.driverId,
    axeLibelle: g.axeLibelle,
    libelle: g.libelle,
    attendu: g.attendu,
    confirmeSi: g.confirmeSi,
    infirmeSi: g.infirmeSi,
    echeance: g.echeance,
    sourceAttendue: g.sourceAttendue,
    statut: "ouvert" as const,
    resoluPar: null,
    resoluLe: null,
  }));

  return [...remontes, ...neufs];
}

/**
 * `Note.sources` se construit à partir des identifiants **choisis dans le vivier**, jamais
 * depuis le texte généré : le modèle n'écrit pas d'URL, il désigne, et on résout ici.
 *
 * Deux provenances, une seule forme en sortie. Un item de veille porte sa propre URL. Un
 * émetteur cité par la fiche — « Zonebourse », « Goldman Sachs » — n'en a pas : la fiche est
 * ce que nous avons lu, c'est donc elle que la note pointe. Inventer l'URL du site de
 * l'émetteur serait une référence que personne n'a ouverte.
 */
function sourcesParBloc(
  brouillon: Brouillon,
  paquet: ContextePaquet,
): Record<string, Array<{ label: string; url: string }>> {
  const parId = new Map(paquet.itemsVeille.map((i) => [i.id, i]));
  const fiche = paquet.ficheNotion;
  const emetteurs = new Set(fiche?.sources ?? []);
  const sources: Record<string, Array<{ label: string; url: string }>> = {};

  for (const { block, sourceId } of brouillon.sources) {
    const item = parId.get(sourceId);
    if (item) {
      (sources[block] ??= []).push({ label: item.source, url: item.url });
      continue;
    }
    if (fiche && emetteurs.has(sourceId)) {
      (sources[block] ??= []).push({
        label: `${sourceId} — via la fiche ${fiche.semaine}`,
        url: fiche.url,
      });
    }
    // Un identifiant hors vivier ne peut pas arriver : la réception l'aurait refusé.
  }
  return sources;
}

export type BrouillonRendu = {
  slug: string;
  mdx: string;
  guets: Guet[];
};

/**
 * Rend le fichier complet. `gray-matter` sérialise le frontmatter — l'échappement YAML des
 * apostrophes et des deux-points n'a pas à être réinventé ici.
 */
export function rendreMdx(
  brouillon: Brouillon,
  paquet: ContextePaquet,
  aujourdhui: string,
): BrouillonRendu {
  const aRediger = new Set(blocsARediger(paquet));
  const remontes = [...paquet.guetsOuverts, ...paquet.guetsExpires];
  const guets = guetsDuBrouillon(brouillon, paquet.slug, remontes);

  const corps = ORDRE_CANONIQUE.filter(
    (b) => aRediger.has(b) || b === "CeQueJavaisMalLu" || b === "LeFilDeLaSemaine",
  )
    .filter((b) => {
      // `LeFilDeLaSemaine` est auto-porteur et réservé aux hebdos : présent seulement si des
      // items sont cités, sinon il rendrait une section vide.
      if (b === "LeFilDeLaSemaine") {
        return paquet.noteType === "hebdo" && brouillon.veilleItemRefs.length > 0;
      }
      // Le bloc 4 n'existe que pour les hebdos, et reste vide jusqu'au portail.
      if (b === "CeQueJavaisMalLu") return paquet.noteType === "hebdo";
      return true;
    })
    .map((b) => {
      if (b === "LeFilDeLaSemaine") return "<LeFilDeLaSemaine />";
      const texte = b === "CeQueJavaisMalLu" ? "" : (brouillon.blocs[b] ?? "").trim();
      return `<${b}>\n\n${texte}\n\n</${b}>`;
    })
    .join("\n\n");

  const frontmatter = {
    kind: paquet.noteType,
    status: "brouillon",
    publishedAt: null,
    date: paquet.date,
    comparesTo: paquet.comparesTo,
    ...(paquet.trigger ? { trigger: paquet.trigger } : {}),
    regimeStatement: brouillon.regimeStatement,
    keyIndicators: brouillon.keyIndicators,
    zones: zonesDeLaNote(brouillon, paquet),
    driverOrder: brouillon.driverOrder,
    trendRefs: brouillon.trendRefs,
    instrumentRefs: brouillon.instrumentRefs,
    veilleItemRefs: brouillon.veilleItemRefs,
    channels: brouillon.channels,
    sources: sourcesParBloc(brouillon, paquet),
    // Un guet neuf n'écrit pas sa note : `parseNote` la pose depuis le nom de fichier. Un guet
    // remonté la déclare, sans quoi son ancienneté serait perdue au report.
    guets: guets.map(({ noteSlug, ...reste }) =>
      noteSlug === paquet.slug ? reste : { ...reste, noteSlug },
    ),
    // Trace de fabrication, pour le portail et pour la relecture six mois plus tard.
    redigeLe: aujourdhui,
  };

  return { slug: paquet.slug, mdx: matter.stringify(`\n${corps}\n`, frontmatter), guets };
}

/**
 * Les zones de la note se déduisent des instruments cités et des scénarios révisés, plutôt
 * que d'être demandées au modèle : c'est une conséquence mécanique de ce qu'il a écrit, pas
 * un jugement, et le schéma n'a donc pas à porter le champ.
 */
function zonesDeLaNote(brouillon: Brouillon, paquet: ContextePaquet): string[] {
  void brouillon;
  const zones = new Set<string>();
  for (const t of paquet.tendancesCourantes) {
    if (brouillon.trendRefs.includes(t.id)) t.zones.forEach((z) => zones.add(z));
  }
  return zones.size > 0 ? [...zones].sort() : ["global"];
}

/** Les noms de bloc connus, pour que le portail sache ce qu'il peut éditer. */
export const BLOCS_CONNUS = BLOCK_NAMES;
