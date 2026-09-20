import { z } from "zod";
import { describeFetchError, fetchWithTimeout } from "./http";
import { isoWeekBounds, parseIsoWeek } from "./iso-week";

/**
 * Le collecteur de la fiche macro hebdomadaire — la matière principale de la note.
 *
 * **Le piège d'accès, à ne pas rater.** Le connecteur Notion utilisé en conversation n'est pas
 * accessible depuis un workflow. Il faut une intégration interne (`notion.so/my-integrations`),
 * en lecture seule, **et partager explicitement la base avec elle**. Sans ce partage, le jeton
 * est valide, l'API répond 200, et la base paraît vide : l'erreur ressemble à un problème de
 * données alors que c'est un problème de droits. `chercherFiche` distingue donc les deux cas.
 *
 * Deux écritures seulement, et une seule sort d'ici : la bascule de `Lue` après génération.
 * C'est le journal d'exécution le plus lisible qui soit, directement dans Notion.
 */

const NOTION_VERSION = "2022-06-28";
const BASE_URL = "https://api.notion.com/v1";

/** Injectable, même rôle que le `Fetcher` de `lib/ingest.ts` : testable sans réseau. */
export type NotionFetcher = (url: string, init: RequestInit) => Promise<Response>;

export type NotionConfig = {
  token: string;
  databaseId: string;
  fetcher?: NotionFetcher;
};

// ---------------------------------------------------------------------------
// Schémas — on ne lit que ce dont on a besoin, et `passthrough` laisse Notion ajouter des
// champs sans faire échouer la lecture. Une réponse malformée est rejetée, jamais devinée.
// ---------------------------------------------------------------------------

const richTextSchema = z.array(
  z.object({
    plain_text: z.string(),
    href: z.string().nullable().optional(),
    annotations: z
      .object({
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        code: z.boolean().optional(),
      })
      .optional(),
  }),
);

const pageSchema = z.object({
  id: z.string(),
  url: z.string(),
  last_edited_time: z.string(),
  properties: z.record(z.string(), z.unknown()),
});

