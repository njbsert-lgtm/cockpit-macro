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
import { getAnthropicCaller } from "../lib/anthropic";
import { getNotes, getNoteBody } from "../lib/content";
import { readNoteSources, extractBlockText, BLOCK_NAMES } from "../lib/notes";
import { getTrends, getScenarioVersions } from "../lib/content";
import { construireContexte, type ObservationContexte } from "../lib/redaction/context";
import { executerRun } from "../lib/redaction/run";
import { rendreRapport } from "../lib/redaction/figures";
import { isoWeekBounds } from "../lib/iso-week";
import { getPendingVeilleItems } from "../lib/veille/queries";
import { loadObservations, observationsOf } from "../lib/observations";
import { getInstruments } from "../lib/data";
import { dailyChange, ytdChange, latestObservation } from "../lib/performance";
import { publicationDelay } from "../lib/staleness";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const semaine = args.find((a) => a.startsWith("--week="))?.slice("--week=".length);

const caller = getAnthropicCaller();
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

const paquet = construireContexte({
  kind: "hebdo",
  dateCible,
  notes,
  notePrecedente: precedente,
  blocsPrecedents,
  observations,
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

console.log("--- contrôle des chiffres ---");
console.log(rendreRapport(resultat.rapportChiffres));

if (!resultat.structureValide) {
  console.log(`\n--- structure refusée ---\n${resultat.raisonStructure}`);
}
if (resultat.notes) console.log(`\n--- notes du run ---\n${resultat.notes}`);

if (dryRun) {
  console.log(`\n--- MDX (non écrit) ---\n${resultat.mdx}`);
} else {
  console.log(`\nBrouillon écrit : ${resultat.ecrit}`);
}

console.log(
  `\n${resultat.publiable ? "Publiable depuis /redaction." : "Non publiable en l'état."} ` +
    `Tokens : ${resultat.usage.input} entrée / ${resultat.usage.output} sortie.`,
);

process.exit(0);

// ---------------------------------------------------------------------------

function samediDe(isoWeek: string): string {
  const { debut } = isoWeekBounds(isoWeek);
  const d = new Date(`${debut}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 5); // lundi + 5 = samedi
  return d.toISOString().slice(0, 10);
}

/**
 * Les observations mises en forme pour le paquet. La fraîcheur reprend le retard de
 * publication déjà calculé par `lib/staleness.ts` : c'est le même signal que l'interface
 * affiche, pas une seconde définition qui divergerait.
 */
async function construireObservations(): Promise<ObservationContexte[]> {
  const instruments = getInstruments();
  const bySeries = await loadObservations(instruments.map((i) => i.id));

  return instruments.flatMap((instrument) => {
    const obs = observationsOf(bySeries, instrument.id);
    if (obs.length === 0) return [];

    const derniere = latestObservation(obs);
    const retard = publicationDelay(
      derniere?.date ?? null,
      "business-daily",
      new Date(dateCible),
    );

    return [
      {
        instrumentId: instrument.id,
        label: instrument.label,
        unit: instrument.unit,
        // Les dix dernières clôtures suffisent : le modèle écrit une note hebdomadaire, pas
        // une analyse de série longue, et un paquet obèse dilue ce qui compte.
        valeurs: obs.slice(-10).map((o) => ({ date: o.date, value: o.value })),
        variationSemaine: dailyChange(obs)?.pct ?? null,
        variationYTD: ytdChange(instrument, obs)?.pct ?? null,
        fraicheur: retard === null ? "absent" : retard.late ? "retard" : "ok",
      },
    ];
  });
}
