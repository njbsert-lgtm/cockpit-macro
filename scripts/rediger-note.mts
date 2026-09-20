/**
 * Rédaction d'un brouillon de note.
 *
 *   npm run note:draft -- --dry-run
 *   npm run note:draft -- --week=2026-S33 --dry-run
 *
 * `--dry-run` construit le paquet, appelle le modèle, passe le contrôle des chiffres et
 * affiche le MDX **sans rien écrire**. C'est ce qui permet d'itérer sur le prompt sans
 * polluer le dépôt.
 *
 * `--week=` rejoue une semaine passée : le seul moyen honnête d'évaluer le pipeline est de lui
 * faire rédiger une semaine dont on connaît déjà la bonne réponse, et de comparer.
 *
 * Ne publie jamais. Le brouillon produit porte `status: brouillon` et vit dans
 * `content/brouillons/`, hors du corpus validé.
 */
import { getAnthropicTexteCaller } from "../lib/anthropic";
import { getNotes, getNoteBody, getDrivers } from "../lib/content";
import { readNoteSources, extractBlockText, BLOCK_NAMES } from "../lib/notes";
import { getTrends, getScenarioVersions } from "../lib/content";
import { construireContexte, type ObservationContexte } from "../lib/redaction/context";
import { construireObservationsDepuis, type EntreeObservable } from "../lib/redaction/observations";
import { executerRun } from "../lib/redaction/run";
import { rendreRapport } from "../lib/redaction/figures";
import { isoWeekBounds } from "../lib/iso-week";
import { getPendingVeilleItems } from "../lib/veille/queries";
import {
  loadObservations,
  loadMacroObservations,
  isInstrumentCovered,
  isMacroCovered,
} from "../lib/observations";
import { getInstruments, getMacroIndicators } from "../lib/data";
import { chercherFiche, configNotion, marquerLue } from "../lib/notion";
import { isoWeekOf } from "../lib/iso-week";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const semaine = args.find((a) => a.startsWith("--week="))?.slice("--week=".length);

