import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StructuredCaller } from "@/lib/anthropic";
import type { ContextePaquet } from "./context";
import { construireSchema, construireVivier, type Brouillon } from "./schema";
import { SYSTEM_PROMPT, construirePromptUtilisateur } from "./prompt";
import { blocsARediger, rendreMdx, type BrouillonRendu } from "./mdx";
import { controlerChiffres, rendreRapport, type RapportChiffres } from "./figures";
import { validerBrouillon, type GrapheInjecte } from "./validate";
import { sauvegarderContexte } from "./persistence";

/** Les brouillons vivent hors du corpus validé — voir le cahier, § Le cycle hebdomadaire. */
export const BROUILLONS_DIR = path.join(process.cwd(), "content", "brouillons");

export type ResultatRun = {
  slug: string;
  mdx: string;
  rapportChiffres: RapportChiffres;
  /** Structurellement valide au sens de `parseNote` + `checkIntegrity`. */
  structureValide: boolean;
  raisonStructure: string | null;
  /** Vrai si le brouillon est publiable en l'état — informatif, la décision reste humaine. */
  publiable: boolean;
  ecrit: string | null;
  usage: { input: number; output: number };
  notes: string;
};

export type OptionsRun = {
  /** N'écrit rien sur le disque : construit, appelle, contrôle, rend. */
  dryRun?: boolean;
  /** Une seule tentative de réparation est permise sur un rejet structurel. */
  reparer?: boolean;
  aujourdhui?: string;
  /**
   * Les notes déjà sur le disque. Injectables pour que l'orchestrateur soit testable sans le
   * corpus réel — même principe que le `Fetcher` de `lib/ingest.ts`.
   */
  sourcesExistantes?: Array<{ slug: string; source: string }>;
  /** Le reste du graphe de contenu, pour la même raison. */
  graphe?: GrapheInjecte;
  /**
   * La persistance du paquet en base, injectable pour les tests — même rôle que le `Fetcher`
   * de `lib/ingest.ts`. Best-effort dans l'implémentation par défaut : Supabase absent ne doit
   * jamais faire échouer un run.
   */
  persisterContexte?: typeof sauvegarderContexte;
  /** Le dossier où écrire le brouillon — injectable pour ne pas polluer le dépôt en test. */
  dossierBrouillons?: string;
};

/**
 * Un run de rédaction, du paquet au fichier.
 *
 * Deux garde-fous, tous deux bloquants, tous deux **non fatals** : un brouillon qui échoue est
 * écrit quand même, avec son rapport. Un brouillon bloqué est plus utile qu'un silence — il
 * dit qu'il y a un problème de données à regarder. Ce qu'il ne fait jamais, c'est se publier.
 */
export async function executerRun(
  paquet: ContextePaquet,
  caller: StructuredCaller,
  options: OptionsRun = {},
): Promise<ResultatRun> {
  const aujourdhui = options.aujourdhui ?? new Date().toISOString().slice(0, 10);
  const blocs = blocsARediger(paquet);
  const vivier = construireVivier(paquet, blocs);
  const schema = construireSchema(paquet, vivier);
  const user = construirePromptUtilisateur(paquet, blocs);

  let reponse = await caller<Brouillon>({
    system: SYSTEM_PROMPT,
    user,
    schema: schema as never,
    effort: "high",
  });

  let rendu: BrouillonRendu = rendreMdx(reponse.value, paquet, aujourdhui);
  const valider = (r: BrouillonRendu) =>
    validerBrouillon({
      slug: r.slug,
      mdx: r.mdx,
      sourcesExistantes: options.sourcesExistantes,
      graphe: options.graphe,
    });

  let validation = valider(rendu);

  // Une seule réparation. Les messages de `lib/notes.ts` et `lib/integrity.ts` sont écrits en
  // français et expliquent *pourquoi* la règle existe : ce sont d'excellents prompts de
  // réparation tels quels. Un second rejet n'est pas retenté — on écrit le brouillon fautif
  // avec sa raison, plutôt que de boucler.
  const notes: string[] = [];
  if (!validation.ok && options.reparer !== false) {
    notes.push(`Première tentative rejetée : ${validation.raison}`);
    const reparation = await caller<Brouillon>({
      system: SYSTEM_PROMPT,
      user: `${user}\n\n---\n\n# Correction demandée\n\nLa version précédente a été rejetée par la validation :\n\n> ${validation.raison}\n\nCorrige **ce point seul** et réémets la note entière.`,
      schema: schema as never,
      effort: "high",
    });
    reponse = {
      value: reparation.value,
      usage: {
        input: reponse.usage.input + reparation.usage.input,
        output: reponse.usage.output + reparation.usage.output,
      },
    };
    rendu = rendreMdx(reponse.value, paquet, aujourdhui);
    validation = valider(rendu);
    if (!validation.ok) notes.push(`Réparation rejetée à son tour : ${validation.raison}`);
  }

  const rapportChiffres = controlerChiffres(reponse.value, paquet);
  if (rapportChiffres.bloque) {
    notes.push("Contrôle des chiffres bloquant — publication indisponible depuis le portail.");
  }
  if (reponse.value.driverCandidate) {
    notes.push(`Driver candidat signalé : ${reponse.value.driverCandidate}`);
  }
  if (reponse.value.redactionNotes) notes.push(reponse.value.redactionNotes);

  const ecrit =
    options.dryRun === true
      ? null
      : ecrireBrouillon(rendu.slug, rendu.mdx, rapportChiffres, options.dossierBrouillons);

  if (ecrit) {
    const persister = options.persisterContexte ?? sauvegarderContexte;
    const persistance = await persister(rendu.slug, paquet);
    if (!persistance.ok) {
      notes.push(
        `Paquet de contexte non persisté (${persistance.erreur}) — le re-contrôle des ` +
          "chiffres après édition dans le portail sera indisponible pour cette note.",
      );
    }
  }

  return {
    slug: rendu.slug,
    mdx: rendu.mdx,
    rapportChiffres,
    structureValide: validation.ok,
    raisonStructure: validation.ok ? null : validation.raison,
    publiable: validation.ok && !rapportChiffres.bloque,
    ecrit,
    usage: reponse.usage,
    notes: notes.join("\n"),
  };
}

/**
 * Écrit le brouillon et son rapport de contrôle côte à côte. Le rapport est un fichier séparé
 * plutôt qu'un champ du frontmatter : il n'a rien à faire dans la note une fois publiée.
 */
export function ecrireBrouillon(
  slug: string,
  mdx: string,
  rapport: RapportChiffres,
  dossier = BROUILLONS_DIR,
): string {
  mkdirSync(dossier, { recursive: true });
  const chemin = path.join(dossier, `${slug}.mdx`);
  writeFileSync(chemin, mdx, "utf8");
  writeFileSync(path.join(dossier, `${slug}.chiffres.txt`), rendreRapport(rapport), "utf8");
  return chemin;
}
