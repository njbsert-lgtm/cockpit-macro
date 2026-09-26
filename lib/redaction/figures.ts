import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";
import {
  datesCitees,
  decritLePresent,
  estUneVariation,
  masquer,
  periodeCitee,
  spansDeTermes,
  type Periode,
} from "./dates-citees";

/**
 * Le contrôle des chiffres — **deux provenances, deux vérifications, toutes deux bloquantes.**
 *
 * C'est le garde-fou le plus important du pipeline, parce que c'est la faute la plus
 * indétectable à la lecture : un chiffre légèrement de travers dans une phrase bien tournée
 * est invisible, et c'est précisément ce qu'un modèle produit quand il reformule. Il ne
 * signale pas, il bloque — un avertissement qu'on peut ignorer sera ignoré au bout de trois
 * semaines.
 *
 * Jusqu'au basculement Notion, tout nombre devait correspondre à une valeur en base. Une note
 * écrite depuis la fiche bloquerait sur la quasi-totalité de ses chiffres : décisions de
 * banques centrales, chiffres d'études, prévisions de maisons, statistiques non collectées.
 * D'où deux régimes.
 *
 * **Régime A — instrument collecté par l'application.** Le nombre doit correspondre à la valeur
 * stockée **à la date qu'il porte**, à la tolérance d'arrondi près. Sans exception : si la
 * fiche cite un Brent à 104 $ et que la base a 102,96 $, la note affiche la valeur de la base.
 *
 * **Régime B — nombre absent de la base.** Deux conditions cumulatives : le nombre se retrouve
 * **littéralement** dans la fiche, et il porte **son attribution** dans la phrase qui le
 * contient. La seconde est la plus importante : elle transforme une faiblesse — des chiffres
 * non vérifiables — en discipline éditoriale, puisque le lecteur sait toujours qui avance quoi.
 */

export type Regime = "A" | "B";

export type VerdictChiffre = {
  /** Le nombre tel qu'il apparaît dans le texte. */
  ecrit: string;
  valeur: number;
  bloc: string;
  regime: Regime;
  /** Ce à quoi il a été rattaché, quand il l'a été. */
  source: string | null;
  verdict: VerdictNom;
  /** Régime A : la date — ou la période — contre laquelle le nombre a été confronté. */
  dateRetenue: string | null;
  /** Régime A : ce que la base porte à cette date, rendu en français. */
  valeurBase: string | null;
};

/**
 * Six issues plutôt que deux. Une note bloquée doit dire *pourquoi* : les gestes de correction
 * sont différents, et un rapport qui les confond fait chercher au mauvais endroit.
 *
 * `ecart` et `non-verifiable` sont la distinction la plus importante du lot. « La base porte
 * 102,96 » se corrige en changeant le chiffre ; « donnée absente au 20/09 » se corrige en
 * changeant la date, ou en constatant un trou de collecte. Les confondre enverrait réécrire
 * une phrase juste.
 */
export type VerdictNom =
  | "conforme"
  /** Régime A : la base porte autre chose à la date retenue. */
  | "ecart"
  /** Régime A : aucune date exploitable — un prix sans date n'est pas une information. */
  | "sans-date"
  /** Régime A : la base n'a rien à cette date, ou la période n'est pas bornable. */
  | "non-verifiable"
  /** Régime B : le nombre n'est ni en base ni littéralement dans la fiche. */
  | "introuvable"
  /** Régime B : le nombre est dans la fiche, mais personne ne l'avance dans la phrase. */
  | "sans-attribution";

export type RapportChiffres = {
  verdicts: VerdictChiffre[];
  /** Vrai dès qu'un seul nombre n'est pas conforme. La publication est alors indisponible. */
  bloque: boolean;
};

/**
 * Repère les nombres d'un texte français : « 3,4 », « 25 249,85 », « +41 », « 2,5 % ».
 * L'espace insécable et l'espace fine sont des séparateurs de milliers courants en français.
 */
const NOMBRE = /[+-]?\d[\d   ]*(?:[.,]\d+)?/g;

