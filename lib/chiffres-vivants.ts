import type { Instrument, MacroIndicator, Note, Observation } from "./types";
import { resoudreIndicateurCle } from "./indicateur-cle";
import { dailyChange, observationOnOrBefore } from "./performance";
import { formatChange, formatInstrumentValue } from "./marches";
import { formatIndicatorValue, metricOf } from "./macro";
import { formatJourMois, formatSignedBps } from "./format";
import { freshnessTier } from "./freshness";
import { estNonCollectee } from "./provenance";

/**
 * Les chiffres clés de l'accueil, vivants : la **dernière observation collectée** de ce que le
 * chiffre désigne, et non plus le texte figé du frontmatter. Le texte de la note reste la
 * référence « dans la note » de la feuille de chiffre ; la base donne « aujourd'hui ».
 *
 * Un chiffre que rien ne relie au catalogue — une prévision de maison, un chiffre d'étude —
 * reste le texte de la note : on ne fabrique jamais une valeur vivante pour un libellé qu'on ne
 * sait pas rattacher.
 */
export type Cible = { kind: "macro"; id: string } | { kind: "instrument"; id: string };

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/^etf\s+/, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contientMot(texte: string, motif: string): boolean {
  const echappe = motif.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${echappe}($|[^\\p{L}\\p{N}])`, "u").test(texte);
}

/**
 * L'instrument que nomme un libellé, ou null. Le libellé du catalogue (sans « ETF ») doit se lire
 * en entier, mot pour mot, dans celui du chiffre : « US 10 ans » ne se confond pas avec « US 1
 * an ». Les instruments cités par la note passent devant, puis le libellé le plus long.
 */
export function instrumentDepuisLibelle(
  label: string,
  instruments: Pick<Instrument, "id" | "label">[],
  citesParLaNote: string[] = [],
): string | null {
  const texte = normaliser(label);
  const candidats = instruments
    .map((i) => ({ id: i.id, cle: normaliser(i.label) }))
    .filter((i) => i.cle.length > 0 && (contientMot(texte, i.cle) || texte === i.id));
  if (candidats.length === 0) return null;
  candidats.sort(
    (a, b) =>
      Number(citesParLaNote.includes(b.id)) - Number(citesParLaNote.includes(a.id)) ||
      b.cle.length - a.cle.length,
  );
  return candidats[0].id;
}

export function resoudreCible(
  chiffre: Note["keyIndicators"][number],
  note: Pick<Note, "instrumentRefs">,
  catalogue: { indicateurExiste: (id: string) => boolean; instruments: Pick<Instrument, "id" | "label">[] },
): Cible | null {
  const macro = resoudreIndicateurCle(chiffre, catalogue.indicateurExiste);
  if (macro) return { kind: "macro", id: macro };
  const instrument = instrumentDepuisLibelle(chiffre.label, catalogue.instruments, note.instrumentRefs);
  return instrument ? { kind: "instrument", id: instrument } : null;
}

/** « au 15/10 » dans la valeur écrite d'un chiffre : la date à laquelle la note l'a lu. */
export function dateDansLaValeur(valeur: string, dateNote: string): string {
  const m = /\b(?:au|le)\s+(\d{1,2})\/(\d{1,2})\b/.exec(valeur);
  if (!m) return dateNote;
  const annee = Number(dateNote.slice(0, 4));
  const mois = Number(m[2]);
  // Une note de janvier qui cite le 30/12 parle de l'année précédente.
  const an = mois > Number(dateNote.slice(5, 7)) + 1 ? annee - 1 : annee;
  return `${an}-${String(mois).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

const MOIS_COURT = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

/** « le 14/10 » pour une série quotidienne, la période pour une série mensuelle ou trimestrielle. */
export function libelleDate(date: string, frequence: "business-daily" | "monthly" | "quarterly"): string {
  if (frequence === "monthly") return MOIS_COURT.format(new Date(`${date}T00:00:00Z`));
  if (frequence === "quarterly") return `T${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1} ${date.slice(0, 4)}`;
  return `le ${formatJourMois(date)}`;
}

export type Variation = { texte: string; sens: "up" | "down" | "flat" };

export type ChiffreVivant = {
  label: string;
  /** La valeur écrite par la note, telle quelle : le repli quand rien n'est rattaché. */
  valeurNote: string;
  href: string | null;
  source: string | null;
  /** `null` : non rattaché, ou rattaché mais sans aucune observation. */
  actuel: {
    valeur: string;
    date: string;
    dateLibelle: string;
    variation: Variation | null;
    /** Dit à la place de la variation quand une série en palier n'a pas bougé. */
    mention: string | null;
    perime: boolean;
    nonCollecte: boolean;
  } | null;
  dansLaNote: { valeur: string; date: string } | null;
  ecart: Variation | null;
  points: Array<{ date: string; value: number }>;
  dateNote: string;
};

const POINTS_FEUILLE = 90;

function sens(x: number): Variation["sens"] {
  return x > 0 ? "up" : x < 0 ? "down" : "flat";
}

function trier(obs: Observation[]): Observation[] {
  return [...obs].sort((a, b) => a.date.localeCompare(b.date));
}

export function construireChiffre({
  chiffre,
  note,
  cible,
  instrument,
  indicateur,
  observations,
  borneBasse = [],
  source,
  maintenant = new Date(),
}: {
  chiffre: Note["keyIndicators"][number];
  note: Pick<Note, "date">;
  cible: Cible | null;
  instrument?: Instrument | null;
  indicateur?: MacroIndicator | null;
  observations: Observation[];
  /** Pour un taux directeur publié en fourchette (Fed) : la borne basse, à la même date. */
  borneBasse?: Observation[];
  source: string | null;
  maintenant?: Date;
}): ChiffreVivant {
  const dateNote = dateDansLaValeur(chiffre.value, note.date);
  const base: ChiffreVivant = {
    label: chiffre.label,
    valeurNote: chiffre.value,
    href: null,
    source: null,
    actuel: null,
    dansLaNote: null,
    ecart: null,
    points: [],
    dateNote,
  };
  if (!cible || (cible.kind === "instrument" && !instrument) || (cible.kind === "macro" && !indicateur)) {
    return base;
  }

  const obs = trier(observations);
  const href = instrument ? `/marches/${instrument.assetClass}/${instrument.id}` : `/macro/${cible.id}`;
  const dernier = obs.at(-1);
  if (!dernier) return { ...base, href };

  const tauxDirecteur = indicateur ? metricOf(indicateur) === "policy-rate" : false;
  const pourcent = instrument ? instrument.unit === "percent" : indicateur?.unit === "percent";
  const formater = (v: number): string => {
    if (instrument) return formatInstrumentValue(instrument, v);
    if (tauxDirecteur) return `${v.toFixed(2).replace(".", ",")} %`;
    return formatIndicatorValue(indicateur!, v);
  };
  // Une variation se lit en points de base pour un taux, en pourcentage sinon (CLAUDE.md).
  const ecartEntre = (de: number, a: number): Variation =>
    instrument
      ? { texte: formatChange(instrument, a - de, de === 0 ? 0 : ((a - de) / Math.abs(de)) * 100), sens: sens(a - de) }
      : pourcent
        ? { texte: formatSignedBps((a - de) * 100), sens: sens(a - de) }
        : { texte: `${a - de > 0 ? "+" : ""}${(a - de).toFixed(1).replace(".", ",")}`, sens: sens(a - de) };

  const basse = trier(borneBasse);
  const formaterPoint = (o: Observation): string => {
    const b = basse.length > 0 ? observationOnOrBefore(basse, o.date) : null;
    if (!b || b.value >= o.value) return formater(o.value);
    return `${b.value.toFixed(2).replace(".", ",")}-${o.value.toFixed(2).replace(".", ",")} %`;
  };

  const frequence = indicateur?.frequency ?? "business-daily";
  let variation: Variation | null = null;
  let mention: string | null = null;
  if (instrument) {
    const d = dailyChange(obs);
    variation = d ? ecartEntre(d.fromValue, d.toValue) : null;
  } else if (tauxDirecteur) {
    const rupture = [...obs].reverse().find((o) => o.value !== dernier.value);
    if (rupture) {
      const depuis = obs.find((o) => o.date > rupture.date)!;
      mention = `inchangé depuis ${MOIS_COURT.format(new Date(`${depuis.date}T00:00:00Z`))}`;
      if (depuis.date === dernier.date) {
        variation = ecartEntre(rupture.value, dernier.value);
        mention = null;
      }
    }
  } else {
    const precedent = obs.at(-2);
    variation = precedent ? ecartEntre(precedent.value, dernier.value) : null;
  }

  const tier = freshnessTier(dernier.fetchedAt, maintenant);
  const nonCollecte = estNonCollectee(dernier);
  // Un instrument dont la variation de séance n'existe pas (trou de plus de sept jours) se lit
  // comme une valeur périmée, jamais avec un tiret.
  const perime = !nonCollecte && (tier !== "frais" || (instrument !== null && instrument !== undefined && variation === null));

  const auNote = observationOnOrBefore(obs, dateNote);
  return {
    ...base,
    href,
    source,
    actuel: {
      valeur: formaterPoint(dernier),
      date: dernier.date,
      dateLibelle: libelleDate(dernier.date, frequence),
      variation: nonCollecte ? null : variation,
      mention: nonCollecte ? null : mention,
      perime,
      nonCollecte,
    },
    dansLaNote: auNote ? { valeur: formaterPoint(auNote), date: auNote.date } : null,
    ecart: auNote && !nonCollecte ? ecartEntre(auNote.value, dernier.value) : null,
    points: obs.slice(-POINTS_FEUILLE).map((o) => ({ date: o.date, value: o.value })),
  };
}
