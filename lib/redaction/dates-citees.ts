/**
 * Les dates écrites dans une phrase, et les périodes qu'elle nomme.
 *
 * Ce module existe pour le contrôle des chiffres du régime A : un prix se vérifie contre la
 * clôture de **sa** date, pas contre la dernière cotation, donc il faut d'abord savoir quelle
 * date la phrase porte.
 *
 * Effet de bord indispensable : les dates doivent être **masquées** avant l'extraction des
 * nombres. « au 19/09 » contient un 19 que l'extracteur ramasserait et confronterait à la base
 * comme s'il s'agissait d'un prix. Tant que les dates étaient facultatives, la faute restait
 * théorique ; à partir du moment où on les exige, elle se produirait dans chaque phrase.
 */

const MOIS: Record<string, number> = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

export type DateCitee = { iso: string; debut: number; fin: number };

/** Une portion de phrase à masquer avant l'extraction des nombres. */
export type Span = { debut: number; fin: number };

const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const NUMERIQUE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
const EN_LETTRES = new RegExp(
  `\\b(\\d{1,2})(?:er)?\\s+(${Object.keys(MOIS).join("|")})(?:\\s+(\\d{4}))?\\b`,
  "gi",
);
/**
 * Une plage courte de deux jours — « 21-22/09 » — que `NUMERIQUE` seul laisse de côté à moitié :
 * il trouve bien « 22/09 », jamais le « 21- » qui le précède. Traitée en un seul bloc, datée
 * sur le second jour ; l'ordre des boucles dans `datesCitees` la fait gagner sur le
 * chevauchement, pour qu'un seul repère naisse de la plage entière plutôt que deux qui se
 * recouvriraient à moitié.
 */
