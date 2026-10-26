/**
 * Les gestes du portail et leur frise (4a) : un segment pour la phrase de régime, puis un par bloc
 * à valider. **L'état informe, il ne verrouille** : aucune fonction ici ne refuse un segment,
 * aucun n'est « inaccessible » parce qu'un autre n'est pas fait. Seule la publication est
 * conditionnée, ailleurs (`etatPublication`).
 */

export type Geste = {
  /** `regime`, ou le nom du bloc. */
  id: string;
  titre: string;
  /** L'emoji du bloc (`BLOCK_EMOJI`) ; la phrase de régime n'en a pas. */
  emoji: string | null;
  fait: boolean;
  /** Chiffres non conformes encore à trancher dans ce geste. */
  chiffres: number;
};

export type EtatSegment = "fait" | "en-cours" | "a-faire";

/** « En cours » : le geste ouvert, tant qu'il n'est pas fait. Un geste fait reste vert, ouvert ou non. */
export function etatSegment(geste: Geste, actifId: string | null): EtatSegment {
  if (geste.fait) return "fait";
  return geste.id === actifId ? "en-cours" : "a-faire";
}

const LIBELLE_ETAT: Record<EtatSegment, string> = {
  fait: "fait",
  "en-cours": "en cours",
  "a-faire": "à faire",
};

/** Le libellé lu par un lecteur d'écran : « Ce qui a changé, à faire, 7 chiffres à trancher ». */
export function libelleSegment(geste: Geste, actifId: string | null): string {
  const parties = [geste.titre, LIBELLE_ETAT[etatSegment(geste, actifId)]];
  if (geste.chiffres > 0) {
    parties.push(`${geste.chiffres} chiffre${geste.chiffres > 1 ? "s" : ""} à trancher`);
  }
  return parties.join(", ");
}

/** Le premier geste pas encore fait — celui qu'on propose d'ouvrir, jamais celui qu'on impose. */
export function premierAFaire(gestes: Geste[]): Geste | null {
  return gestes.find((g) => !g.fait) ?? null;
}

/**
 * Le geste d'à côté, **sans condition** : « Suivant » mène au segment suivant même s'il reste des
 * choses à faire dans le courant. Aux extrémités, `null`.
 */
export function voisin(gestes: Geste[], id: string, sens: 1 | -1): Geste | null {
  const i = gestes.findIndex((g) => g.id === id);
  if (i < 0) return null;
  return gestes[i + sens] ?? null;
}

/** Les chiffres non conformes et pas encore gardés, par geste. */
export function chiffresParGeste(
  verdicts: Array<{ bloc: string; verdict: string; garde?: boolean }>,
  ids: string[],
): Record<string, number> {
  const compte: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const v of verdicts) {
    if (v.verdict === "conforme" || v.garde) continue;
    // La phrase de régime retenue est contrôlée sous `regimeStatement` ; les trois propositions,
    // sous `regimeStatement/<angle>`, ne bloquent pas et ne comptent pas ici.
    const id = v.bloc === "regimeStatement" ? "regime" : v.bloc;
    if (id in compte) compte[id] += 1;
  }
  return compte;
}
