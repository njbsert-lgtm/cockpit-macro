import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { TexteCaller } from "@/lib/anthropic";
import { REDACTION_MODEL } from "@/config/ai-models";
import type { ContextePaquet } from "./context";
import { construireVivier, type Brouillon } from "./schema";
import { construirePromptSysteme, construirePromptUtilisateur } from "./prompt";
import { recevoir } from "./reception";
import { blocsARediger, rendreMdx, type BrouillonRendu } from "./mdx";
import { controlerChiffres, rendreRapport, type RapportChiffres } from "./figures";
import { validerBrouillon, type GrapheInjecte } from "./validate";
import { sauvegarderEtatBrouillon } from "./persistence";

/** Les brouillons vivent hors du corpus validé — voir le cahier, § Le cycle hebdomadaire. */
export const BROUILLONS_DIR = path.join(process.cwd(), "content", "brouillons");

export type ResultatRun = {
  slug: string;
  /** `null` quand la réponse n'a jamais pu être lue : il n'y a alors pas de note à montrer. */
  mdx: string | null;
  rapportChiffres: RapportChiffres | null;
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
  /** Une seule tentative de réparation est permise sur un rejet. */
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
   * La persistance de l'état en base, injectable pour les tests — même rôle que le `Fetcher`
   * de `lib/ingest.ts`. Best-effort dans l'implémentation par défaut : Supabase absent ne doit
   * jamais faire échouer un run.
   */
  persisterEtat?: typeof sauvegarderEtatBrouillon;
  /** Le dossier où écrire le brouillon — injectable pour ne pas polluer le dépôt en test. */
  dossierBrouillons?: string;
};

/**
 * Un run de rédaction, du paquet au fichier.
 *
 * Deux garde-fous, tous deux bloquants, tous deux **non fatals** : un brouillon qui échoue est
 * écrit quand même, avec son rapport. Un brouillon bloqué est plus utile qu'un silence — il
 * dit qu'il y a un problème de données à regarder. Ce qu'il ne fait jamais, c'est se publier.
 *
 * Deux rejets possibles, à deux moments, et une seule réparation pour les deux :
 * - **à la réception**, quand la réponse ne respecte pas le contrat de sortie (section JSON
 *   absente, référence hors vivier, bloc manquant) — `reception.ts` ;
 * - **à la validation**, quand le fichier reconstruit ne passe pas `parseNote` ou l'intégrité
 *   du graphe — `validate.ts`.
 *
 * Les deux produisent un message écrit en français qui explique *pourquoi* la règle existe :
 * ce sont d'excellents prompts de réparation tels quels. Un second rejet n'est pas retenté —
 * on écrit ce qu'on a, avec sa raison, plutôt que de boucler.
 */
