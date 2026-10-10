import matter from "gray-matter";
import { parseNote, type ParsedNote } from "@/lib/notes";
import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import type {
  Authorship,
  Guet,
  RegimeProposition,
  RegimeRetenu,
  ScenarioVersion,
  ThemeObserve,
  TrendDelta,
} from "@/lib/types";
import { idTheme, themeDepuisProposition } from "@/lib/themes";
import { REGIME_A_CHOISIR, RETENUS_REGIME, propositionDe } from "@/lib/regime";
import type { ContextePaquet } from "./context";
import type { Brouillon } from "./schema";
import { extraireVerdicts, type RapportChiffres } from "./figures";
import { construireDeltasScenarios, construireDeltasTendances } from "./deltas";

/**
 * Le portail : les cinq conditions de publication, la reconstruction du MDX final, et le
 * re-contrôle des chiffres après édition humaine.
 *
 * Le principe qui gouverne ce fichier, repris du cahier : **la validation doit coûter quelque
 * chose.** Rien ici n'accepte ou ne refuse en bloc — chaque fonction porte une décision
 * unitaire (un bloc, un guet, une proposition), et `conditionsManquantes` exige qu'elles aient
 * toutes été prises avant d'autoriser la publication.
 */

export type DecisionBloc = { authorship: Authorship; texte: string };

export type DecisionGuet = {
  action: "accepter" | "corriger" | "refuser";
  correction?: Partial<
    Pick<Guet, "libelle" | "attendu" | "confirmeSi" | "infirmeSi" | "echeance" | "sourceAttendue">
  >;
};

export type DecisionProposition = { action: "accepter" | "refuser" };

/**
 * La phrase de régime retenue : l'un des trois angles proposés, ou `propre` — écrite à la main.
 * Pour un angle, `texte` n'est qu'un reflet : c'est la proposition elle-même qui fait foi, relue
 * côté serveur (`resoudreRegime`), jamais ce qu'un formulaire aurait renvoyé.
 */
export type DecisionRegime = { choix: RegimeRetenu; texte: string };

/**
 * L'état complet des décisions prises dans le portail pour un brouillon. Les clés : nom de
 * bloc, id de guet, `driverId` d'une révision de scénario, `trendId` d'un changement de statut.
 */
export type Decisions = {
  blocs: Partial<Record<BlockName, DecisionBloc>>;
  guets: Record<string, DecisionGuet>;
  revisions: Record<string, DecisionProposition>;
  tendances: Record<string, DecisionProposition>;
  /** Clé : l'identifiant du thème (`idTheme`). */
  themes: Record<string, DecisionProposition>;
  /** Absente tant qu'aucune phrase n'est retenue — aucune des trois n'est choisie par défaut. */
  regime?: DecisionRegime;
};

export function decisionsVides(): Decisions {
  return { blocs: {}, guets: {}, revisions: {}, tendances: {}, themes: {} };
}

/**
 * Les blocs dont l'authorship est saisie directement dans le portail. `CeQueJeSurveille` en est
 * exclu : le cahier dit explicitement que son authorship **se déduit** des décisions guet par
 * guet, elle ne se saisit jamais pour le bloc entier. `LeFilDeLaSemaine` est auto-porteur — une
 * résolution mécanique d'items déjà cités, pas une prose à faire relire.
 */
export function blocsAAuthorshipDirecte(blocsPresents: BlockName[]): BlockName[] {
  return blocsPresents.filter((b) => b !== "CeQueJeSurveille" && b !== "LeFilDeLaSemaine");
}

/**
 * L'authorship du bloc 5 : tous les guets relus tels quels → `ia-relue` ; au moins un corrigé
 * → `ia-corrigee` ; au moins un jamais ouvert (aucune décision) → `ia`, donc publication
 * bloquée. Un guet refusé compte comme relu — il a été examiné et écarté, ce n'est pas un
 * guet oublié.
 */
export function authorshipBloc5(guets: Guet[], decisionsGuets: Decisions["guets"]): Authorship {
  if (guets.length === 0) return "ia-relue";
  const actions = guets.map((g) => decisionsGuets[g.id]?.action);
  if (actions.some((a) => a === undefined)) return "ia";
  if (actions.some((a) => a === "corriger")) return "ia-corrigee";
  return "ia-relue";
}