const caller = getAnthropicTexteCaller();
if (!caller) {
  console.error("ANTHROPIC_API_KEY manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

// La date cible : le samedi de la semaine demandée, ou aujourd'hui.
const dateCible = semaine ? samediDe(semaine) : new Date().toISOString().slice(0, 10);

const notes = getNotes();
const precedente = [...notes]
  .filter((n) => n.kind === "hebdo" && n.date < dateCible)
  .sort((a, b) => a.date.localeCompare(b.date))
  .at(-1) ?? null;

const blocsPrecedents: Record<string, string> = {};
if (precedente) {
  const corps = getNoteBody(precedente.slug) ?? "";
  for (const bloc of BLOCK_NAMES) {
    const texte = extractBlockText(corps, bloc);
    if (texte) blocsPrecedents[bloc] = texte;
  }
}

const observations = await construireObservations();
const itemsVeille = await getPendingVeilleItems().catch(() => []);
const fiche = await recupererFiche(isoWeekOf(dateCible));

const paquet = construireContexte({
  kind: "hebdo",
  dateCible,
  notes,
  notePrecedente: precedente,
  blocsPrecedents,
  ficheNotion: fiche,
  observations,
  drivers: getDrivers(),
  itemsVeille,
  scenariosCourants: getScenarioVersions(),
  tendancesCourantes: getTrends(),
});

console.log(`Note ${paquet.slug} · ${paquet.date} · se compare à ${paquet.comparesTo ?? "rien"}`);
console.log(
  `${observations.length} observation(s), ${itemsVeille.length} item(s) de veille, ` +
    `${paquet.guetsOuverts.length + paquet.guetsExpires.length} guet(s) remonté(s), ` +
    `budget ${paquet.budgetGuets}`,
);
console.log(dryRun ? "\nMode dry-run : rien ne sera écrit.\n" : "");

const resultat = await executerRun(paquet, caller, {
  dryRun,
  sourcesExistantes: readNoteSources(),
});

if (resultat.rapportChiffres) {
  console.log("--- contrôle des chiffres ---");
  console.log(rendreRapport(resultat.rapportChiffres));
}

if (!resultat.structureValide) {
  console.log(`\n--- réponse refusée ---\n${resultat.raisonStructure}`);
}
if (resultat.notes) console.log(`\n--- notes du run ---\n${resultat.notes}`);

if (resultat.mdx === null) {
  // La réponse n'a jamais pu être lue : il n'y a pas de note à montrer, seulement la sortie
  // brute archivée. Afficher un « null » ici ferait croire à une note vide.
  console.log(
    dryRun
      ? "\nAucun brouillon : la réponse du modèle n'a pas pu être lue, réparation comprise."
      : `\nAucun brouillon. Sortie brute archivée : ${resultat.ecrit}`,
  );
} else if (dryRun) {
  console.log(`\n--- MDX (non écrit) ---\n${resultat.mdx}`);
} else {
  console.log(`\nBrouillon écrit : ${resultat.ecrit}`);
}

console.log(
  `\n${resultat.publiable ? "Publiable depuis /redaction." : "Non publiable en l'état."} ` +
    `Tokens : ${resultat.usage.input} entrée / ${resultat.usage.output} sortie.`,
);

// La bascule de `Lue` vient **après** une génération réussie, jamais avant : une fiche marquée
// lue par un run qui a échoué serait invisible au run suivant. Le dry-run n'y touche pas non
// plus — il ne doit rien laisser derrière lui, pas même dans Notion.
if (fiche && !dryRun && resultat.mdx !== null) {
  const config = configNotion();
  if (config) {
    const bascule = await marquerLue(fiche.pageId, config);
    console.log(
      bascule.ok
        ? "Fiche marquée « Lue » dans Notion."
        : `Fiche non marquée « Lue » (${bascule.erreur}) — sans conséquence sur le brouillon.`,
    );
  }
}

process.exit(0);

/**
 * La fiche de la semaine, ou `null`. Aucun cas n'est fatal : sans fiche, le modèle écrit une
 * note courte qui le dit — c'est la règle de suffisance, et elle vaut mieux qu'un run avorté.
 * Les trois issues sont journalisées distinctement, parce qu'elles appellent des gestes
 * différents : un incident d'appel se réessaie, une base vide est presque toujours le partage
 * oublié, une semaine sans fiche est une information éditoriale.
 */
async function recupererFiche(isoWeek: string) {
  const config = configNotion();
  if (!config) {
    console.log("Notion non configuré (NOTION_TOKEN, NOTION_VUES_MACRO_DB) — rédaction sans fiche.");
    return null;
  }

  const resultat = await chercherFiche(isoWeek, config);
  if (!resultat.ok) {
    console.log(`Fiche Notion injoignable : ${resultat.erreur} — rédaction sans fiche.`);
    return null;
  }
  if (!resultat.fiche) {
    console.log(`Pas de fiche : ${resultat.raison}.`);
    return null;
  }

  console.log(
    `Fiche « ${resultat.fiche.semaine} » — ${resultat.fiche.contenu.length} caractères, ` +
      `${resultat.fiche.sources.length} émetteur(s) cité(s).`,
  );
  return resultat.fiche;
}

// ---------------------------------------------------------------------------

function samediDe(isoWeek: string): string {
  const { debut } = isoWeekBounds(isoWeek);
  const d = new Date(`${debut}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 5); // lundi + 5 = samedi
  return d.toISOString().slice(0, 10);
}

/**
 * Les observations mises en forme pour le paquet — instruments de marché **et** indicateurs
 * macro. Les deux passent par `construireObservationsDepuis` (`lib/redaction/observations.ts`),
 * filtrés par `isInstrumentCovered`/`isMacroCovered` : une entrée restée au seed (jamais
 * collectée) ne doit jamais entrer dans le paquet avec une valeur figée que le contrôle des
 * chiffres validerait comme si elle était réelle.
 *
 * Les indicateurs macro y ont leur place au même titre que les instruments — c'est ce qui
 * permet à une note de savoir qu'un taux directeur a bougé, et de proposer une révision de
 * scénario en conséquence (voir `Driver.macroRefs`, exposé au modèle dans le prompt).
 */
async function construireObservations(): Promise<ObservationContexte[]> {
  const instruments = getInstruments();
  const indicateurs = getMacroIndicators();

  const [bySeriesInstruments, bySeriesMacro] = await Promise.all([
    loadObservations(instruments.map((i) => i.id)),
    loadMacroObservations(indicateurs.map((i) => i.id)),
  ]);

  const entreesInstruments: EntreeObservable[] = instruments.map((i) => ({
    id: i.id,
    label: i.label,
    unit: i.unit,
    cadence: "business-daily",
    ytdBasis: i.ytdBasis,
  }));

  const entreesMacro: EntreeObservable[] = indicateurs.map((i) => ({
    id: i.id,
    label: i.label,
    unit: i.unit,
    cadence: i.frequency,
    ytdBasis: null,
  }));

  return [
    ...construireObservationsDepuis(entreesInstruments, bySeriesInstruments, dateCible, isInstrumentCovered),
    ...construireObservationsDepuis(entreesMacro, bySeriesMacro, dateCible, isMacroCovered),
  ];
}
