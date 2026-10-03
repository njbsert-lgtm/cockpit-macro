import type { SupabaseClient } from "@supabase/supabase-js";
import type { AngleMort } from "@/lib/types";
import { ANGLES_MORTS } from "@/config/angles-morts";
import type { ClassifyOutcome } from "@/lib/veille/classify";

/**
 * Le compteur d'angles morts — logique pure, puis persistance.
 *
 * Il mesure **l'incomplétude de la grille, pas la vigilance** : un événement de matérialité haute
 * qui ne se rattache à aucun axe dit que le modèle du driver n'a pas de case pour lui. Un
 * événement imprévu mais qui tombe sur un axe n'est PAS un angle mort : le cadre a fonctionné.
 */

// ---------------------------------------------------------------------------
// Ce qui est un angle mort
// ---------------------------------------------------------------------------

/**
 * Seuls les items de matérialité haute comptent, et seulement s'ils sont des signaux et ne se
 * rattachent à aucun axe. Un axe écarté parce qu'étranger au driver de l'item vaut « aucun axe ».
 */
export function estAngleMort(o: ClassifyOutcome): boolean {
  return o.ok && o.isSignal === true && o.materialite === "haute" && !o.axeId;
}

/**
 * `driverId` : le premier driver de l'item. Quand l'item en porte plusieurs, le premier est celui
 * que le modèle a cité d'abord ; faute de mieux, on ne devine pas lequel est « le bon ».
 */
export function enAngleMort(o: ClassifyOutcome): Omit<AngleMort, "statut" | "resoluPar"> | null {
  if (!estAngleMort(o) || !o.title || !o.url || !o.publishedAt || o.source === undefined) return null;
  return {
    id: o.id,
    date: o.publishedAt.slice(0, 10),
    driverId: o.driverRefs && o.driverRefs.length > 0 ? o.driverRefs[0] : null,
    axeManquantPropose: o.axeManquantPropose ?? null,
    titre: o.title,
    source: o.source,
    url: o.url,
  };
}

// ---------------------------------------------------------------------------
// Les deux compteurs
// ---------------------------------------------------------------------------