/**
 * Applique une décision à un guet, pour la note finale.
 *
 * Un guet **neuf** refusé n'a jamais existé : il disparaît purement et simplement. Un guet
 * **remonté** refusé garde sa trace mais se clôt en `sans-objet` — la question ne se pose plus,
 * mais on ne perd pas l'historique de ce qu'elle a été. La distinction se fait sur `noteSlug` :
 * un guet neuf porte celui de la note en cours de publication, un remonté porte celui d'une
 * note antérieure.
 */
export function appliquerDecisionGuet(
  guet: Guet,
  decision: DecisionGuet | undefined,
  slugNoteActuelle: string,
): Guet | null {
  if (!decision || decision.action === "refuser") {
    return guet.noteSlug === slugNoteActuelle ? null : { ...guet, statut: "sans-objet" };
  }
  if (decision.action === "corriger" && decision.correction) {
    return { ...guet, ...decision.correction };
  }
  return guet;
}

/**
 * La phrase de régime effectivement retenue, ou `null` si la décision est absente ou invalide. Pour
 * un angle, le texte vient de la proposition du brouillon, jamais de la décision : une décision
 * sauvegardée ne peut pas faire publier une phrase que le modèle n'a pas proposée.
 */
export function resoudreRegime(
  decision: DecisionRegime | undefined,
  propositions: readonly RegimeProposition[] | null | undefined,
): { choix: RegimeRetenu; texte: string } | null {
  if (!decision || !(RETENUS_REGIME as readonly string[]).includes(decision.choix)) return null;
  if (decision.choix === "propre") {
    const texte = decision.texte?.trim();
    return texte ? { choix: "propre", texte } : null;
  }
  const proposition = propositionDe(propositions, decision.choix);
  return proposition ? { choix: decision.choix, texte: proposition.texte } : null;
}

/** Le brouillon attend-il qu'on retienne une phrase de régime ? */
export function attendUnRegime(note: ParsedNote): boolean {
  return (
    note.meta.regimeStatement === REGIME_A_CHOISIR ||
    (note.meta.regimeStatementPropositions ?? null) !== null
  );
}

export type ConditionManquante = { code: string; message: string };

/**
 * Les cinq conditions du cahier, à l'exception du contrôle des chiffres — porté séparément par
 * `controlerChiffresPublication`, parce qu'il ne se résume pas à « tranché ou non » et dépend
 * de l'authorship de chaque bloc.
 */
export function conditionsManquantes(
  note: ParsedNote,
  brouillonPropose: Brouillon,
  decisions: Decisions,
): ConditionManquante[] {
  const manquantes: ConditionManquante[] = [];
  const blocsPresents = note.blocks;

  // Condition : une phrase de régime a été retenue, ou écrite. Aucune des trois propositions
  // n'est choisie par défaut — c'est le geste que le portail doit obtenir.
  if (
    attendUnRegime(note) &&
    resoudreRegime(decisions.regime, note.meta.regimeStatementPropositions) === null
  ) {
    manquantes.push({
      code: "regime",
      message:
        "Aucune phrase de régime n'a été retenue : choisir l'une des trois propositions, ou en écrire une.",
    });
  }

  // Condition : le bloc 4 est renseigné.
  if (blocsPresents.includes("CeQueJavaisMalLu")) {
    const texte = decisions.blocs.CeQueJavaisMalLu?.texte?.trim();
    if (!texte) {
      manquantes.push({
        code: "bloc4",
        message: `Le bloc « ${BLOCK_TITLES.CeQueJavaisMalLu} » doit être renseigné, même pour dire qu'il n'y a rien à signaler.`,
      });
    }
  }

  // Condition : aucun bloc resté au statut `ia`. Le bloc 4 est couvert ci-dessus (il n'est
  // jamais « ia », il est vide ou renseigné) ; le bloc 5 se couvre par les guets plus bas.
  for (const bloc of blocsAAuthorshipDirecte(blocsPresents)) {
    if (bloc === "CeQueJavaisMalLu") continue;
    const authorship = decisions.blocs[bloc]?.authorship;
    if (!authorship || authorship === "ia") {
      manquantes.push({
        code: `bloc:${bloc}`,
        message: `Le bloc « ${BLOCK_TITLES[bloc]} » n'a pas été relu.`,
      });
    }
  }

  // Condition : tout guet proposé ou remonté a été tranché.
  for (const guet of note.meta.guets) {
    if (!decisions.guets[guet.id]) {
      manquantes.push({
        code: `guet:${guet.id}`,
        message: `Le guet « ${guet.libelle} » n'a pas été tranché.`,
      });
    }
  }

  // Condition : toute proposition de révision a été acceptée ou refusée explicitement.
  for (const revision of brouillonPropose.scenarioRevisions) {
    if (!decisions.revisions[revision.driverId]) {
      manquantes.push({
        code: `revision:${revision.driverId}`,
        message: `La révision du driver « ${revision.driverId} » n'a pas été tranchée.`,
      });
    }
  }
  for (const update of brouillonPropose.trendUpdates) {
    if (!decisions.tendances[update.trendId]) {
      manquantes.push({
        code: `tendance:${update.trendId}`,
        message: `Le changement de statut de « ${update.trendId} » n'a pas été tranché.`,
      });
    }
  }
  for (const theme of brouillonPropose.themesProposes ?? []) {
    const id = idTheme(theme.libelle);
    if (!decisions.themes[id]) {
      manquantes.push({
        code: `theme:${id}`,
        message: `Le thème « ${theme.libelle} » n'a pas été tranché.`,
      });
    }
  }

  return manquantes;
}