/**
 * Les nombres qu'on ne confronte à rien : ils ne prétendent pas à une mesure.
 *
 * Une année ou un identifiant de semaine n'est pas une donnée de marché, et exiger qu'ils
 * figurent dans le paquet ferait bloquer toute note qui écrit « depuis 2024 ». Le seuil de
 * quatre chiffres sans décimale attrape les années sans écarter les valeurs d'indice, qui
 * portent presque toujours une décimale dans le paquet.
 *
 * Les dates, elles, ne passent pas par ici : elles sont masquées en amont (`dates-citees.ts`),
 * parce que le 19 de « au 19/09 » serait sinon confronté à la base comme s'il était un prix.
 *
 * **L'unité rouvre le contrôle.** Un petit entier suivi de `%`, `$`, `€` ou `bps` n'est pas un
 * compte, c'est une mesure : « en hausse de 2 % », « taux directeur à 4 % ». Sans cette
 * réserve, l'exemption des petits entiers laissait passer en silence toute la partie basse des
 * taux directeurs et des variations hebdomadaires — le contrôle ne les voyait même pas, donc
 * il ne pouvait pas les bloquer. C'est le trou le plus large que ce garde-fou ait porté.
 */
const UNITE = /^\s*(%|\$|€|£|¥|bps|pb\b|points? de base)/;

function estNeutre(brut: string, valeur: number, suite: string): boolean {
  if (/^\d{4}$/.test(brut) && valeur >= 1900 && valeur <= 2200) return true; // une année
  if (UNITE.test(suite)) return false; // une mesure, quelle que soit sa taille
  if (Number.isInteger(valeur) && Math.abs(valeur) <= 12) return true; // un rang, un compte
  return false;
}

type UniteEcrite = "percent" | "usd" | "multiple" | null;

/**
 * L'unité qui suit immédiatement un nombre, quand elle en réfute la nature plutôt que quand
 * elle la confirme — c'est tout ce dont ce garde-fou a besoin.
 *
 * `null` ne veut pas dire « sans unité » : un nombre nu (« 6714,59 ») peut très bien être la
 * valeur d'un instrument coté en points d'indice. C'est un signal négatif exploitable pour un
 * multiple (« 19x ») ou un dollar (« 415 USD ») sur un instrument qui ne se cote jamais ainsi,
 * jamais un signal positif pour les cas ambigus.
 */
function uniteEcriteApres(suite: string): UniteEcrite {
  const s = suite.trimStart();
  if (/^%/.test(s)) return "percent";
  if (/^(\$|usd\b)/i.test(s)) return "usd";
  if (/^x\b/i.test(s)) return "multiple";
  return null;
}

/**
 * Un nombre nomme un instrument dans sa phrase, mais porte-t-il une unité que cet instrument
 * peut effectivement prendre ?
 *
 * C'est le trou révélé par la première fiche Notion réelle : « le BPA du S&P 500 a progressé
 * de 51 % » ou « un P/E forward de 19x » nomment l'indice sans être son niveau — 51 (un
 * pourcentage de croissance de bénéfices) ou 19 (un multiple de valorisation) n'ont rien à voir
 * avec 6714,59 (le niveau de l'indice, en points). Sans ce garde-fou, ces nombres se faisaient
 * confronter au niveau stocké et échouaient en « écart » ou en « sans-date » pour une raison
 * qui n'a pas de sens : ce ne sont pas des mesures de l'instrument nommé.
 *
 * Aucun instrument suivi ne se cote en multiple — `multiple` est donc toujours incompatible.
 * Un pourcentage ou un dollar n'est compatible qu'avec un instrument dont l'unité déclarée est
 * la même : un taux directeur (`percent`) accepte « 4 % », un indice (`index`) ne l'accepte
 * pas. Un nombre sans unité écrite (`null`) ne réfute rien : il reste rattaché, comme avant.
 */
function compatibleAvecInstrument(unite: UniteEcrite, uniteInstrument: string): boolean {
  if (unite === null) return true;
  if (unite === "multiple") return false;
  return unite === uniteInstrument;
}