/** « Risque souverain français » et « risque  souverain français » désignent le même sujet. */
export function normaliserSujet(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type GroupeAnglesMorts = {
  /** Le libellé tel qu'écrit la première fois. */
  libelle: string;
  n: number;
  alerte: boolean;
  angles: AngleMort[];
};

export type CompteursAnglesMorts = {
  /** Il manque une dimension à un driver existant. Seuil : trois sur le même driver. */
  avecDriverSansAxe: { total: number; parDriver: Map<string, GroupeAnglesMorts> };
  /**
   * Le marché suit une force absente de la grille. Seuil : deux sur un même sujet. Le sujet est le
   * libellé de l'axe manquant proposé, normalisé : un regroupement exact, volontairement étroit —
   * deviner que deux libellés voisins sont le même sujet ferait apparaître des alertes sans cause.
   */
  sansDriver: { total: number; parSujet: GroupeAnglesMorts[]; sansLibelle: number };
};

export function compterAnglesMorts(angles: AngleMort[], now: Date): CompteursAnglesMorts {
  const limite = new Date(now);
  limite.setUTCDate(limite.getUTCDate() - ANGLES_MORTS.fenetreJours);
  const debut = limite.toISOString().slice(0, 10);

  // Les angles résolus ne comptent plus : un axe ou un driver a été créé pour eux.
  const ouverts = angles.filter((a) => a.statut === "ouvert" && a.date >= debut);

  const parDriver = new Map<string, GroupeAnglesMorts>();
  const sujets = new Map<string, GroupeAnglesMorts>();
  let avecDriver = 0;
  let sansDriver = 0;
  let sansLibelle = 0;

  for (const a of ouverts) {
    if (a.driverId !== null) {
      avecDriver += 1;
      const g = parDriver.get(a.driverId) ?? { libelle: a.driverId, n: 0, alerte: false, angles: [] };
      g.n += 1;
      g.angles.push(a);
      g.alerte = g.n >= ANGLES_MORTS.seuilAvecDriver;
      parDriver.set(a.driverId, g);
      continue;
    }

    sansDriver += 1;
    if (!a.axeManquantPropose || a.axeManquantPropose.trim() === "") {
      sansLibelle += 1;
      continue;
    }
    const cle = normaliserSujet(a.axeManquantPropose);
    const g = sujets.get(cle) ?? { libelle: a.axeManquantPropose, n: 0, alerte: false, angles: [] };
    g.n += 1;
    g.angles.push(a);
    g.alerte = g.n >= ANGLES_MORTS.seuilSansDriver;
    sujets.set(cle, g);
  }

  return {
    avecDriverSansAxe: { total: avecDriver, parDriver },
    sansDriver: {
      total: sansDriver,
      parSujet: [...sujets.values()].sort((x, y) => y.n - x.n),
      sansLibelle,
    },
  };
}

// ---------------------------------------------------------------------------
// Persistance — écriture (passe 2) et lecture (pages)
// ---------------------------------------------------------------------------

type Ligne = {
  item_id: string;
  date: string;
  driver_id: string | null;
  axe_manquant_propose: string | null;
  titre: string;
  source: string;
  url: string;
  statut: AngleMort["statut"];
  resolu_par: string | null;
};

export type BilanEnregistrement = {
  enregistres: number;
  retires: number;
  /** La table n'existe pas encore (migration de `supabase/schema.sql` non appliquée). */
  tableAbsente: boolean;
  erreur?: string;
};

/**
 * Aligne la table sur le **dernier** jugement de la passe 2, pour les items de ce run.
 *
 * - Un item classé angle mort est écrit — sans jamais toucher `statut` ni `resolu_par` : seul un
 *   humain clôt un angle mort.
 * - Un item reclassé et désormais rattaché à un axe (ou plus de matérialité haute) est retiré s'il
 *   était encore ouvert. Sans cela, un seul classement bruité compterait pour tout un trimestre.
 *   Un angle déjà résolu n'est jamais retiré.
 *
 * Tolérant : une table absente ne casse jamais la passe, elle est signalée.
 */
export async function enregistrerAnglesMorts(
  client: SupabaseClient,
  outcomes: ClassifyOutcome[],
): Promise<BilanEnregistrement> {
  const bilan: BilanEnregistrement = { enregistres: 0, retires: 0, tableAbsente: false };
  const classes = outcomes.filter((o) => o.ok);
  const aEcrire = classes.map(enAngleMort).filter((a): a is NonNullable<typeof a> => a !== null);
  const aRetirer = classes.filter((o) => !estAngleMort(o)).map((o) => o.id);

  const echec = (message: string) => {
    bilan.erreur = message;
    bilan.tableAbsente = /angles_morts|relation|schema cache|does not exist/i.test(message);
  };

  if (aEcrire.length > 0) {
    // `statut` et `resolu_par` sont absents de la charge : à l'insertion le défaut s'applique, à la
    // mise à jour ils restent ce qu'ils étaient.
    const lignes = aEcrire.map((a) => ({
      item_id: a.id,
      date: a.date,
      driver_id: a.driverId,
      axe_manquant_propose: a.axeManquantPropose,
      titre: a.titre,
      source: a.source,
      url: a.url,
    }));
    const { error } = await client.from("angles_morts").upsert(lignes, { onConflict: "item_id" });
    if (error) {
      echec(error.message);
      return bilan;
    }
    bilan.enregistres = lignes.length;
  }

  if (aRetirer.length > 0) {
    const { error } = await client
      .from("angles_morts")
      .delete()
      .in("item_id", aRetirer)
      .eq("statut", "ouvert");
    if (error) {
      echec(error.message);
      return bilan;
    }
    bilan.retires = aRetirer.length;
  }

  return bilan;
}

function depuisLigne(l: Ligne): AngleMort {
  return {
    id: l.item_id,
    date: l.date,
    driverId: l.driver_id,
    axeManquantPropose: l.axe_manquant_propose,
    titre: l.titre,
    source: l.source,
    url: l.url,
    statut: l.statut,
    resoluPar: l.resolu_par,
  };
}

/**
 * Lecture pour les pages. `null` quand la table est illisible — base non configurée, migration non
 * appliquée, réseau : **jamais zéro**. Un compteur à 0 affirmerait « la grille tient » alors qu'on
 * n'en sait rien, exactement le mensonge que le cahier interdit (« un chiffre absent n'est jamais
 * remplacé par zéro »).
 */
export async function lireAnglesMorts(
  client: SupabaseClient | null,
): Promise<AngleMort[] | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("angles_morts")
      .select("item_id, date, driver_id, axe_manquant_propose, titre, source, url, statut, resolu_par")
      .order("date", { ascending: false });
    if (error || !data) return null;
    return (data as Ligne[]).map(depuisLigne);
  } catch {
    return null;
  }
}
