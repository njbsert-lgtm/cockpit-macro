import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseNote, type ParsedNote } from "@/lib/notes";
import { BROUILLONS_DIR } from "./run";
import { chargerEtatBrouillon, type EtatBrouillon } from "./persistence";
import { chargerDecisions } from "./decisions-store";
import { decisionsVides, type Decisions } from "./publication";
import type { Brouillon } from "./schema";
import type { ContextePaquet } from "./context";

/**
 * L'état complet qu'une page `/redaction/[slug]` a besoin d'afficher : la note telle qu'écrite
 * sur le disque, ce que le modèle a proposé (pour les révisions et le contrôle des chiffres),
 * et les décisions déjà prises dans le portail.
 */
export type EtatPortail = {
  note: ParsedNote;
  brouillonPropose: Brouillon;
  paquet: ContextePaquet;
  decisions: Decisions;
};

/**
 * `null` signifie « rien à réviser » — le fichier n'existe pas, ou son état n'a pas été
 * persisté (Supabase absent au moment du run, ou run antérieur à cette fonctionnalité). Dans
 * les deux cas le portail n'a rien de fiable à présenter : il vaut mieux le dire que d'afficher
 * une page à moitié renseignée.
 */
export async function chargerPortail(
  slug: string,
  dossier: string = BROUILLONS_DIR,
): Promise<EtatPortail | null> {
  const fichier = path.join(dossier, `${slug}.mdx`);
  if (!existsSync(fichier)) return null;

  const source = readFileSync(fichier, "utf-8");
  const note = parseNote(slug, source);

  const etat: EtatBrouillon | null = await chargerEtatBrouillon(slug);
  if (!etat) return null;

  const decisions = await chargerDecisions(slug);

  return { note, brouillonPropose: etat.brouillon, paquet: etat.paquet, decisions };
}

/** Les slugs de brouillons présents sur le disque, pour lister `/redaction`. */
export function brouillonsDisponibles(dossier: string = BROUILLONS_DIR): string[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.slice(0, -".mdx".length))
    .sort()
    .reverse();
}

export { decisionsVides };