function normaliser(brut: string): number {
  return Number(brut.replace(/[   ]/g, "").replace(",", "."));
}

function decimalesDe(brut: string): number {
  const partie = brut.split(/[.,]/)[1];
  return partie ? partie.length : 0;
}

function rendre(valeur: number, decimales: number): string {
  return valeur.toFixed(decimales).replace(".", ",");
}

// ---------------------------------------------------------------------------
// La tolérance d'arrondi
// ---------------------------------------------------------------------------

export type Confrontation = { ok: true } | { ok: false; raison: "arrondi" | "niveau" };

/**
 * Le nombre écrit est-il un arrondi acceptable de la valeur stockée ?
 *
 * Deux conditions, et la première est celle qu'on oublie. **On accepte de perdre au plus une
 * décimale** par rapport à la valeur stockée : si la base porte 102,96, « 103,0 » passe et
 * « 103 » non. Sans ce plancher, il suffirait d'écrire un nombre assez grossier pour que la
 * tolérance d'arrondi avale un vrai écart — « 103 » tolérerait ±0,5, donc couvrirait aussi bien
 * 102,96 que 103,4, et le contrôle cesserait de contrôler quoi que ce soit.
 *
 * La seconde condition est l'arrondi proprement dit, à la précision **écrite** : « 3,4 » pour
 * 3,42 est juste, « 3,5 » ne l'est pas.
 */
export function confronter(ecrit: string, stockee: number, decimalesStockees?: number): Confrontation {
  const ecrites = decimalesDe(ecrit);
  const stockeesReelles = decimalesStockees ?? decimalesDe(String(stockee));

  if (ecrites < stockeesReelles - 1) return { ok: false, raison: "arrondi" };

  const tolerance = 0.5 * 10 ** -ecrites;
  const valeur = normaliser(ecrit);
  return Math.abs(Math.abs(stockee) - Math.abs(valeur)) <= tolerance
    ? { ok: true }
    : { ok: false, raison: "niveau" };
}

// ---------------------------------------------------------------------------
// Les phrases — le grain du régime B, et de la détection d'instrument
// ---------------------------------------------------------------------------

/**
 * Découpe en phrases sans casser les nombres.
 *
 * Un point n'est une fin de phrase que suivi d'une espace : « 102.96 » reste entier, alors
 * qu'un découpage naïf sur `.` en ferait deux phrases et perdrait l'attribution qui suit.
 */
