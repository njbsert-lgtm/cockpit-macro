import type { BlockName } from "./note-blocks";
import { extractBlockSource } from "./notes";

/**
 * Les chiffres cités d'une note : dans le texte d'un bloc, une valeur que la note reprend parmi
 * ses chiffres clés devient touchable et ouvre la feuille de chiffre (valeur de la note, valeur du
 * jour). Le repérage est littéral — la valeur telle qu'écrite dans le frontmatter, « 5,1 % » —,
 * jamais une interprétation du texte : un chiffre qui ne s'y lit pas mot pour mot reste du texte.
 */

/** « 5,1 % au 15/10 » → « 5,1 % » ; « 29 950,82 pts au 14/10 (-2,02 % séance) » → « 29 950,82 pts ». */
export function valeurCitee(valeur: string): string | null {
  const net = valeur.split(/\s(?:au|le)\s+\d|\s\(/)[0].trim();
  return /\d/.test(net) ? net : null;
}

const ECHAPPER = /[.*+?^${}()|[\]\\]/g;

/**
 * Enveloppe chaque occurrence d'une valeur citée dans `<ChiffreCite i="n">…</ChiffreCite>`, hors
 * des sous-titres. Une occurrence collée à un autre chiffre (« 15,1 % » pour « 5,1 % ») n'est pas
 * reprise : elle désigne un autre nombre.
 */
export function balisageChiffresCites(body: string, valeurs: Array<string | null>): string {
  const motifs = valeurs
    .map((v, i) => ({ v, i }))
    .filter((m): m is { v: string; i: number } => m.v !== null && m.v.length > 0)
    // Les plus longues d'abord : « 3,75-4,00 % » avant « 4,00 % ».
    .sort((a, b) => b.v.length - a.v.length);
  if (motifs.length === 0) return body;

  const alternatives = motifs.map((m) => m.v.replace(ECHAPPER, "\\$&").replace(/ /g, "[\\s\\u00a0\\u202f]"));
  const re = new RegExp(`(?<![\\d,.])(${alternatives.join("|")})(?![\\d])`, "g");
  const normaliser = (t: string) => t.replace(/[\u00a0\u202f]/g, " ");

  return body
    .split("\n")
    .map((ligne) => {
      if (/^\s*#/.test(ligne) || /^\s*</.test(ligne)) return ligne;
      return ligne.replace(re, (trouve) => {
        const m = motifs.find((x) => x.v === normaliser(trouve));
        return m ? `<ChiffreCite i="${m.i}">${trouve}</ChiffreCite>` : trouve;
      });
    })
    .join("\n");
}

/** Le nombre de sujets (`###`) d'un bloc : le compteur de sa puce dans la barre d'ancres. */
export function sujetsDuBloc(body: string, bloc: BlockName): number {
  const source = extractBlockSource(body, bloc);
  return source ? (source.match(/^###\s/gm) ?? []).length : 0;
}
