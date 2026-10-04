import type { ThemeObserve, ThemeStatut } from "@/lib/types";
import { THEMES } from "@/config/themes";

/**
 * Les thèmes sous observation — logique pure (CLAUDE.md, « Le thème sous observation »).
 *
 * Un thème s'observe **même sans témoin collecté** : l'absence de l'instrument en base ne bloque pas
 * la création, elle change seulement le statut. La liste des thèmes sans témoin devient la feuille
 * de route de collecte — elle dit quelles données manquent, et pourquoi on les veut.
 */

/** « Collecté » au sens de la configuration : un fournisseur actif pour cet instrument. */
export type EstCollecte = (instrumentId: string) => boolean;

const TERMINAUX: readonly ThemeStatut[] = ["confirme", "infirme", "expire"];

export function estTermine(statut: ThemeStatut): boolean {
  return TERMINAUX.includes(statut);
}

function ajouterJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

function ecartJours(depuis: string, jusqua: string): number {
  return Math.floor(
    (new Date(`${jusqua}T00:00:00Z`).getTime() - new Date(`${depuis}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

export type EtatTheme = {
  /** Le statut **effectif** : calculé pour `observe` et `observe-sans-temoin`, posé sinon. */
  statut: ThemeStatut;
  /** Ce qui débloquerait le thème : témoins non collectés, puis instruments hors catalogue. */
  temoinsManquants: string[];
  /** Combien de jours le thème attend ses données, depuis sa création. `null` hors attente. */
  attenteJours: number | null;
  /**
   * La date de verdict. `null` tant que l'échéance est **suspendue** (un témoin manque) ou que le
   * début de l'observation n'est pas daté.
   */
  echeance: string | null;
  /** Tous les témoins sont collectés mais le début n'est pas daté : l'échéance ne court pas encore. */
  aDater: boolean;
  /** L'échéance est atteinte et personne n'a tranché. */
  verdictATrancher: boolean;
};

/** L'état d'un thème à une date, depuis ce que la configuration collecte. */
export function etatTheme(theme: ThemeObserve, estCollecte: EstCollecte, aujourdhui: string): EtatTheme {
  const manquants = [
    ...theme.instrumentsTemoins.filter((id) => !estCollecte(id)),
    ...theme.temoinsHorsCatalogue,
  ];

  if (estTermine(theme.statut)) {
    return {
      statut: theme.statut,
      temoinsManquants: manquants,
      attenteJours: null,
      echeance: null,
      aDater: false,
      verdictATrancher: false,
    };
  }

  if (manquants.length > 0) {
    // Échéance suspendue : elle ne court qu'à partir du jour où le dernier témoin est collecté.
    // Sinon le thème expirerait sans avoir jamais pu être testé.
    return {
      statut: "observe-sans-temoin",
      temoinsManquants: manquants,
      attenteJours: Math.max(0, ecartJours(theme.dateOrigine, aujourdhui)),
      echeance: null,
      aDater: false,
      verdictATrancher: false,
    };
  }

  const echeance = theme.debutObservation ? ajouterJours(theme.debutObservation, theme.delaiJours) : null;
  return {
    statut: "observe",
    temoinsManquants: [],
    attenteJours: null,
    echeance,
    aDater: theme.debutObservation === null,
    verdictATrancher: echeance !== null && echeance <= aujourdhui,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Un seuil se vérifie : il porte un chiffre. « Les tensions s'aggravent » n'en porte pas. */
export function estChiffre(seuil: string): boolean {
  return /\d/.test(seuil);
}

export type ErreurTheme = { id: string; message: string };

/**
 * Les règles dures d'un thème. `catalogue` : les identifiants d'instruments déclarés. Un témoin
 * absent du catalogue se déclare dans `temoinsHorsCatalogue`, jamais dans `instrumentsTemoins`.
 */
export function validerTheme(theme: ThemeObserve, catalogue: ReadonlySet<string>): ErreurTheme[] {
  const erreurs: ErreurTheme[] = [];
  const err = (message: string) => erreurs.push({ id: theme.id || "(sans id)", message });

  for (const [champ, valeur] of [
    ["id", theme.id],
    ["libelle", theme.libelle],
    ["emetteur", theme.emetteur],
    ["these", theme.these],
  ] as const) {
    if (!valeur || valeur.trim() === "") err(`« ${champ} » est obligatoire`);
  }

  if (theme.instrumentsTemoins.length + theme.temoinsHorsCatalogue.length === 0) {
    err("un thème sans aucun témoin n'est pas observable — c'est de l'opinion");
  }
  for (const id of theme.instrumentsTemoins) {
    if (!catalogue.has(id)) {
      err(`le témoin « ${id} » n'est pas dans le catalogue des instruments — le déclarer dans temoinsHorsCatalogue`);
    }
  }

  // « Sans chiffre, le thème est refusé à la création. »
  if (!estChiffre(theme.confirmeSi)) err("« confirmeSi » doit porter un seuil chiffré, pas une impression");
  if (!estChiffre(theme.infirmeSi)) err("« infirmeSi » doit porter un seuil chiffré, pas une impression");

  if (
    !Number.isInteger(theme.delaiJours) ||
    theme.delaiJours < THEMES.delaiJoursMin ||
    theme.delaiJours > THEMES.delaiJoursMax
  ) {
    err(`« delaiJours » doit être un entier entre ${THEMES.delaiJoursMin} et ${THEMES.delaiJoursMax}`);
  }

  if (theme.statut === "confirme" || theme.statut === "infirme") {
    if (!theme.verdictLe) err(`un thème « ${theme.statut} » doit dater son verdict (verdictLe)`);
  }
  if (!estTermine(theme.statut) && (theme.verdictLe || theme.verdictPar)) {
    err("un thème encore sous observation ne peut pas porter de verdict");
  }
  return erreurs;
}

/**
 * Le plafond : cinq thèmes `observe` au maximum. Les thèmes sans témoin et les thèmes tranchés
 * n'y comptent pas. Renvoie une erreur seulement au-delà.
 */
export function validerPlafond(
  themes: readonly ThemeObserve[],
  estCollecte: EstCollecte,
  aujourdhui: string,
): ErreurTheme[] {
  const observes = themes.filter((t) => etatTheme(t, estCollecte, aujourdhui).statut === "observe");
  if (observes.length <= THEMES.plafondObserves) return [];
  return [
    {
      id: "(plafond)",
      message: `${observes.length} thèmes sous observation pour un plafond de ${THEMES.plafondObserves} — au-delà, on surveille tout, donc rien`,
    },
  ];
}

/** Les emplacements restants sous le plafond, pour borner ce que le modèle peut proposer. */
export function placesRestantes(
  themes: readonly ThemeObserve[],
  estCollecte: EstCollecte,
  aujourdhui: string,
): number {
  const observes = themes.filter((t) => etatTheme(t, estCollecte, aujourdhui).statut === "observe").length;
  return Math.max(0, THEMES.plafondObserves - observes);
}

export type GroupesThemes = {
  /** La feuille de route de collecte : les thèmes qui attendent une donnée. */
  enAttente: ThemeObserve[];
  observes: ThemeObserve[];
  tranches: ThemeObserve[];
};

export function grouperThemes(
  themes: readonly ThemeObserve[],
  estCollecte: EstCollecte,
  aujourdhui: string,
): GroupesThemes {
  const groupes: GroupesThemes = { enAttente: [], observes: [], tranches: [] };
  for (const t of themes) {
    const { statut } = etatTheme(t, estCollecte, aujourdhui);
    if (statut === "observe-sans-temoin") groupes.enAttente.push(t);
    else if (statut === "observe") groupes.observes.push(t);
    else groupes.tranches.push(t);
  }
  // Ceux qui attendent depuis le plus longtemps d'abord : c'est l'argument de priorisation.
  groupes.enAttente.sort((a, b) => a.dateOrigine.localeCompare(b.dateOrigine));
  return groupes;
}

// ---------------------------------------------------------------------------
// De la proposition du modèle au thème
// ---------------------------------------------------------------------------

/** Identifiant stable d'un thème proposé : le libellé, sans accents ni ponctuation. */
export function idTheme(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ThemeProposeEntree = Pick<
  ThemeObserve,
  | "libelle"
  | "origine"
  | "emetteur"
  | "these"
  | "instrumentsTemoins"
  | "temoinsHorsCatalogue"
  | "confirmeSi"
  | "infirmeSi"
  | "delaiJours"
>;

/**
 * Un thème accepté devient un thème sous observation. Le statut est posé à `observe` : c'est le
 * statut de départ, que `etatTheme` requalifie à la lecture. `debutObservation` reste `null` — il
 * se date à la main, le jour où le dernier témoin est collecté (CLAUDE.md).
 */
export function themeDepuisProposition(
  p: ThemeProposeEntree,
  noteSlug: string,
  date: string,
): ThemeObserve {
  return {
    id: idTheme(p.libelle),
    libelle: p.libelle,
    origine: p.origine,
    emetteur: p.emetteur,
    these: p.these,
    dateOrigine: date,
    instrumentsTemoins: p.instrumentsTemoins,
    temoinsHorsCatalogue: p.temoinsHorsCatalogue,
    confirmeSi: p.confirmeSi,
    infirmeSi: p.infirmeSi,
    delaiJours: p.delaiJours,
    debutObservation: null,
    statut: "observe",
    mentions: [{ date, source: noteSlug, emetteur: p.emetteur }],
    verdictLe: null,
    verdictPar: null,
  };
}