export function phrases(texte: string): string[] {
  return texte
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Les instruments nommés dans une phrase — c'est ce qui bascule un nombre en régime A.
 *
 * Le rattachement se fait sur le libellé et l'identifiant, en toutes lettres. Volontairement
 * étroit : une phrase qui dit « les rendements longs » sans nommer d'instrument ne bascule
 * pas, et son nombre repart en régime B, lui-même bloquant. L'échec par défaut est donc le
 * régime le plus exigeant, jamais un passage silencieux.
 */
export function instrumentsNommes(phrase: string, paquet: ContextePaquet): ObservationContexte[] {
  const minuscule = phrase.toLowerCase();
  return paquet.observations.filter((o) => {
    const label = o.label.toLowerCase();
    return (
      (label.length >= 3 && minuscule.includes(label)) ||
      new RegExp(`\\b${echapper(o.instrumentId)}\\b`, "i").test(phrase)
    );
  });
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Régime A — la clôture de la date citée fait foi
// ---------------------------------------------------------------------------

/** La clôture **exactement** à cette date. Un jour sans cotation n'en a pas, et on le dit. */
export function clotureAu(obs: ObservationContexte, date: string): number | null {
  return obs.valeurs.find((v) => v.date === date)?.value ?? null;
}

/** La dernière clôture à cette date ou avant — la borne de début d'une période. */
function clotureAuPlusTard(obs: ObservationContexte, date: string): { date: string; value: number } | null {
  const avant = obs.valeurs.filter((v) => v.date <= date);
  return avant.length > 0 ? avant[avant.length - 1] : null;
}

function derniereCloture(obs: ObservationContexte): { date: string; value: number } | null {
  return obs.valeurs.at(-1) ?? null;
}

function reculer(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
}

/** « 2026-09-19 » → « 19/09 », la forme dont le rapport a besoin. */
export function enJourMois(iso: string): string {
  const [, mois, jour] = iso.split("-");
  return `${jour}/${mois}`;
}

type Issue = Pick<VerdictChiffre, "verdict" | "source" | "dateRetenue" | "valeurBase">;

/**
 * Le verdict d'un niveau : la clôture de la date citée, et elle seule.
 *
 * Trois ancrages possibles, dans cet ordre de préférence — la date écrite d'abord, parce
 * qu'elle est la plus précise ; le présent ensuite, quand la phrase le dit explicitement ;
 * rien sinon, et rien bloque.
 */
function verdictNiveau(
  ecrit: string,
  obs: ObservationContexte,
  phrase: string,
  indexDuNombre: number,
  dates: ReturnType<typeof datesCitees>,
): Issue {
  const ancrage = ancrerLeNiveau(obs, phrase, indexDuNombre, dates);
  if (!ancrage) {
    return {
      verdict: "sans-date",
      source: obs.instrumentId,
      dateRetenue: null,
      valeurBase: null,
    };
  }

  const stockee = clotureAu(obs, ancrage.date);
  if (stockee === null) {
    return {
      verdict: "non-verifiable",
      source: obs.instrumentId,
      dateRetenue: ancrage.date,
      valeurBase: null,
    };
  }

  const confrontation = confronter(ecrit, stockee);
  return {
    verdict: confrontation.ok ? "conforme" : "ecart",
    source: `${obs.instrumentId} au ${enJourMois(ancrage.date)}`,
    dateRetenue: ancrage.date,
    valeurBase: rendre(stockee, decimalesDe(String(stockee))),
  };
}

function ancrerLeNiveau(
  obs: ObservationContexte,
  phrase: string,
  indexDuNombre: number,
  dates: ReturnType<typeof datesCitees>,
): { date: string } | null {
  // Plusieurs dates dans la phrase : celle qui qualifie ce nombre-ci est la plus proche.
  if (dates.length > 0) {
    const proche = [...dates].sort(
      (a, b) => distance(a, indexDuNombre) - distance(b, indexDuNombre),
    )[0];
    return { date: proche.iso };
  }
  if (decritLePresent(phrase)) {
    const derniere = derniereCloture(obs);
    return derniere ? { date: derniere.date } : null;
  }
  return null;
}

function distance(d: { debut: number; fin: number }, index: number): number {
  return index < d.debut ? d.debut - index : index - d.fin;
}

/**
 * Le verdict d'une variation : **recalculée** depuis les deux clôtures de la base, jamais
 * reprise de la fiche.
 *
 * C'est le point qui distingue ce contrôle d'une comparaison de chiffres. Une maison de
 * recherche calcule sa variation hebdomadaire sur ses propres bornes, parfois sur cinq jours
 * ouvrés au lieu de sept jours calendaires, parfois depuis une clôture que nous n'avons pas.
 * Reprendre son pourcentage reviendrait à publier son calcul sous notre signature.
 */
function verdictVariation(
  ecrit: string,
  obs: ObservationContexte,
  periode: Periode,
  dates: ReturnType<typeof datesCitees>,
): Issue {
  // La borne de fin : la date écrite si la phrase en porte une, la dernière clôture sinon.
  const dateFin = dates.length > 0 ? dates[0].iso : (derniereCloture(obs)?.date ?? null);
  const valeurFin = dateFin === null ? null : clotureAu(obs, dateFin);

  if (dateFin === null || valeurFin === null) {
    return {
      verdict: "non-verifiable",
      source: `${obs.instrumentId} — ${periode.libelle}`,
      dateRetenue: dateFin,
      valeurBase: null,
    };
  }

  const debut =
    "ytd" in periode
      ? obs.ytdBasis
      : clotureAuPlusTard(obs, reculer(dateFin, periode.jours));

  if (!debut) {
    return {
      verdict: "non-verifiable",
      source: `${obs.instrumentId} — ${periode.libelle}`,
      dateRetenue: `${periode.libelle}, jusqu'au ${enJourMois(dateFin)}`,
      valeurBase: null,
    };
  }

  const calculee = ((valeurFin - debut.value) / debut.value) * 100;
  // Deux décimales : c'est la précision d'un pourcentage calculé, donc le plancher est à une
  // décimale. Une variation écrite sans décimale — « en hausse de 4 % » — est un ordre de
  // grandeur, pas une mesure, et la même règle d'arrondi la refuse.
  const confrontation = confronter(ecrit, calculee, 2);

  return {
    verdict: confrontation.ok ? "conforme" : "ecart",
    source: `${obs.instrumentId} — ${periode.libelle}`,
    dateRetenue: `du ${enJourMois(debut.date)} au ${enJourMois(dateFin)}`,
    valeurBase: `${rendre(calculee, 2)} %`,
  };
}

// ---------------------------------------------------------------------------
// Régime B — la fiche fait foi, et il faut dire qui parle
// ---------------------------------------------------------------------------

/**
 * Le nombre se retrouve-t-il **littéralement** dans la fiche ?
 *
 * On normalise les espaces — insécable, fine, ordinaire —, **jamais les chiffres**. Une note
 * qui écrit « 2,5 % » là où la fiche porte « 2,50 % » bloque : c'est un arrondi introduit par
 * le modèle, donc un chiffre qu'il a fabriqué, même de peu.
 *
 * Les bornes empêchent « 2,4 » de se reconnaître dans « 12,45 » : un nombre n'est trouvé que
 * s'il n'est pas un morceau d'un autre.
 */
export function litteralementDansLaFiche(ecrit: string, fiche: string): boolean {
  const normaliserEspaces = (s: string) => s.replace(/[   ]/g, " ");
  const cible = normaliserEspaces(ecrit);
  const texte = normaliserEspaces(fiche);

  let depuis = 0;
  for (;;) {
    const i = texte.indexOf(cible, depuis);
    if (i < 0) return false;

    const avant = texte[i - 1] ?? "";
    const apres = texte[i + cible.length] ?? "";
    const bordAvant = !/[\d.,]/.test(avant);
    const bordApres = !/[\d]/.test(apres) && !(/[.,]/.test(apres) && /\d/.test(texte[i + cible.length + 1] ?? ""));
    if (bordAvant && bordApres) return true;

    depuis = i + 1;
  }
}

/** Un émetteur de la fiche est-il nommé dans la phrase qui porte le nombre ? */
export function attributionDans(phrase: string, emetteurs: string[]): string | null {
  const minuscule = phrase.toLowerCase();
  return emetteurs.find((e) => e.length >= 2 && minuscule.includes(e.toLowerCase())) ?? null;
}

// ---------------------------------------------------------------------------
// Le contrôle
// ---------------------------------------------------------------------------

/**
 * Le cœur du contrôle, indépendant de la forme de `Brouillon` : confronte chaque nombre d'une
 * liste `[étiquette, texte]` au paquet. Réutilisé tel quel par `lib/redaction/publication.ts`
 * pour re-contrôler après une édition humaine dans le portail — la même règle d'extraction et
 * de tolérance doit s'appliquer aux deux moments, sans quoi un chiffre jugé correct à la
 * rédaction pourrait être jugé faux à la publication pour une raison purement technique.
 */
export function extraireVerdicts(
  aControler: Array<[string, string]>,
  paquet: ContextePaquet,
): VerdictChiffre[] {
  const fiche = paquet.ficheNotion;
  const verdicts: VerdictChiffre[] = [];

  for (const [bloc, texte] of aControler) {
    for (const phrase of phrases(texte)) {
      const nommes = instrumentsNommes(phrase, paquet);
      const periode = periodeCitee(phrase);

      // « depuis le 1er janvier » est une borne de période *et*, mot pour mot, une date. Les
      // dates qui tombent dans le marqueur de période n'en sont pas : elles le composent.
      const dates = datesCitees(phrase, paquet.date).filter(
        (d) => !periode || d.debut >= periode.fin || d.fin <= periode.debut,
      );

      // Trois masquages avant l'extraction, tous pour la même raison : ces chiffres-là
      // n'appartiennent pas à une mesure. Le 19 de « au 19/09 », le 500 de « S&P 500 », le
      // 1er de « depuis le 1er janvier » — chacun se ferait confronter à la base et bloquerait
      // la note sur un nombre que personne n'a écrit comme un prix.
      const aMasquer = [
        ...datesCitees(phrase, paquet.date),
        ...spansDeTermes(
          phrase,
          nommes.flatMap((o) => [o.label, o.instrumentId]),
        ),
        ...(periode ? [periode] : []),
      ];
      const nue = masquer(phrase, aMasquer);

      let finPrecedente = 0;
      for (const m of nue.matchAll(NOMBRE)) {
        const ecrit = m[0].trim();
        const debutDuSegment = finPrecedente;
        finPrecedente = m.index + m[0].length;

        const valeur = normaliser(ecrit);
        if (!Number.isFinite(valeur)) continue;
        // Une année, un rang : rien à confronter, et les lister noierait les vrais chiffres.
        if (estNeutre(ecrit, valeur, nue.slice(finPrecedente))) continue;

        const commun = { ecrit, valeur, bloc };

        if (nommes.length > 0) {
          const obs = nommes[0];
          const estVariation = Boolean(periode) && estUneVariation(nue, debutDuSegment, m.index);
          // Une variation se recalcule dans n'importe quelle unité déclarée — un indice se
          // rapporte toujours en pourcentage. Seul le niveau brut exige que l'unité écrite
          // corresponde à celle de l'instrument nommé ; sinon ce nombre ne le mesure pas.
          if (estVariation || compatibleAvecInstrument(uniteEcriteApres(nue.slice(finPrecedente)), obs.unit)) {
            const issue = estVariation
              ? verdictVariation(ecrit, obs, periode as Periode, dates)
              : verdictNiveau(ecrit, obs, phrase, m.index, dates);
            verdicts.push({ ...commun, regime: "A", ...issue });
            continue;
          }
        }

        // Régime B. Sans fiche, il n'y a pas de texte source où retrouver le nombre : il ne
        // reste que « introuvable », ce qui est l'ancienne règle et reste juste.
        if (!fiche || !litteralementDansLaFiche(ecrit, fiche.contenu)) {
          verdicts.push({
            ...commun,
            regime: "B",
            source: null,
            verdict: "introuvable",
            dateRetenue: null,
            valeurBase: null,
          });
          continue;
        }

        const emetteur = attributionDans(phrase, fiche.sources);
        verdicts.push({
          ...commun,
          regime: "B",
          source: emetteur,
          verdict: emetteur ? "conforme" : "sans-attribution",
          dateRetenue: null,
          valeurBase: null,
        });
      }
    }
  }

  return verdicts;
}

/**
 * Confronte chaque nombre des blocs rédigés au paquet de contexte.
 *
 * `keyIndicators` et `regimeStatement` sont contrôlés au même titre que les blocs : un chiffre
 * faux en en-tête de note est au moins aussi visible qu'un chiffre faux dans le corps — et le
 * cahier exige déjà que tout composant affichant un chiffre affiche sa date de relevé, donc la
 * règle de datation y vaut comme ailleurs.
 */
export function controlerChiffres(brouillon: Brouillon, paquet: ContextePaquet): RapportChiffres {
  const aControler: Array<[string, string]> = [
    ["regimeStatement", brouillon.regimeStatement],
    ...brouillon.keyIndicators.map(
      (k): [string, string] => [`keyIndicators/${k.label}`, `${k.label} : ${k.value}`],
    ),
    ...Object.entries(brouillon.blocs),
    ...brouillon.scenarioRevisions.flatMap((r) =>
      r.branches.flatMap((b): Array<[string, string]> => [
        [`scenarioRevisions/${r.driverId}/${b.branchId}/why`, b.why],
        [`scenarioRevisions/${r.driverId}/${b.branchId}/thesis`, b.thesis],
      ]),
    ),
  ];

  const verdicts = extraireVerdicts(aControler, paquet);
  return { verdicts, bloque: verdicts.some((v) => v.verdict !== "conforme") };
}

/** Ce que chaque verdict reproche, en clair. Partagé avec le portail. */
export function reproche(v: VerdictChiffre): string {
  switch (v.verdict) {
    case "ecart": {
      // Deux fautes différentes derrière le même verdict, et l'auteur n'a pas le même geste à
      // faire. « 104 » quand la base porte 102,96 est un chiffre faux ; « 103 » est le bon
      // chiffre écrit trop grossièrement. Dire « écart » dans les deux cas enverrait corriger
      // un nombre qui n'a pas besoin de l'être. La distinction se relit des deux champs, sans
      // avoir à la transporter.
      const tropGrossier =
        v.valeurBase !== null && decimalesDe(v.ecrit) < decimalesDe(v.valeurBase) - 1;
      return tropGrossier
        ? `arrondi trop grossier — la base porte ${v.valeurBase}, une décimale de moins au plus`
        : `écart — la base porte ${v.valeurBase}`;
    }
    case "sans-date":
      return "aucune date dans la phrase — un prix sans date n'est pas une information";
    case "non-verifiable":
      return `non vérifiable — donnée absente au ${v.dateRetenue ? formaterDate(v.dateRetenue) : "?"}`;
    case "sans-attribution":
      return "dans la fiche, mais aucun émetteur nommé dans la phrase";
    case "introuvable":
      return "ni en base, ni littéralement dans la fiche";
    default:
      return "";
  }
}

/** `dateRetenue` porte soit une date ISO, soit une période déjà rédigée. */
function formaterDate(retenue: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(retenue) ? enJourMois(retenue) : retenue;
}

/** Le rapport en texte, pour le résumé du run et pour le portail. */
export function rendreRapport(rapport: RapportChiffres): string {
  const mesures = rapport.verdicts;
  if (mesures.length === 0) return "Aucun chiffre à contrôler dans le texte.";

  const lignes = mesures.map((v) => {
    const tete = `  ${v.verdict === "conforme" ? "✓" : "✗"} [${v.regime}] ${v.ecrit.padEnd(12)} ${v.bloc}`;
    if (v.verdict === "conforme") {
      // Le régime A dit toujours contre quoi il a tranché : la date retenue et la valeur en
      // base. Un « ✓ » sans ces deux éléments ne se relit pas.
      const contre =
        v.regime === "A" && v.dateRetenue
          ? `${v.source} — base ${v.valeurBase} (${formaterDate(v.dateRetenue)})`
          : (v.source ?? "conforme");
      return `${tete} — ${contre}`;
    }
    return `${tete} — ${reproche(v)}`;
  });

  const a = mesures.filter((v) => v.regime === "A").length;
  const b = mesures.filter((v) => v.regime === "B").length;
  const fautifs = mesures.filter((v) => v.verdict !== "conforme").length;

  const entete = [
    `${mesures.length} chiffre(s) — régime A : ${a}, régime B : ${b}`,
    rapport.bloque ? `${fautifs} non conforme(s) — publication bloquée` : "tous conformes",
  ].join(" · ");

  // Une note entièrement en régime B est normale ; une note qui n'a *que* du régime B dit que
  // la collecte n'a rien apporté cette semaine. C'est une information sur les tuyaux, pas sur
  // la note, et elle n'a pas à bloquer quoi que ce soit.
  const remarque =
    a === 0 && b > 0
      ? ["", "  Aucun chiffre du régime A : la collecte n'a rien apporté à cette note."]
      : [];

  return [entete, ...lignes, ...remarque].join("\n");
}
