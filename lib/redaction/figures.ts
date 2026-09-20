import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

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
 * stockée, à la tolérance d'arrondi près. Sans exception : si la fiche cite un Brent à 104 $ et
 * que la base a 102,96 $, la note affiche la valeur de la base. L'application a sa propre
 * source pour cet instrument, c'est elle qui fait foi.
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
  /** La valeur que la note devrait porter, sur un écart de régime A. */
  attendu: string | null;
};

/**
 * Cinq issues plutôt que deux. Une note bloquée doit dire *pourquoi* : « introuvable » et
 * « écarte de 1 % de la valeur en base » appellent deux gestes différents, et un rapport qui
 * les confond fait chercher au mauvais endroit.
 */
export type VerdictNom =
  | "conforme"
  /** Régime A : un instrument nommé dans la phrase, mais une valeur qui n'est pas la nôtre. */
  | "ecart"
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
 */
function estNeutre(brut: string, valeur: number): boolean {
  if (/^\d{4}$/.test(brut) && valeur >= 1900 && valeur <= 2200) return true; // une année
  if (Number.isInteger(valeur) && Math.abs(valeur) <= 12) return true; // un rang, un compte
  return false;
}

function normaliser(brut: string): number {
  return Number(brut.replace(/[   ]/g, "").replace(",", "."));
}

/**
 * La tolérance est celle de l'arrondi, pas une marge libre : un nombre écrit avec une
 * décimale est comparé à 0,05 près, avec deux décimales à 0,005 près. Écrire « 3,4 » pour
 * 3,42 est correct ; écrire « 3,5 » ne l'est pas.
 */
function toleranceDe(brut: string): number {
  const decimales = brut.includes(",") ? brut.split(",")[1].length : 0;
  return 0.5 * 10 ** -decimales;
}

type ValeurAdmise = { valeur: number; source: string; instrumentId: string };

/** Les valeurs d'une observation : ses relevés et ses variations. */
function valeursDe(obs: ObservationContexte): ValeurAdmise[] {
  const admises: ValeurAdmise[] = [];
  for (const v of obs.valeurs) {
    admises.push({ valeur: v.value, source: `${obs.instrumentId} au ${v.date}`, instrumentId: obs.instrumentId });
  }
  if (obs.variationSemaine !== null) {
    admises.push({
      valeur: obs.variationSemaine,
      source: `${obs.instrumentId} — var. semaine`,
      instrumentId: obs.instrumentId,
    });
  }
  if (obs.variationYTD !== null) {
    admises.push({
      valeur: obs.variationYTD,
      source: `${obs.instrumentId} — var. YTD`,
      instrumentId: obs.instrumentId,
    });
  }
  return admises;
}

/** Toutes les valeurs que le paquet autorise à citer, avec leur provenance. */
function valeursAdmises(paquet: ContextePaquet): ValeurAdmise[] {
  return paquet.observations.flatMap(valeursDe);
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
  const admises = valeursAdmises(paquet);
  const fiche = paquet.ficheNotion;
  const verdicts: VerdictChiffre[] = [];

  for (const [bloc, texte] of aControler) {
    for (const phrase of phrases(texte)) {
      const nommes = instrumentsNommes(phrase, paquet);
      const admisesDeLaPhrase = nommes.flatMap(valeursDe);

      for (const brut of phrase.match(NOMBRE) ?? []) {
        const ecrit = brut.trim();
        const valeur = normaliser(ecrit);
        if (!Number.isFinite(valeur)) continue;
        // Une année, un rang : rien à confronter, et les lister noierait les vrais chiffres.
        if (estNeutre(ecrit, valeur)) continue;

        const tolerance = toleranceDe(ecrit);
        const proche = (liste: ValeurAdmise[]) =>
          liste.find((a) => Math.abs(Math.abs(a.valeur) - Math.abs(valeur)) <= tolerance);

        // Régime A, d'abord sur les instruments nommés dans la phrase : c'est là que l'écart
        // se détecte. Un Brent à 104 dans une phrase qui dit « Brent » n'a pas le droit de
        // repartir en régime B sous prétexte que la fiche l'écrit — la base fait foi.
        if (admisesDeLaPhrase.length > 0) {
          const trouve = proche(admisesDeLaPhrase);
          if (trouve) {
            verdicts.push({ ecrit, valeur, bloc, regime: "A", source: trouve.source, verdict: "conforme", attendu: null });
            continue;
          }

          const plusProche = [...admisesDeLaPhrase].sort(
            (a, b) => Math.abs(Math.abs(a.valeur) - Math.abs(valeur)) - Math.abs(Math.abs(b.valeur) - Math.abs(valeur)),
          )[0];
          verdicts.push({
            ecrit,
            valeur,
            bloc,
            regime: "A",
            source: plusProche.source,
            verdict: "ecart",
            attendu: String(plusProche.valeur).replace(".", ","),
          });
          continue;
        }

        // Régime A « au large » : la phrase ne nomme pas l'instrument, mais le nombre est une
        // valeur que nous avons collectée. Il n'est pas inventé, et la base en est la source.
        const rattache = proche(admises);
        if (rattache) {
          verdicts.push({ ecrit, valeur, bloc, regime: "A", source: rattache.source, verdict: "conforme", attendu: null });
          continue;
        }

        // Régime B. Sans fiche, il n'y a pas de texte source où retrouver le nombre : il ne
        // reste que « introuvable », ce qui est l'ancienne règle et reste juste.
        if (!fiche || !litteralementDansLaFiche(ecrit, fiche.contenu)) {
          verdicts.push({ ecrit, valeur, bloc, regime: "B", source: null, verdict: "introuvable", attendu: null });
          continue;
        }

        const emetteur = attributionDans(phrase, fiche.sources);
        verdicts.push({
          ecrit,
          valeur,
          bloc,
          regime: "B",
          source: emetteur,
          verdict: emetteur ? "conforme" : "sans-attribution",
          attendu: null,
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
 * faux en en-tête de note est au moins aussi visible qu'un chiffre faux dans le corps.
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

/** Le rapport en texte, pour le résumé du run et pour le portail. */
export function rendreRapport(rapport: RapportChiffres): string {
  const mesures = rapport.verdicts;
  if (mesures.length === 0) return "Aucun chiffre à contrôler dans le texte.";

  const lignes = mesures.map((v) => {
    const tete = `  ${v.verdict === "conforme" ? "✓" : "✗"} [${v.regime}] ${v.ecrit.padEnd(12)} ${v.bloc}`;
    switch (v.verdict) {
      case "conforme":
        return `${tete} — ${v.source ?? "conforme"}`;
      case "ecart":
        return `${tete} — écart : la base porte ${v.attendu} (${v.source})`;
      case "sans-attribution":
        return `${tete} — dans la fiche, mais aucun émetteur nommé dans la phrase`;
      default:
        return `${tete} — ni en base, ni littéralement dans la fiche`;
    }
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