/**
 * Le contrôle des chiffres, réévalué sur le texte **final** — après édition humaine — plutôt
 * que sur la proposition initiale du modèle.
 *
 * Il bloque sur un bloc dont l'authorship finale est `ia` ou `ia-relue` : un chiffre légèrement
 * de travers dans une phrase bien tournée est invisible à la relecture, exactement ce qu'un
 * modèle produit en reformulant, et personne ne l'a corrigé. Il **signale sans bloquer** sur
 * `ia-corrigee` ou `humaine` : un humain qui tape un chiffre l'a par définition relu. Sans ce
 * relâchement, le bloc 4 — qui cite typiquement une valeur de la note précédente absente du
 * vivier du jour — serait structurellement impossible à faire passer.
 */
export type CleControlee = BlockName | "regimeStatement";

export function controlerChiffresPublication(
  textesFinauxParBloc: Partial<Record<CleControlee, string>>,
  authorshipFinaleParBloc: Partial<Record<CleControlee, Authorship>>,
  paquet: ContextePaquet,
): RapportChiffres {
  const entrees = Object.entries(textesFinauxParBloc) as Array<[CleControlee, string]>;
  const verdicts = extraireVerdicts(entrees, paquet);

  const bloquants = verdicts.filter((v) => {
    // Les trois verdicts fautifs comptent pareil ici : écart avec la base, absence de la
    // fiche, absence d'attribution. Ce qui varie est le geste de correction, pas le blocage.
    if (v.verdict === "conforme") return false;
    const authorship = authorshipFinaleParBloc[v.bloc as CleControlee];
    return authorship === "ia" || authorship === "ia-relue" || authorship === undefined;
  });

  return { verdicts, bloque: bloquants.length > 0, bloquants };
}

export type NoteFinale = { slug: string; mdx: string };

/**
 * Reconstruit le MDX final à partir du brouillon parsé et des décisions prises. La note reste
 * la même — même slug, même comparesTo, même driverOrder — sauf ce que les décisions changent
 * explicitement : le texte et l'authorship des blocs, la liste des guets, `status` et
 * `publishedAt`.
 */