const querySchema = z.object({
  results: z.array(pageSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

const blockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    has_children: z.boolean(),
  })
  .catchall(z.unknown());

const blocksSchema = z.object({
  results: z.array(blockSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

// ---------------------------------------------------------------------------
// La propriété `Semaine` — 'S38 — lundi 14/09 au dimanche 20/09'
// ---------------------------------------------------------------------------

export type SemaineLue = { numero: number; lundi: { jour: number; mois: number } | null };

/**
 * Le numéro de semaine et, quand la propriété le porte, le jour du lundi couvert.
 *
 * Le libellé ne contient pas l'année : `S38` seul ne suffirait donc pas à distinguer la S38 de
 * cette année de celle de l'an dernier, dans une base qui s'accumule. Le lundi, lui, tranche —
 * on le compare au lundi réel de la semaine ISO visée. Il reste facultatif : une fiche dont la
 * propriété ne porte que `S38` est acceptée plutôt que rejetée, mais elle ne départage rien.
 */
export function lireSemaine(libelle: string): SemaineLue | null {
  const numero = /\bS\s*(\d{1,2})\b/i.exec(libelle);
  if (!numero) return null;

  const lundi = /lundi\s+(\d{1,2})\/(\d{1,2})/i.exec(libelle);
  return {
    numero: Number(numero[1]),
    lundi: lundi ? { jour: Number(lundi[1]), mois: Number(lundi[2]) } : null,
  };
}

/** La fiche couvre-t-elle bien la semaine demandée ? */
export function couvre(libelle: string, isoWeek: string): boolean {
  const lue = lireSemaine(libelle);
  if (!lue) return false;
  if (lue.numero !== parseIsoWeek(isoWeek).week) return false;
  if (!lue.lundi) return true;

  // Le lundi réel de la semaine ISO, pour écarter la même semaine d'une autre année.
  const { debut } = isoWeekBounds(isoWeek);
  const [, mois, jour] = debut.split("-").map(Number);
  return lue.lundi.jour === jour && lue.lundi.mois === mois;
}

/** La valeur textuelle d'une propriété, quel que soit son type — titre, texte, formule, select. */
export function texteDePropriete(propriete: unknown): string {
  if (!propriete || typeof propriete !== "object") return "";
  const p = propriete as Record<string, unknown>;

  switch (p.type) {
    case "title":
    case "rich_text": {
      const parsed = richTextSchema.safeParse(p[p.type as string]);
      return parsed.success ? parsed.data.map((t) => t.plain_text).join("") : "";
    }
    case "select": {
      const select = p.select as { name?: string } | null;
      return select?.name ?? "";
    }
    case "formula": {
      const formule = p.formula as { string?: string } | null;
      return formule?.string ?? "";
    }
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// La recherche de la fiche
// ---------------------------------------------------------------------------

export type Fiche = {
  pageId: string;
  url: string;
  semaine: string;
  contenu: string;
  /** Les émetteurs cités par la fiche — voir `emetteursCites`. */
  sources: string[];
  recupereLe: string;
};

export type ResultatFiche =
  | { ok: true; fiche: Fiche }
  | { ok: true; fiche: null; raison: string }
  | { ok: false; erreur: string };

const NOM_PROPRIETE_SEMAINE = "Semaine";
const NOM_PROPRIETE_LUE = "Lue";

/**
 * La fiche de la semaine, contenu compris.
 *
 * **Sélection sur le numéro de semaine, jamais sur la date de création** : une fiche peut être
 * créée en avance, et prendre la plus récente ramènerait alors celle de la semaine suivante.
 *
 * Trois issues distinctes, et c'est voulu : une erreur d'appel n'est pas une base vide, et une
 * base vide n'est pas une semaine sans fiche. La première est un incident, la deuxième est
 * presque toujours le partage oublié, la troisième est une information éditoriale que le modèle
 * doit recevoir telle quelle.
 */
export async function chercherFiche(
  isoWeek: string,
  config: NotionConfig,
  aujourdhui = new Date().toISOString(),
): Promise<ResultatFiche> {
  const pages = await listerPages(config);
  if (!pages.ok) return pages;

  if (pages.pages.length === 0) {
    return {
      ok: true,
      fiche: null,
      raison:
        "la base « Vues Macro » ne renvoie aucune page — le plus souvent, l'intégration interne " +
        "n'a pas été ajoutée aux partages de la base : le jeton est valide mais ne voit rien",
    };
  }

  const candidates = pages.pages.filter((p) =>
    couvre(texteDePropriete(p.properties[NOM_PROPRIETE_SEMAINE]), isoWeek),
  );

  if (candidates.length === 0) {
    return { ok: true, fiche: null, raison: `aucune fiche ne couvre la semaine ${isoWeek}` };
  }

  // Deux fiches pour la même semaine : la dernière modifiée fait foi, c'est celle qu'on a
  // continué d'alimenter. Le cas ne devrait pas se produire, mais planter serait pire.
  const page = [...candidates].sort((a, b) =>
    a.last_edited_time.localeCompare(b.last_edited_time),
  )[candidates.length - 1];

  const contenu = await lireContenu(page.id, config);
  if (!contenu.ok) return contenu;

  return {
    ok: true,
    fiche: {
      pageId: page.id,
      url: page.url,
      semaine: texteDePropriete(page.properties[NOM_PROPRIETE_SEMAINE]),
      contenu: contenu.markdown,
      sources: emetteursCites(contenu.markdown),
      recupereLe: aujourdhui,
    },
  };
}

type ResultatPages =
  | { ok: true; pages: Array<z.infer<typeof pageSchema>> }
  | { ok: false; erreur: string };

async function listerPages(config: NotionConfig): Promise<ResultatPages> {
  const pages: Array<z.infer<typeof pageSchema>> = [];
  let cursor: string | null = null;

  // Une base hebdomadaire reste petite, mais la pagination n'est pas facultative : sans elle,
  // la fiche de la semaine finirait par tomber hors de la première page et disparaîtrait un
  // samedi matin, sans erreur, deux ans après la mise en service.
  for (let tour = 0; tour < 20; tour++) {
    const reponse = await appeler(
      `${BASE_URL}/databases/${config.databaseId}/query`,
      config,
      { method: "POST", body: JSON.stringify(cursor ? { start_cursor: cursor } : {}) },
    );
    if (!reponse.ok) return reponse;

    const parsed = querySchema.safeParse(reponse.donnees);
    if (!parsed.success) {
      return { ok: false, erreur: `réponse de base inattendue : ${parsed.error.issues[0]?.message}` };
    }

    pages.push(...parsed.data.results);
    if (!parsed.data.has_more || !parsed.data.next_cursor) return { ok: true, pages };
    cursor = parsed.data.next_cursor;
  }

  return { ok: true, pages };
}

// ---------------------------------------------------------------------------
// Le contenu — blocs Notion vers markdown
// ---------------------------------------------------------------------------

type ResultatContenu = { ok: true; markdown: string } | { ok: false; erreur: string };

async function lireContenu(
  blocId: string,
  config: NotionConfig,
  profondeur = 0,
): Promise<ResultatContenu> {
  // Une fiche est un document plat ou presque. La borne évite qu'une structure inattendue —
  // ou un cycle — fasse boucler un run automatique sans fin.
  if (profondeur > 3) return { ok: true, markdown: "" };

  const lignes: string[] = [];
  let cursor: string | null = null;

  for (let tour = 0; tour < 30; tour++) {
    const url = `${BASE_URL}/blocks/${blocId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
    const reponse = await appeler(url, config, { method: "GET" });
    if (!reponse.ok) return reponse;

    const parsed = blocksSchema.safeParse(reponse.donnees);
    if (!parsed.success) {
      return { ok: false, erreur: `réponse de blocs inattendue : ${parsed.error.issues[0]?.message}` };
    }

    for (const bloc of parsed.data.results) {
      const rendu = rendreBloc(bloc);
      if (rendu !== null) lignes.push(rendu);

      if (bloc.has_children) {
        const enfants = await lireContenu(bloc.id, config, profondeur + 1);
        if (!enfants.ok) return enfants;
        if (enfants.markdown.trim()) {
          lignes.push(
            enfants.markdown
              .split("\n")
              .map((l) => (l.trim() ? `  ${l}` : l))
              .join("\n"),
          );
        }
      }
    }

    if (!parsed.data.has_more || !parsed.data.next_cursor) break;
    cursor = parsed.data.next_cursor;
  }

  return { ok: true, markdown: lignes.join("\n\n").trim() };
}

/**
 * Un bloc Notion en markdown. Les types non gérés rendent `null` plutôt qu'une approximation :
 * une image ou une base embarquée n'a pas de traduction textuelle honnête, et en fabriquer une
 * ferait croire au modèle qu'il a lu quelque chose.
 */
export function rendreBloc(bloc: { type: string } & Record<string, unknown>): string | null {
  const contenu = bloc[bloc.type];
  const texte = (): string => {
    const parsed = richTextSchema.safeParse(
      (contenu as { rich_text?: unknown } | undefined)?.rich_text,
    );
    return parsed.success ? rendreRichText(parsed.data) : "";
  };

  switch (bloc.type) {
    case "paragraph": {
      const t = texte();
      return t.trim() ? t : null; // un paragraphe vide est une respiration, pas du contenu
    }
    case "heading_1":
      return `# ${texte()}`;
    case "heading_2":
      return `## ${texte()}`;
    case "heading_3":
      return `### ${texte()}`;
    case "bulleted_list_item":
      return `- ${texte()}`;
    case "numbered_list_item":
      return `1. ${texte()}`;
    case "to_do": {
      const coche = (contenu as { checked?: boolean } | undefined)?.checked === true;
      return `- [${coche ? "x" : " "}] ${texte()}`;
    }
    case "quote":
      return `> ${texte()}`;
    case "callout":
      return `> ${texte()}`;
    case "toggle":
      return `**${texte()}**`;
    case "code": {
      const langue = (contenu as { language?: string } | undefined)?.language ?? "";
      return `\`\`\`${langue}\n${texte()}\n\`\`\``;
    }
    case "divider":
      return "---";
    default:
      return null;
  }
}

function rendreRichText(morceaux: z.infer<typeof richTextSchema>): string {
  return morceaux
    .map((m) => {
      let t = m.plain_text;
      if (m.annotations?.code) t = `\`${t}\``;
      if (m.annotations?.bold) t = `**${t}**`;
      if (m.annotations?.italic) t = `*${t}*`;
      return m.href ? `[${t}](${m.href})` : t;
    })
    .join("");
}

/**
 * Les émetteurs cités par la fiche, lus dans le texte plutôt que déclarés.
 *
 * La fiche source ligne par ligne, entre parenthèses : « (Zonebourse) », « (Eurostat,
 * publication du 17/09) ». Ce sont ces noms-là, et eux seuls, que la note a le droit de citer :
 * « citer une source absente de la fiche » est ce que le cahier interdit, et c'est le pendant
 * éditorial de la seconde condition du régime B du contrôle des chiffres.
 *
 * Volontairement large plutôt que fin : ce n'est pas une extraction d'entités, c'est un vivier.
 * Une parenthèse qui n'est pas un émetteur y entre sans conséquence — le modèle ne la citera
 * pas —, alors qu'un émetteur manquant bloquerait une phrase juste.
 */
export function emetteursCites(markdown: string): string[] {
  const trouves = new Set<string>();

  for (const [, dedans] of markdown.matchAll(/\(([^()]{2,60})\)/g)) {
    // Le nom seul : « Eurostat, publication du 17/09 » donne « Eurostat ».
    const nom = dedans.split(/[,;—–]/)[0].trim();
    // Ni une URL, ni une date, ni une mesure : une source est un nom, et un nom ne commence
    // pas par un chiffre — « 25 bps », « 2026 », « 16/09 » sortent tous par cette seule règle.
    // Un média dont le nom commence par un chiffre y passerait aussi ; la conséquence est
    // seulement qu'il ne serait pas citable, jamais qu'un chiffre faux passerait.
    if (!nom || /^https?:/i.test(nom) || /^\d/.test(nom)) continue;
    if (!/\p{L}/u.test(nom)) continue;
    trouves.add(nom);
  }

  return [...trouves].sort();
}

// ---------------------------------------------------------------------------
// La bascule de `Lue`
// ---------------------------------------------------------------------------

/**
 * Bascule `Lue` à vrai. Appelée **après** génération réussie, jamais avant : une fiche marquée
 * lue par un run qui a échoué serait invisible au run suivant.
 *
 * Best-effort à l'appel : une bascule ratée ne doit pas faire perdre un brouillon déjà écrit.
 */
export async function marquerLue(
  pageId: string,
  config: NotionConfig,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const reponse = await appeler(`${BASE_URL}/pages/${pageId}`, config, {
    method: "PATCH",
    body: JSON.stringify({ properties: { [NOM_PROPRIETE_LUE]: { checkbox: true } } }),
  });
  return reponse.ok ? { ok: true } : { ok: false, erreur: reponse.erreur };
}

// ---------------------------------------------------------------------------
// L'appel
// ---------------------------------------------------------------------------

type ResultatAppel = { ok: true; donnees: unknown } | { ok: false; erreur: string };

async function appeler(url: string, config: NotionConfig, init: RequestInit): Promise<ResultatAppel> {
  const fetcher = config.fetcher ?? fetchWithTimeout;

  try {
    const reponse = await fetcher(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
    });

    if (!reponse.ok) {
      const corps = await reponse.text().catch(() => "");
      return { ok: false, erreur: `HTTP ${reponse.status} — ${corps.slice(0, 200)}` };
    }
    return { ok: true, donnees: await reponse.json() };
  } catch (error) {
    return { ok: false, erreur: describeFetchError(error) };
  }
}

/** La configuration depuis l'environnement, `null` quand elle manque — jamais une exception. */
export function configNotion(): NotionConfig | null {
  const token = process.env.NOTION_TOKEN?.trim();
  const databaseId = process.env.NOTION_VUES_MACRO_DB?.trim();
  return token && databaseId ? { token, databaseId } : null;
}