const PLAGE_JOURS = /\b(\d{1,2})-(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;

/**
 * Les dates de la phrase, avec leur position — la position sert à rattacher la bonne date au
 * bon nombre quand la phrase en porte plusieurs.
 *
 * `anneeDeReference` comble l'année quand elle n'est pas écrite, ce qui est le cas courant
 * (« au 19/09 »). Une date qui tomberait **après** la note est ramenée à l'année précédente :
 * une note du 3 janvier qui cite « le 28/12 » parle de décembre dernier, pas de dans un an.
 */
export function datesCitees(phrase: string, dateDeLaNote: string): DateCitee[] {
  const trouvees: DateCitee[] = [];

  for (const m of phrase.matchAll(ISO)) {
    pousser(trouvees, m.index, m[0].length, `${m[1]}-${m[2]}-${m[3]}`, dateDeLaNote, false);
  }
  for (const m of phrase.matchAll(PLAGE_JOURS)) {
    pousser(trouvees, m.index, m[0].length, iso(annee(m[4]), Number(m[3]), Number(m[2])), dateDeLaNote, m[4] === undefined);
  }
  for (const m of phrase.matchAll(NUMERIQUE)) {
    pousser(trouvees, m.index, m[0].length, iso(annee(m[3]), Number(m[2]), Number(m[1])), dateDeLaNote, m[3] === undefined);
  }
  for (const m of phrase.matchAll(EN_LETTRES)) {
    const mois = MOIS[m[2].toLowerCase()];
    pousser(trouvees, m.index, m[0].length, iso(annee(m[3]), mois, Number(m[1])), dateDeLaNote, m[3] === undefined);
  }

  return trouvees.sort((a, b) => a.debut - b.debut);

  function annee(ecrite: string | undefined): number {
    if (ecrite === undefined) return Number(dateDeLaNote.slice(0, 4));
    return ecrite.length === 2 ? 2000 + Number(ecrite) : Number(ecrite);
  }
}

function pousser(
  dans: DateCitee[],
  debut: number,
  longueur: number,
  candidate: string,
  dateDeLaNote: string,
  anneeDeduite: boolean,
): void {
  if (!estUneVraieDate(candidate)) return;

  // Une date déduite qui tombe après la note appartient à l'année précédente.
  const finale =
    anneeDeduite && candidate > dateDeLaNote
      ? `${Number(candidate.slice(0, 4)) - 1}${candidate.slice(4)}`
      : candidate;

  // Les motifs se recouvrent — « 19/09/2026 » est aussi vu comme « 19/09 ». On garde le
  // premier trouvé sur une position donnée et on ignore ce qui chevauche.
  if (dans.some((d) => debut < d.fin && debut + longueur > d.debut)) return;
  dans.push({ iso: finale, debut, fin: debut + longueur });
}

function iso(an: number, mois: number, jour: number): string {
  return `${an}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** Écarte « 45/13 » et le 31 d'un mois de trente jours plutôt que de fabriquer une date. */
function estUneVraieDate(candidat: string): boolean {
  const [an, mois, jour] = candidat.split("-").map(Number);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return false;
  const d = new Date(Date.UTC(an, mois - 1, jour));
  return d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
}

/**
 * Remplace chaque date par des espaces, en conservant les positions.
 *
 * Des espaces et non une suppression : les index des nombres restent ceux de la phrase
 * d'origine, donc la distance entre un nombre et la date qui le qualifie reste juste.
 */
export function masquer(phrase: string, spans: Span[]): string {
  let masquee = phrase;
  for (const d of spans) {
    masquee = masquee.slice(0, d.debut) + " ".repeat(d.fin - d.debut) + masquee.slice(d.fin);
  }
  return masquee;
}

/**
 * Où ces termes apparaissent dans la phrase — pour masquer les **noms d'instruments**.
 *
 * Même raison que les dates, et au moins aussi piégeuse : « S&P 500 », « CAC 40 »,
 * « Nikkei 225 », « US 10 ans » portent des chiffres qui appartiennent au nom, pas à la mesure.
 * Sans ce masquage, « le S&P 500 clôture à 7674,37 » fait entrer un 500 dans le contrôle, qui
 * le confronte à la base et bloque la note sur un nombre que personne n'a écrit comme un prix.
 */
export function spansDeTermes(phrase: string, termes: string[]): Span[] {
  const minuscule = phrase.toLowerCase();
  const spans: Span[] = [];

  // Les plus longs d'abord : « S&P 500 » doit gagner sur « S&P » si les deux sont connus.
  for (const terme of [...termes].sort((a, b) => b.length - a.length)) {
    if (terme.length < 2) continue;
    const cible = terme.toLowerCase();
    let depuis = 0;
    for (;;) {
      const i = minuscule.indexOf(cible, depuis);
      if (i < 0) break;
      const fin = i + cible.length;
      if (!spans.some((s) => i < s.fin && fin > s.debut)) spans.push({ debut: i, fin });
      depuis = i + 1;
    }
  }
  return spans;
}

const SEMAINE_ISO = /\bS(\d{1,2})\b/g;

/**
 * La référence courte à une semaine ISO — « en S38 », « depuis S38 » — jamais une mesure.
 *
 * Une note compare la sienne à la précédente en toutes lettres, hors du frontmatter où
 * `comparesTo` porte déjà la forme longue (`2026-S38`). Sans ce masquage, le 38 de « S38 »
 * entre dans le contrôle comme n'importe quel autre nombre : il est bien littéralement dans la
 * fiche s'il s'y trouve par coïncidence, mais aucune phrase ne l'« attribue » jamais à un
 * émetteur — ce n'est pas une affirmation qui vient de quelqu'un, c'est un renvoi interne.
 * Bornée à 53 pour ne pas masquer un nombre à deux chiffres qui suivrait un « S » par hasard
 * dans un tout autre sens.
 */
export function spansDeSemaines(phrase: string): Span[] {
  const spans: Span[] = [];
  for (const m of phrase.matchAll(SEMAINE_ISO)) {
    if (Number(m[1]) > 53) continue;
    spans.push({ debut: m.index, fin: m.index + m[0].length });
  }
  return spans;
}

// ---------------------------------------------------------------------------
// Les périodes
// ---------------------------------------------------------------------------

/**
 * Une période nommée en toutes lettres, et sa durée en jours.
 *
 * `ytd` est à part : sa borne de début n'est pas « il y a N jours » mais la base du
 * 31 décembre, saisie à la main dans le catalogue.
 */
export type Periode = { libelle: string; jours: number } | { libelle: string; ytd: true };

const PERIODES: Array<{ motif: RegExp; periode: Periode }> = [
  { motif: /depuis le 1(?:er)? janvier|depuis le début de l'année|\bYTD\b|depuis le 31 décembre/i, periode: { libelle: "depuis le 1er janvier", ytd: true } },
  { motif: /sur (?:la |une )?semaine|en une semaine|hebdomadaire|sur (?:cinq|5) séances/i, periode: { libelle: "sur la semaine", jours: 7 } },
  { motif: /sur (?:deux|2) séances|en (?:deux|2) séances|sur (?:deux|2) jours/i, periode: { libelle: "sur deux séances", jours: 2 } },
  { motif: /sur (?:la |une )?séance|sur (?:la |une )?journée|en (?:une )?séance|depuis la veille|sur (?:la |une )?clôture précédente/i, periode: { libelle: "sur la séance", jours: 1 } },
  { motif: /sur (?:un|1) mois|en (?:un|1) mois|sur le mois/i, periode: { libelle: "sur un mois", jours: 30 } },
  { motif: /sur (?:trois|3) mois|en (?:trois|3) mois|sur le trimestre|trimestriel/i, periode: { libelle: "sur trois mois", jours: 91 } },
  { motif: /sur (?:six|6) mois|en (?:six|6) mois|sur le semestre/i, periode: { libelle: "sur six mois", jours: 182 } },
  { motif: /sur (?:un|1) an|en (?:un|1) an|sur (?:les )?douze (?:derniers )?mois|glissement annuel|annuel/i, periode: { libelle: "sur un an", jours: 365 } },
];

/**
 * La période que la phrase nomme, **avec sa position**, ou `null` si elle n'en nomme aucune.
 *
 * La position n'est pas un détail : « depuis le 1er janvier » est une borne de période, et
 * c'est aussi, mot pour mot, une date. Sans son span, `datesCitees` la lirait comme la date de
 * référence du nombre et une variation annuelle se retrouverait vérifiée au 1er janvier.
 */
export function periodeCitee(phrase: string): (Periode & Span) | null {
  for (const { motif, periode } of PERIODES) {
    const m = motif.exec(phrase);
    if (m) return { ...periode, debut: m.index, fin: m.index + m[0].length };
  }
  return null;
}

/**
 * Les tournures qui font d'un nombre une **variation** plutôt qu'un niveau.
 *
 * Le `%` ne suffit pas à trancher : un rendement obligataire s'écrit aussi en pourcentage. Ce
 * qui distingue, c'est le mouvement — « en hausse de 4,1 % » contre « à 4,18 % ».
 */
const MOUVEMENT =
  /(hauss|baiss|recul|progress|gagn|perd|cèd|ced|avanc|chut|repli|bondi|plong|grimp|flambe|variation|s'apprécie|se déprécie|augment|diminu|(?:^|[\s(])[+−-]\s*$)/i;

/** Ce nombre est-il présenté comme une variation ? Décidé sur ce qui le précède immédiatement. */
export function estUneVariation(phrase: string, debutDuSegment: number, indexDuNombre: number): boolean {
  // Le segment depuis le nombre précédent, et non une fenêtre de largeur fixe. Dans « gagne
  // 2,3 % pour finir à 7674,37 », une fenêtre attraperait « gagne » pour les deux nombres et
  // prendrait le niveau pour une seconde variation ; le segment s'arrête au « % ».
  return MOUVEMENT.test(phrase.slice(debutDuSegment, indexDuNombre));
}

/**
 * Les tournures qui ancrent un nombre au **présent** — la dernière clôture connue.
 *
 * Liste courte et explicite : sans marqueur, un nombre de marché n'est pas réputé décrire
 * aujourd'hui, il est réputé sans date. C'est le sens de la règle « un prix sans date n'est pas
 * une information » : le doute ne bénéficie pas au texte.
 */
const PRESENT =
  /aujourd'hui|à ce jour|actuellement|désormais|à présent|au dernier relevé|à la dernière clôture|en clôture de la semaine|ce (?:matin|soir)|à l'heure où/i;

export function decritLePresent(phrase: string): boolean {
  return PRESENT.test(phrase);
}
