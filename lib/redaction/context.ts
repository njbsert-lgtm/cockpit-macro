import type {
  Echeance,
  Guet,
  Note,
  NoteKind,
  ScenarioVersion,
  Trend,
  VeilleItem,
} from "@/lib/types";
import { echeancesEntre } from "@/config/calendrier-drivers";
import { guetsARemonter, partitionnerRemontes, budgetDisponible } from "@/lib/guets";
import { isoWeekOf, isoWeekBounds } from "@/lib/iso-week";

/**
 * Le paquet de contexte — **seul horizon du modèle**.
 *
 * Le modèle n'a aucun accès au web au moment de rédiger. Ce qui ne figure pas ici ne peut pas
 * entrer dans la note : c'est ce qui rend le contrôle des chiffres possible, puisque chaque
 * nombre du texte doit se retrouver dans ce paquet.
 *
 * Entièrement construit par du code. Aucun champ n'est demandé au modèle.
 */

export type ObservationContexte = {
  instrumentId: string;
  label: string;
  unit: string;
  valeurs: Array<{ date: string; value: number }>;
  variationSemaine: number | null;
  variationYTD: number | null;
  fraicheur: "ok" | "retard" | "absent";
};

export type ContextePaquet = {
  noteType: NoteKind;
  /** Calculés par le code, jamais par le modèle — voir `champsStructurels` plus bas. */
  slug: string;
  isoWeek: string;
  date: string;
  comparesTo: string | null;
  /** `RecapDesSpeciales` est exigé si la semaine porte des spéciales. */
  specialesDeLaSemaine: Note[];
  notePrecedente: {
    slug: string;
    regimeStatement: string;
    blocs: Record<string, string>;
    driverOrder: string[];
  } | null;
  observations: ObservationContexte[];
  itemsVeille: VeilleItem[];
  scenariosCourants: ScenarioVersion[];
  tendancesCourantes: Trend[];
  /** Posés par la note précédente, non résolus — ils reviennent dans le bloc 5. */
  guetsOuverts: Guet[];
  /** Échéance passée sans résolution. Remontent aussi, avec leur note d'origine. */
  guetsExpires: Guet[];
  /** Combien de guets neufs le modèle peut proposer : trois moins ce qui remonte. */
  budgetGuets: number;
  /** Le calendrier de la semaine à venir — on ne pose pas un guet sur un événement oublié. */
  echeancesSemaine: Echeance[];
  trigger: string | null;
};

/**
 * Le paquet est-il assez fourni pour qu'une note ait de la matière ?
 *
 * « Règle de suffisance » du cahier : si la collecte est en échec et qu'aucun item de veille
 * n'est remonté, le modèle produit une note courte qui le dit, plutôt que de combler par des
 * généralités de marché. Le drapeau est passé au prompt, pas déduit par le modèle.
 */
export function estDegrade(paquet: ContextePaquet): boolean {
  const aucuneObservationFraiche = paquet.observations.every((o) => o.fraicheur !== "ok");
  return paquet.itemsVeille.length === 0 && aucuneObservationFraiche;
}

/**
 * Les champs que le code calcule et que le schéma de sortie ne porte donc jamais.
 *
 * Le piège que cette fonction existe pour désamorcer : `validateNoteChain` trie par date
 * **puis par slug**. Une note datée avant la dernière du corpus se placerait avant elle et
 * invaliderait rétroactivement son `comparesTo`. D'où l'assertion d'antériorité.
 */
export function champsStructurels(
  notes: Note[],
  dateCible: string,
  kind: NoteKind,
): { slug: string; isoWeek: string; comparesTo: string | null; specialesDeLaSemaine: Note[] } {
  const isoWeek = isoWeekOf(dateCible);

  const plusRecente = [...notes].sort(
    (a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug),
  ).at(-1);

  if (plusRecente && dateCible <= plusRecente.date) {
    throw new Error(
      `date cible ${dateCible} antérieure ou égale à la dernière note du corpus ` +
        `(${plusRecente.slug} du ${plusRecente.date}) : la nouvelle note se placerait avant elle ` +
        "dans le fil et invaliderait son « comparesTo »",
    );
  }

  // « Le bloc "ce qui a changé" d'une hebdo se compare à la hebdo précédente, jamais à la
  // dernière spéciale » — sinon le fil hebdomadaire se rompt.
  const precedente =
    kind === "hebdo"
      ? [...notes].filter((n) => n.kind === "hebdo").sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      : [...notes].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug)).at(-1);

  const specialesDeLaSemaine = notes.filter(
    (n) => n.kind === "speciale" && n.parentWeek === isoWeek,
  );

  const slug =
    kind === "hebdo"
      ? isoWeek
      : `${isoWeek}-E${specialesDeLaSemaine.length + 1}`;

  return { slug, isoWeek, comparesTo: precedente?.slug ?? null, specialesDeLaSemaine };
}

/**
 * Ce que la note précédente apporte au modèle : le texte intégral de ses blocs, pour qu'il
 * puisse écrire « ce qui a changé » **depuis une lecture précise**, pas depuis un résumé.
 */
export function contextePrecedent(
  note: Note | null,
  blocs: Record<string, string>,
): ContextePaquet["notePrecedente"] {
  if (!note) return null;
  return {
    slug: note.slug,
    regimeStatement: note.regimeStatement,
    blocs,
    driverOrder: note.driverOrder,
  };
}

/**
 * Assemble le paquet. Toutes les entrées sont fournies par l'appelant — chargement disque et
 * base restent à l'extérieur, pour que cette fonction soit pure et testable sans réseau.
 */
export function construireContexte(input: {
  kind: NoteKind;
  dateCible: string;
  notes: Note[];
  notePrecedente: Note | null;
  blocsPrecedents: Record<string, string>;
  observations: ObservationContexte[];
  itemsVeille: VeilleItem[];
  scenariosCourants: ScenarioVersion[];
  tendancesCourantes: Trend[];
  trigger?: string | null;
}): ContextePaquet {
  const { slug, isoWeek, comparesTo, specialesDeLaSemaine } = champsStructurels(
    input.notes,
    input.dateCible,
    input.kind,
  );

  // Les guets de la note précédente, expirés au passage. C'est la seule mutation d'état que
  // le pipeline fait sans validation humaine, et elle est purement mécanique : une échéance
  // est passée ou elle ne l'est pas.
  const remontes = guetsARemonter(input.notePrecedente?.guets ?? [], input.dateCible);
  const { ouverts, expires } = partitionnerRemontes(remontes);

  const { fin } = isoWeekBounds(isoWeek);
  const semaineSuivante = ajouterJours(fin, 7);

  return {
    noteType: input.kind,
    slug,
    isoWeek,
    date: input.dateCible,
    comparesTo,
    specialesDeLaSemaine,
    notePrecedente: contextePrecedent(input.notePrecedente, input.blocsPrecedents),
    observations: input.observations,
    itemsVeille: input.itemsVeille,
    scenariosCourants: input.scenariosCourants,
    tendancesCourantes: input.tendancesCourantes,
    guetsOuverts: ouverts,
    guetsExpires: expires,
    budgetGuets: budgetDisponible(remontes),
    echeancesSemaine: echeancesEntre(input.dateCible, semaineSuivante),
    trigger: input.trigger ?? null,
  };
}

function ajouterJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}