export function assemblerNoteFinale(
  brouillonParse: ParsedNote,
  decisions: Decisions,
  aujourdhui: string,
): NoteFinale {
  const { meta, blocks } = brouillonParse;
  const slugActuel = meta.slug;

  const authorshipFinale: Partial<Record<BlockName, Authorship>> = {};
  const textesFinaux: Partial<Record<BlockName, string>> = {};

  for (const bloc of blocsAAuthorshipDirecte(blocks)) {
    const decision = decisions.blocs[bloc];
    textesFinaux[bloc] = decision?.texte ?? "";
    authorshipFinale[bloc] = decision?.authorship ?? "ia";
  }
  if (blocks.includes("CeQueJeSurveille")) {
    authorshipFinale.CeQueJeSurveille = authorshipBloc5(meta.guets, decisions.guets);
  }

  // La phrase de régime : celle qui a été retenue, jamais une des trois par défaut. Sans décision,
  // on garde ce que porte le brouillon — la phrase « à choisir » —, que `parseNote` refusera dans
  // une note publiée : c'est le dernier garde-fou si `conditionsManquantes` avait été contournée.
  const regime = resoudreRegime(decisions.regime, meta.regimeStatementPropositions);

  const guetsFinaux = meta.guets
    .map((g) => appliquerDecisionGuet(g, decisions.guets[g.id], slugActuel))
    .filter((g): g is Guet => g !== null);

  const corps = blocks
    .map((bloc) => {
      if (bloc === "LeFilDeLaSemaine") return "<LeFilDeLaSemaine />";
      const texte = (textesFinaux[bloc] ?? "").trim();
      return `<${bloc}>\n\n${texte}\n\n</${bloc}>`;
    })
    .join("\n\n");

  const frontmatter = {
    kind: meta.kind,
    status: "publiee",
    publishedAt: aujourdhui,
    date: meta.date,
    comparesTo: meta.comparesTo,
    ...(meta.trigger ? { trigger: meta.trigger } : {}),
    regimeStatement: regime?.texte ?? meta.regimeStatement,
    // Les trois propositions sont conservées avec celle qui a été retenue : relire six mois plus
    // tard l'angle qu'on a écarté est instructif.
    ...(meta.regimeStatementPropositions
      ? {
          regimeStatementPropositions: meta.regimeStatementPropositions,
          regimeRetenu: regime?.choix ?? null,
        }
      : {}),
    keyIndicators: meta.keyIndicators,
    zones: meta.zones,
    driverOrder: meta.driverOrder,
    trendRefs: meta.trendRefs,
    instrumentRefs: meta.instrumentRefs,
    veilleItemRefs: meta.veilleItemRefs,
    channels: meta.channels,
    sources: meta.sources,
    guets: guetsFinaux.map(({ noteSlug, ...reste }) =>
      noteSlug === slugActuel ? reste : { ...reste, noteSlug },
    ),
    authorship: authorshipFinale,
  };

  return { slug: slugActuel, mdx: matter.stringify(`\n${corps}\n`, frontmatter) };
}

/**
 * Vérifie qu'une note candidate à la publication est structurellement valide — appelle
 * `parseNote` sur le MDX final, comme pour un brouillon. C'est la même autorité que
 * `lib/redaction/validate.ts`, appliquée cette fois à la sortie du portail plutôt qu'à celle
 * du modèle.
 */
export function relireNoteFinale(slug: string, mdx: string): ParsedNote {
  return parseNote(slug, mdx);
}

export type ArtefactsPublication = {
  note: NoteFinale;
  /** Deltas neufs seulement — au script appelant de les fusionner avec l'existant sur disque. */
  scenariosGeneres: ScenarioVersion[];
  tendancesGenerees: TrendDelta[];
  /** Les thèmes acceptés, neufs seulement — au script de les fusionner avec l'existant. */
  themesGeneres: ThemeObserve[];
};

/**
 * Assemble tout ce que la publication produit, sans aucune écriture disque : le MDX final, et
 * les deltas de scénario/tendance des propositions **effectivement acceptées**. Extrait de
 * `scripts/publier-note.mts` pour rester testable sans corpus réel ni système de fichiers —
 * même logique que le reste de `lib/redaction/`.
 */
export function construireArtefactsPublication(
  brouillonParse: ParsedNote,
  brouillonPropose: Brouillon,
  paquet: ContextePaquet,
  decisions: Decisions,
  aujourdhui: string,
): ArtefactsPublication {
  const note = assemblerNoteFinale(brouillonParse, decisions, aujourdhui);
  relireNoteFinale(note.slug, note.mdx); // lève si structurellement invalide

  const driversAcceptes = new Set(
    Object.entries(decisions.revisions)
      .filter(([, d]) => d.action === "accepter")
      .map(([driverId]) => driverId),
  );
  const tendancesAcceptees = new Set(
    Object.entries(decisions.tendances)
      .filter(([, d]) => d.action === "accepter")
      .map(([trendId]) => trendId),
  );

  const scenariosGeneres = construireDeltasScenarios(
    brouillonPropose.scenarioRevisions,
    driversAcceptes,
    paquet.scenariosCourants,
    note.slug,
    aujourdhui,
  );
  const tendancesGenerees = construireDeltasTendances(
    brouillonPropose.trendUpdates,
    tendancesAcceptees,
    note.slug,
    aujourdhui,
  );

  const themesGeneres = (brouillonPropose.themesProposes ?? [])
    .filter((t) => decisions.themes[idTheme(t.libelle)]?.action === "accepter")
    .map((t) => themeDepuisProposition(t, note.slug, aujourdhui));

  return { note, scenariosGeneres, tendancesGenerees, themesGeneres };
}
