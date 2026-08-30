#!/usr/bin/env tsx
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chargerPortail } from "../lib/redaction/portail";
import { etatPublication } from "../lib/redaction/etat-publication";
import { construireArtefactsPublication } from "../lib/redaction/publication";
import { BROUILLONS_DIR } from "../lib/redaction/run";
import { assembleContent } from "../lib/content-assembly";
import { parseNote, readNoteSources } from "../lib/notes";
import { getInstruments } from "../lib/data";
import { DRIVERS } from "../content/drivers";
import { TRENDS } from "../content/tendances";
import { SCENARIO_VERSIONS } from "../content/scenarios";
import { OUTLOOKS } from "../content/outlooks";
import { GENERATED_SCENARIO_VERSIONS } from "../content/generated/scenarios.generated";
import { GENERATED_TREND_DELTAS } from "../content/generated/tendances.generated";

/**
 * Le point d'entrée de `publier-note.yml`, déclenché par le portail via `workflow_dispatch`.
 *
 * Recharge tout depuis Supabase et le disque — jamais ce que le navigateur a pu transmettre au
 * moment du clic : entre l'affichage de la page et l'exécution de ce script, une décision a pu
 * changer sur un autre onglet. C'est ici, et seulement ici, que le git commit a lieu — le
 * portail lui-même n'écrit jamais dans le dépôt (voir `lib/redaction/github-dispatch.ts`).
 *
 * Le calcul — MDX final, deltas de scénario et de tendance — vit dans
 * `construireArtefactsPublication` (`lib/redaction/publication.ts`), pur et testable sans
 * système de fichiers. Ce script ne fait que le disque et la validation finale contre le
 * corpus réel.
 */

const NOTES_DIR = path.join(process.cwd(), "content", "notes");
const GENERATED_DIR = path.join(process.cwd(), "content", "generated");

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

function ecrireGenere(fichier: string, type: string, nomExporte: string, valeurs: unknown[]): void {
  const contenu =
    `import type { ${type} } from "@/lib/types";\n\n` +
    "/**\n" +
    " * Réécrit intégralement à chaque publication depuis /redaction — ne pas éditer à la\n" +
    " * main, voir content/generated/README.md.\n" +
    " */\n" +
    `export const ${nomExporte}: ${type}[] = ${JSON.stringify(valeurs, null, 2)};\n`;
  writeFileSync(path.join(GENERATED_DIR, fichier), contenu, "utf8");
}

async function main(): Promise<void> {
  const slug =
    process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length) ?? process.env.SLUG;
  if (!slug) {
    console.error("Usage : publier-note.mts --slug=2026-S36 (ou variable d'environnement SLUG)");
    process.exit(1);
  }

  const portail = await chargerPortail(slug);
  if (!portail) {
    console.error(`Aucun brouillon chargeable pour « ${slug} » — rien n'a été publié.`);
    process.exit(1);
  }
  const { note, brouillonPropose, paquet, decisions } = portail;

  const publication = etatPublication(note, brouillonPropose, decisions, paquet);
  if (!publication.pret) {
    console.error(`Conditions de publication non réunies pour « ${slug} » :`);
    for (const m of publication.manquantes) console.error(`  - ${m.message}`);
    if (publication.rapportChiffres.bloque) {
      console.error("  - un chiffre reste introuvable dans un bloc non relu");
    }
    process.exit(1);
  }

  const artefacts = construireArtefactsPublication(
    note,
    brouillonPropose,
    paquet,
    decisions,
    aujourdhui(),
  );

  const scenariosGeneres = [...GENERATED_SCENARIO_VERSIONS, ...artefacts.scenariosGeneres];
  const tendancesGenerees = [...GENERATED_TREND_DELTAS, ...artefacts.tendancesGenerees];

  // Le même corps de règles que l'application, avec la note et ses deltas ajoutés en mémoire —
  // c'est la seule façon de savoir si ce qu'on s'apprête à écrire serait valide une fois publié.
  const existantes = readNoteSources();
  try {
    parseNote(artefacts.note.slug, artefacts.note.mdx);
    assembleContent({
      noteSources: [...existantes, { slug: artefacts.note.slug, source: artefacts.note.mdx }],
      drivers: DRIVERS,
      trends: TRENDS,
      scenarios: SCENARIO_VERSIONS,
      outlooks: OUTLOOKS,
      generated: { scenarios: scenariosGeneres, trendDeltas: tendancesGenerees },
      instrumentIds: new Set(getInstruments().map((i) => i.id)),
    });
  } catch (erreur) {
    console.error(
      `Publication refusée — le corpus ne validerait plus : ${(erreur as Error).message}`,
    );
    process.exit(1);
  }

  mkdirSync(NOTES_DIR, { recursive: true });
  writeFileSync(path.join(NOTES_DIR, `${artefacts.note.slug}.mdx`), artefacts.note.mdx, "utf8");
  mkdirSync(GENERATED_DIR, { recursive: true });
  ecrireGenere(
    "scenarios.generated.ts",
    "ScenarioVersion",
    "GENERATED_SCENARIO_VERSIONS",
    scenariosGeneres,
  );
  ecrireGenere("tendances.generated.ts", "TrendDelta", "GENERATED_TREND_DELTAS", tendancesGenerees);

  const brouillonMdx = path.join(BROUILLONS_DIR, `${slug}.mdx`);
  const brouillonRapport = path.join(BROUILLONS_DIR, `${slug}.chiffres.txt`);
  if (existsSync(brouillonMdx)) rmSync(brouillonMdx);
  if (existsSync(brouillonRapport)) rmSync(brouillonRapport);

  console.log(`Note « ${artefacts.note.slug} » publiée. Prête pour le commit.`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
