import { cleChiffre, reproche, type VerdictChiffre } from "./figures";

/**
 * La relecture d'un bloc dans la mise en page de la note (4b) : le texte brut du brouillon est
 * découpé en sous-titres et paragraphes, et chaque nombre non conforme y est repéré **dans sa
 * phrase** — pour être surligné et se laisser toucher. Pur : aucune lecture de disque, aucun rendu.
 *
 * Seuls les gras `**…**` sont interprétés ; les blocs 1 à 4 n'ont ni liste ni autre balisage
 * (ils sont refusés à la réception).
 */

export type SegmentTexte = {
  texte: string;
  gras: boolean;
  /** Présent quand ce segment est un nombre à trancher. */
  verdict?: VerdictChiffre;
  /** Rang du nombre dans le bloc, à partir de 1 — « 1 sur 7 dans ce bloc ». */
  rang?: number;
  /** Clé de la décision (`cleChiffre`) et reproche en clair : ce que la bulle affiche et soumet. */
  cle?: string;
  reproche?: string;
};

export type PartieDeBloc =
  | { type: "titre"; texte: string }
  | { type: "paragraphe"; segments: SegmentTexte[] };

export type BlocDecoupe = { parties: PartieDeBloc[]; surlignes: number };

function segmenter(
  brut: string,
  plages: Array<{ debut: number; fin: number; verdict: VerdictChiffre }>,
  rangDepart: number,
): { segments: SegmentTexte[]; suivant: number } {
  const parDebut = new Map(plages.map((p) => [p.debut, p]));
  const segments: SegmentTexte[] = [];
  let tampon = "";
  let gras = false;
  let rang = rangDepart;
  const vider = () => {
    if (tampon) segments.push({ texte: tampon, gras });
    tampon = "";
  };

  let pos = 0;
  while (pos < brut.length) {
    const plage = parDebut.get(pos);
    if (plage) {
      vider();
      segments.push({
        texte: brut.slice(plage.debut, plage.fin),
        gras,
        verdict: plage.verdict,
        rang,
        cle: cleChiffre(plage.verdict),
        reproche: reproche(plage.verdict),
      });
      rang += 1;
      pos = plage.fin;
    } else if (brut.startsWith("**", pos)) {
      vider();
      gras = !gras;
      pos += 2;
    } else {
      tampon += brut[pos];
      pos += 1;
    }
  }
  vider();
  return { segments, suivant: rang };
}

/**
 * `verdicts` : les nombres à surligner — non conformes et pas encore gardés, déjà filtrés sur le
 * bloc. Un nombre dont la phrase ne se retrouve pas dans le texte (texte modifié depuis) n'est pas
 * surligné, sans erreur : le portail ne montre que ce qu'il sait localiser.
 */
export function decouperBloc(texte: string, verdicts: VerdictChiffre[]): BlocDecoupe {
  const blocs = texte.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).filter((b) => b.trim());
  const parties: PartieDeBloc[] = [];
  let rang = 1;

  for (const bloc of blocs) {
    const titre = /^###\s+(.+)$/.exec(bloc.trim());
    if (titre) {
      parties.push({ type: "titre", texte: titre[1].trim() });
      continue;
    }
    const plages: Array<{ debut: number; fin: number; verdict: VerdictChiffre }> = [];
    for (const verdict of verdicts) {
      const i = bloc.indexOf(verdict.phrase);
      if (i < 0) continue;
      const j = verdict.phrase.indexOf(verdict.ecrit);
      if (j < 0) continue;
      const debut = i + j;
      const fin = debut + verdict.ecrit.length;
      if (plages.some((p) => debut < p.fin && fin > p.debut)) continue;
      plages.push({ debut, fin, verdict });
    }
    plages.sort((a, b) => a.debut - b.debut);
    const { segments, suivant } = segmenter(bloc, plages, rang);
    rang = suivant;
    parties.push({ type: "paragraphe", segments });
  }
  return { parties, surlignes: rang - 1 };
}