export async function executerRun(
  paquet: ContextePaquet,
  caller: TexteCaller,
  options: OptionsRun = {},
): Promise<ResultatRun> {
  const aujourdhui = options.aujourdhui ?? new Date().toISOString().slice(0, 10);
  const blocs = blocsARediger(paquet);
  const vivier = construireVivier(paquet, blocs);
  const system = construirePromptSysteme(blocs, vivier.driverIds);
  const user = construirePromptUtilisateur(paquet, blocs);

  const notes: string[] = [];
  const usage = { input: 0, output: 0 };

  const appeler = async (messages: Parameters<TexteCaller>[0]["messages"]) => {
    const reponse = await caller({ system, messages, model: REDACTION_MODEL, effort: "high" });
    usage.input += reponse.usage.input;
    usage.output += reponse.usage.output;
    return reponse.texte;
  };

  let brut = await appeler([{ role: "user", content: user }]);
  let issue = eprouver(brut, paquet, vivier, aujourdhui, options);

  if (!issue.ok && options.reparer !== false) {
    notes.push(`Première tentative rejetée : ${issue.raison}`);
    brut = await appeler([
      { role: "user", content: user },
      { role: "assistant", content: brut },
      {
        role: "user",
        content:
          `La validation de ta réponse a échoué :\n\n${issue.raison}\n\n` +
          "Réémets la réponse entière — le MDX puis la section JSON — corrigée sur ce seul point. " +
          "Ne change rien d'autre.",
      },
    ]);
    issue = eprouver(brut, paquet, vivier, aujourdhui, options);
    if (!issue.ok) notes.push(`Réparation rejetée à son tour : ${issue.raison}`);
  }

  // La réponse n'a jamais pu être lue : il n'y a pas de brouillon à écrire, seulement la sortie
  // brute et sa raison. C'est plus utile qu'un silence — on voit ce que le modèle a produit.
  if (!issue.ok && !issue.brouillon) {
    const ecrit =
      options.dryRun === true
        ? null
        : ecrireEchec(paquet.slug, brut, issue.raison, options.dossierBrouillons);
    return {
      slug: paquet.slug,
      mdx: null,
      rapportChiffres: null,
      structureValide: false,
      raisonStructure: issue.raison,
      publiable: false,
      ecrit,
      usage,
      notes: notes.join("\n"),
    };
  }

  const brouillon = issue.brouillon;
  const rendu = issue.rendu;

  const rapportChiffres = controlerChiffres(brouillon, paquet);
  if (rapportChiffres.bloque) {
    notes.push("Contrôle des chiffres bloquant — publication indisponible depuis le portail.");
  }
  if (brouillon.driverCandidate) {
    notes.push(`Driver candidat signalé : ${brouillon.driverCandidate}`);
  }
  if (brouillon.redactionNotes) notes.push(brouillon.redactionNotes);

  const ecrit =
    options.dryRun === true
      ? null
      : ecrireBrouillon(rendu.slug, rendu.mdx, rapportChiffres, options.dossierBrouillons);

  if (ecrit) {
    const persister = options.persisterEtat ?? sauvegarderEtatBrouillon;
    const persistance = await persister(rendu.slug, paquet, brouillon);
    if (!persistance.ok) {
      notes.push(
        `État du brouillon non persisté (${persistance.erreur}) — le re-contrôle des chiffres ` +
          "et les propositions seront indisponibles dans le portail pour cette note.",
      );
    }
  }

  return {
    slug: rendu.slug,
    mdx: rendu.mdx,
    rapportChiffres,
    structureValide: issue.ok,
    raisonStructure: issue.ok ? null : issue.raison,
    publiable: issue.ok && !rapportChiffres.bloque,
    ecrit,
    usage,
    notes: notes.join("\n"),
  };
}

type Issue =
  | { ok: true; brouillon: Brouillon; rendu: BrouillonRendu }
  | { ok: false; raison: string; brouillon: Brouillon; rendu: BrouillonRendu }
  | { ok: false; raison: string; brouillon: null; rendu: null };

/**
 * Réception puis validation, d'un seul tenant : ce sont les deux façons dont une réponse peut
 * être refusée, et l'appelant n'a pas à les distinguer pour décider de réparer.
 *
 * La différence apparaît seulement à l'échec : une réponse rejetée **à la réception** n'a pas
 * de brouillon du tout, alors qu'une réponse rejetée **à la validation** en a un — fautif, mais
 * lisible, et c'est celui-là qu'on écrit sur le disque avec sa raison.
 */
function eprouver(
  brut: string,
  paquet: ContextePaquet,
  vivier: ReturnType<typeof construireVivier>,
  aujourdhui: string,
  options: OptionsRun,
): Issue {
  const recu = recevoir(brut, vivier);
  if (!recu.ok) return { ok: false, raison: recu.raison, brouillon: null, rendu: null };

  const rendu = rendreMdx(recu.brouillon, paquet, aujourdhui);
  const validation = validerBrouillon({
    slug: rendu.slug,
    mdx: rendu.mdx,
    sourcesExistantes: options.sourcesExistantes,
    graphe: options.graphe,
  });

  return validation.ok
    ? { ok: true, brouillon: recu.brouillon, rendu }
    : { ok: false, raison: validation.raison, brouillon: recu.brouillon, rendu };
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

/**
 * Une réponse illisible est archivée telle quelle, avec la raison en tête.
 *
 * Extension `.txt` et non `.mdx` : ce n'est pas une note, même dégradée, et un fichier que le
 * portail tenterait de lire comme une note ferait échouer l'écran au lieu de montrer l'échec.
 */
export function ecrireEchec(
  slug: string,
  brut: string,
  raison: string,
  dossier = BROUILLONS_DIR,
): string {
  mkdirSync(dossier, { recursive: true });
  const chemin = path.join(dossier, `${slug}.echec.txt`);
  writeFileSync(
    chemin,
    `Réponse du modèle rejetée, réparation comprise.\n\nRaison : ${raison}\n\n---\n\n${brut}\n`,
    "utf8",
  );
  return chemin;
}
