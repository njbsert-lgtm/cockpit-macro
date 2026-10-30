import { Children, isValidElement, type ReactNode } from "react";
import type { GroupeMarcheVue, LigneMarcheVue, MouvementVue } from "./marches-vue";
import { SANS_LIEN } from "./marches-vue";

/**
 * Relit « Les marchés par driver » tel que le code l'a écrit (`rendreBlocMarches`,
 * `lib/redaction/marches-rendu.ts`) :
 *
 *   ### Taux directeurs
 *   - **US 10 ans** : +12 bps sur la semaine (du 23/10 au 30/10) ; cause : … (Émetteur).
 *   - **Or** : donnée absente au 30/10 ; Sans lien clair avec ce driver.
 *
 * Le MDX reste la source : le corps publié est du texte, pas une structure. Ce module le lit
 * pour le dessiner en tableau. Il ne devine rien — une ligne qu'il ne reconnaît pas fait revenir
 * le bloc au rendu en liste (`null`), plutôt qu'une ligne tronquée. Les causes gardent leurs
 * nœuds d'origine : un chiffre cité y reste touchable.
 */

const MOUVEMENT = /^([+−]?\d+(?:,\d+)?) (bps|%) sur la semaine \(du (\d{2}\/\d{2}) au (\d{2}\/\d{2})\)$/;
const CAUSE = /^cause : ([\s\S]+)$/;
const EMETTEUR_FINAL = /^([\s\S]*?) \(([^()]+)\)\.$/;
const SEPARATEUR = /^ : ([\s\S]*?) ; ([\s\S]*)$/;

function texteDe(noeud: ReactNode): string {
  if (typeof noeud === "string" || typeof noeud === "number") return String(noeud);
  if (Array.isArray(noeud)) return noeud.map(texteDe).join("");
  if (isValidElement<{ children?: ReactNode }>(noeud)) return texteDe(noeud.props.children);
  return "";
}

function lireMouvement(brut: string): MouvementVue | null {
  const m = MOUVEMENT.exec(brut);
  if (m) {
    const [, nombre, unite, du, au] = m;
    const sens = nombre.startsWith("+") ? "hausse" : nombre.startsWith("−") ? "baisse" : "plat";
    return { etat: "ok", texte: `${nombre} ${unite}`, sens, du, au };
  }
  if (brut === "non suivi" || /^donnée absente( au \d{2}\/\d{2})?$/.test(brut)) {
    return { etat: "indisponible", message: brut };
  }
  return null;
}

/** Une puce : `<strong>libellé</strong>` puis le texte. `null` si elle n'a pas la forme attendue. */
function lireLigne(noeuds: ReactNode[], cle: string): LigneMarcheVue | null {
  const [tete, ...suite] = noeuds;
  if (!isValidElement<{ children?: ReactNode }>(tete) || tete.type !== "strong") return null;
  const libelle = texteDe(tete.props.children).trim();
  if (!libelle) return null;

  // Le plus souvent, tout le mouvement tient dans le premier texte. Un chiffre clé enveloppé par
  // `<ChiffreCite>` le coupe : on lit alors le texte à plat (la cause y perd son enveloppe,
  // jamais sa lettre).
  const premier = typeof suite[0] === "string" ? suite[0] : null;
  const separe = premier ? SEPARATEUR.exec(premier) : null;
  const plat = suite.map(texteDe).join("");
  const lu = separe ?? SEPARATEUR.exec(plat);
  if (!lu) return null;
  const mouvement = lireMouvement(lu[1]);
  if (!mouvement) return null;

  if (lu[2].trim() === `${SANS_LIEN}.`) {
    return { cle, libelle, mouvement, cause: null, emetteur: null };
  }

  const noeudsCause: ReactNode[] = separe ? [separe[2], ...suite.slice(1)] : [lu[2]];
  const dernier = noeudsCause[noeudsCause.length - 1];
  const debut = noeudsCause[0];
  if (typeof dernier !== "string" || typeof debut !== "string") return null;
  const fin = EMETTEUR_FINAL.exec(dernier);
  if (!fin) return null;
  noeudsCause[noeudsCause.length - 1] = fin[1];
  const dedans = CAUSE.exec(noeudsCause[0] as string);
  if (!dedans) return null;
  noeudsCause[0] = dedans[1];
  const cause: ReactNode = noeudsCause.length === 1 ? noeudsCause[0] : noeudsCause;
  return { cle, libelle, mouvement, cause, emetteur: fin[2] };
}

/** Les groupes du bloc, ou `null` si une partie du texte n'a pas la forme que le code écrit. */
export function lireBlocMarches(children: ReactNode): GroupeMarcheVue[] | null {
  const groupes: GroupeMarcheVue[] = [];
  let titre: string | null = null;

  for (const noeud of Children.toArray(children)) {
    if (typeof noeud === "string") {
      if (noeud.trim()) return null;
      continue;
    }
    if (!isValidElement<{ children?: ReactNode }>(noeud)) return null;
    if (noeud.type === "h3") {
      titre = texteDe(noeud.props.children).trim();
      continue;
    }
    if (noeud.type === "ul" && titre) {
      const lignes: LigneMarcheVue[] = [];
      for (const [i, puce] of Children.toArray(noeud.props.children).entries()) {
        if (typeof puce === "string" && !puce.trim()) continue;
        if (!isValidElement<{ children?: ReactNode }>(puce) || puce.type !== "li") return null;
        const ligne = lireLigne(Children.toArray(puce.props.children), `${groupes.length}/${i}`);
        if (!ligne) return null;
        lignes.push(ligne);
      }
      if (lignes.length === 0) return null;
      groupes.push({ driverId: titre, titre, lignes });
      titre = null;
      continue;
    }
    return null;
  }
  return groupes.length > 0 ? groupes : null;
}
