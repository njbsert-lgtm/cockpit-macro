import matter from "gray-matter";
import type { Brouillon } from "./schema";
import { extraireSortieMixte, validerReponse, type Vivier } from "./sortie-mixte";

/**
 * De la réponse brute du modèle au `Brouillon` que le reste du pipeline manipule.
 *
 * C'est la pièce qui remplace la sortie structurée. Le modèle écrit du MDX et une section JSON ;
 * ce module en refait l'objet que `rendreMdx`, le contrôle des chiffres, la persistance et le
 * portail attendaient déjà. **Rien en aval ne sait que le contrat a changé**, ce qui était la
 * condition pour que ce basculement ne devienne pas une réécriture du pipeline entier.
 *
 * Le MDX reçu n'est jamais écrit tel quel : `rendreMdx` le reconstruit depuis le `Brouillon`,
 * en imposant l'ordre canonique des blocs et en posant lui-même les champs mécaniques. Ce qu'on
 * garde du fichier reçu, c'est le texte — et les seuls champs de frontmatter qui relèvent d'un
 * jugement.
 */

export type ResultatReception =
  | { ok: true; brouillon: Brouillon }
  | { ok: false; raison: string };

/**
 * Le bloc 4 est vérifié **vide** plutôt que simplement ignoré. Un modèle qui le remplit a
 * produit une auto-critique plausible et creuse ; la laisser passer en la jetant silencieusement
 * masquerait le fait que le prompt a cessé d'être tenu.
 */
const BLOC_HUMAIN = "CeQueJavaisMalLu";

export function recevoir(brut: string, vivier: Vivier): ResultatReception {
  const extrait = extraireSortieMixte(brut);
  if (!extrait.ok) return { ok: false, raison: extrait.raison };

  let fichier: matter.GrayMatterFile<string>;
  try {
    fichier = matter(extrait.mdx);
  } catch (error) {
    return { ok: false, raison: `frontmatter YAML illisible : ${(error as Error).message}` };
  }

  const valide = validerReponse(fichier.data, extrait.jsonBrut, vivier);
  if (!valide.ok) return { ok: false, raison: valide.raison };

  const blocs = extraireBlocs(fichier.content, vivier.blocsAttendus);
  if (!blocs.ok) return { ok: false, raison: blocs.raison };

  const { frontmatter: fm, structure } = valide;
  return {
    ok: true,
    brouillon: {
      regimeStatement: fm.regimeStatement,
      keyIndicators: fm.keyIndicators,
      channels: fm.channels,
      driverOrder: fm.driverOrder,
      trendRefs: fm.trendRefs,
      instrumentRefs: fm.instrumentRefs,
      veilleItemRefs: fm.veilleItemRefs,
      blocs: blocs.blocs,
      sources: structure.sources,
      scenarioRevisions: structure.scenarioRevisions,
      trendUpdates: structure.trendUpdates,
      guets: structure.guets,
      driverCandidate: structure.driverCandidate,
      redactionNotes: structure.redactionNotes,
    },
  };
}

type ResultatBlocs = { ok: true; blocs: Record<string, string> } | { ok: false; raison: string };

/**
 * Les blocs, lus au composant. Une expression régulière plutôt qu'un parseur MDX : à ce stade
 * le texte n'a pas besoin d'être compris, seulement découpé — et `parseNote` repassera derrière
 * sur le fichier reconstruit, avec toute sa validation.
 */
function extraireBlocs(corps: string, attendus: string[]): ResultatBlocs {
  const blocs: Record<string, string> = {};

  for (const nom of attendus) {
    const trouve = new RegExp(`<${nom}>([\\s\\S]*?)</${nom}>`).exec(corps);
    if (!trouve) {
      return {
        ok: false,
        raison: `bloc « <${nom}> » manquant ou mal formé — chaque bloc attendu est un composant ouvrant et fermant`,
      };
    }
    const texte = trouve[1].trim();
    if (texte.length === 0) {
      return {
        ok: false,
        raison: `bloc « <${nom}> » vide — s'il n'y a rien à en dire, l'écrire est la réponse attendue`,
      };
    }
    blocs[nom] = texte;
  }

  const humain = new RegExp(`<${BLOC_HUMAIN}>([\\s\\S]*?)</${BLOC_HUMAIN}>`).exec(corps);
  if (humain && humain[1].trim().length > 0) {
    return {
      ok: false,
      raison: `« ${BLOC_HUMAIN} » a été pré-rempli : ce bloc reste vide, un humain seul l'écrit`,
    };
  }

  return { ok: true, blocs };
}
