import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Note, NoteKind, VeilleChannel, Zone } from "./types";
import {
  BLOCK_NAMES,
  BLOCK_TITLES,
  GUETS_REQUIS_A_PARTIR_DE,
  REQUIRED_BLOCKS,
  type BlockName,
} from "./note-blocks";

export { BLOCK_NAMES, BLOCK_TITLES, GUETS_REQUIS_A_PARTIR_DE, REQUIRED_BLOCKS };
export type { BlockName };

export const NOTES_DIR = path.join(process.cwd(), "content", "notes");

// ---------------------------------------------------------------------------
// Les blocs analytiques
// ---------------------------------------------------------------------------

/**
 * L'ordre porte du sens : « ce que j'avais mal lu » placé en tête d'une note n'a pas la
 * même valeur qu'après la révision des scénarios. L'ordre canonique est donc imposé.
 *
 * `LeFilDeLaSemaine` ferme toujours la marche, après `RecapDesSpeciales` : la chronologie des
 * items de veille vient en complément du jugement, jamais avant lui. Balise auto-porteuse —
 * son contenu n'est pas rédigé, il est résolu au rendu depuis `Note.veilleItemRefs`.
 */
const CANONICAL_ORDER: Record<NoteKind, BlockName[]> = {
  hebdo: [
    "CeQuiAChange",
    "CeQuiSestConfirme",
    "RevisionDesScenarios",
    "CeQueJavaisMalLu",
    "CeQueJeSurveille",
    "RecapDesSpeciales",
    "LeFilDeLaSemaine",
  ],
  // Exiger « ce que j'avais mal lu » trente minutes après un choc n'a aucun sens : une
  // spéciale ne requiert que trois blocs (cahier des charges). Le fil de la semaine est un
  // exercice de recul hebdomadaire, pas une réaction à chaud : réservé aux hebdos.
  speciale: ["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"],
};

/** `RecapDesSpeciales` n'est jamais exigé d'office : il dépend de la semaine (voir le corpus). */
const ALLOWED_BLOCKS: Record<NoteKind, BlockName[]> = {
  hebdo: CANONICAL_ORDER.hebdo,
  speciale: CANONICAL_ORDER.speciale,
};

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export class NoteValidationError extends Error {
  constructor(slug: string, reason: string) {
    super(`content/notes/${slug}.mdx — ${reason}`);
    this.name = "NoteValidationError";
  }
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

const ZONES = [
  "us",
  "ez",
  "fr",
  "de",
  "uk",
  "es",
  "it",
  "jp",
  "cn",
  "in",
  "em",
  "global",
] as const satisfies readonly Zone[];

const CHANNELS = [
  "taux-reel",
  "nature-choc",
  "fonction-reaction",
  "dollar",
  "positionnement",
] as const satisfies readonly VeilleChannel[];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ");

/**
 * Un guet du bloc 5. `echeance` est nullable à dessein : « si Ormuz rouvre » n'a pas de date,
 * et un guet sans échéance n'expire jamais (voir `lib/guets.ts`).
 *
 * `statut` a une valeur par défaut : à la saisie, un guet est ouvert. Les autres statuts sont
 * atteints par le temps ou par une résolution, jamais déclarés à la création.
 */
const guetSchema = z.object({
  id: z.string().min(1),
  /**
   * La note qui a posé le guet. Absent pour un guet neuf — il appartient à la note qui le
   * déclare, et le code le pose. Présent pour un guet **remonté** d'une note antérieure, dont
   * l'ancienneté doit rester visible : « posé en 2026-S35 », trois semaines plus tôt.
   */
  noteSlug: z.string().min(1).optional(),
  driverId: z.string().min(1),
  libelle: z.string().min(1),
  attendu: z.string().min(1),
  confirmeSi: z.string().min(1),
  infirmeSi: z.string().min(1),
  echeance: isoDate.nullable().default(null),
  sourceAttendue: z.array(z.string().min(1)).default([]),
  statut: z
    .enum(["ouvert", "confirme", "infirme", "expire", "sans-objet"])
    .default("ouvert"),
  resoluPar: z.string().min(1).nullable().default(null),
  resoluLe: isoDate.nullable().default(null),
});

const frontmatterSchema = z.object({
  kind: z.enum(["hebdo", "speciale"]),
  /**
   * Un brouillon n'est jamais rendu dans le fil ni dans l'étagère : il n'existe que dans
   * `/redaction`. La valeur par défaut est `publiee` — les notes écrites avant l'arrivée du
   * pipeline n'ont pas de statut à déclarer, et une absence ne doit pas les faire disparaître.
   */
  status: z.enum(["brouillon", "publiee"]).default("publiee"),
  /** Figée au moment de la publication depuis le portail. */
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  date: isoDate,
  comparesTo: z.string().nullable().default(null),
  trigger: z.string().min(1).nullable().default(null),
  regimeStatement: z.string().min(1),
  keyIndicators: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(1),
  zones: z.array(z.enum(ZONES)).min(1),
  driverOrder: z.array(z.string()).min(1),
  trendRefs: z.array(z.string()).default([]),
  instrumentRefs: z.array(z.string()).default([]),
  veilleItemRefs: z.array(z.string()).default([]),
  channels: z.array(z.enum(CHANNELS)).default([]),
  // Une carte « nom de bloc → sources ». La validation du nom de bloc et de sa présence dans
  // la note se fait après l'analyse du corps, dans `parseNote` : le schéma ne voit pas le MDX.
  sources: z
    .record(
      z.string(),
      z.array(z.object({ label: z.string().min(1), url: z.string().url() })).min(1),
    )
    .default({}),
  // « Trois guets maximum par note. Un dispositif qui surveille quinze choses ne surveille
  // rien. » Le plafond est ici une contrainte de données, pas une consigne de rédaction.
  guets: z.array(guetSchema).max(3).default([]),
  // Qui a écrit chaque bloc, par nom — même forme et même validation de présence que `sources`.
  // Aucune règle « pas de ia restant » ici : une telle règle ne vaudrait que pour une note
  // publiée, et ce schéma valide toute note, brouillon compris. C'est
  // `lib/redaction/publication.ts` qui la porte, au moment précis où elle s'applique.
  authorship: z
    .record(z.string(), z.enum(["ia", "ia-relue", "ia-corrigee", "humaine"]))
    .default({}),
});

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^(\d{4})-S(\d{2})(?:-E(\d+))?$/;

export type SlugParts = {
  isoWeek: string;
  /** Le type que la forme du slug implique — confronté au `kind` déclaré. */
  impliedKind: NoteKind;
  parentWeek: string | null;
};

/**
 * `isoWeek` et `parentWeek` sont dérivés du nom de fichier plutôt que redéclarés dans le
 * frontmatter : une valeur saisie deux fois est une valeur qui finira par diverger.
 */
export function parseSlug(slug: string): SlugParts {
  const match = SLUG_PATTERN.exec(slug);
  if (!match) {
    throw new NoteValidationError(
      slug,
      "slug invalide : attendu « AAAA-Sxx » pour une hebdo ou « AAAA-Sxx-En » pour une spéciale",
    );
  }
  const [, year, week, special] = match;
  const isoWeek = `${year}-S${week}`;
  return {
    isoWeek,
    impliedKind: special ? "speciale" : "hebdo",
    parentWeek: special ? isoWeek : null,
  };
}

// ---------------------------------------------------------------------------
// Détection des blocs dans le corps MDX
// ---------------------------------------------------------------------------

// Toute balise ouvrante de composant (majuscule initiale). Les balises fermantes ne matchent
// pas : `<` doit être suivi immédiatement d'une lettre majuscule.
const COMPONENT_TAG = /<([A-Z][A-Za-z0-9]*)(\s[^>]*)?\/?>/g;

/**
 * Le texte brut d'un bloc nommé, débarrassé de la mise en forme markdown — pour un extrait de
 * carte, pas pour du rendu : c'est du texte simple, affiché avec un `line-clamp` CSS plutôt que
 * tronqué ici à un nombre de caractères, qui ne saurait pas ce qu'une police ou une largeur de
 * carte permettent d'afficher.
 */
export function extractBlockText(body: string, block: BlockName): string | null {
  const match = new RegExp(`<${block}>([\\s\\S]*?)</${block}>`).exec(body);
  if (!match) return null;
  return match[1]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // liens markdown : garde le texte, jette l'URL
    .replace(/[*_`]/g, "") // emphase et code inline
    .replace(/\s+/g, " ")
    .trim();
}

function readBlockSequence(slug: string, body: string): BlockName[] {
  const sequence: BlockName[] = [];
  for (const match of body.matchAll(COMPONENT_TAG)) {
    const name = match[1];
    if (!(BLOCK_NAMES as readonly string[]).includes(name)) {
      throw new NoteValidationError(
        slug,
        `bloc inconnu « <${name}> ». Blocs valides : ${BLOCK_NAMES.join(", ")}`,
      );
    }
    sequence.push(name as BlockName);
  }
  return sequence;
}

// ---------------------------------------------------------------------------
// Validation d'un fichier, sans accès disque — testable sur des sources synthétiques
// ---------------------------------------------------------------------------

export type ParsedNote = {
  meta: Note;
  body: string;
  blocks: BlockName[];
};

export function parseNote(slug: string, source: string): ParsedNote {
  const { isoWeek, impliedKind, parentWeek } = parseSlug(slug);

  const file = matter(source);
  const parsed = frontmatterSchema.safeParse(file.data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    throw new NoteValidationError(slug, `frontmatter invalide — ${detail}`);
  }
  const fm = parsed.data;

  if (fm.kind !== impliedKind) {
    throw new NoteValidationError(
      slug,
      `le frontmatter déclare « ${fm.kind} » mais la forme du slug implique « ${impliedKind} »`,
    );
  }

  // Le seuil franchi est ce qui justifie l'existence d'une spéciale : sans lui, le lecteur ne
  // peut pas savoir pourquoi elle a été publiée.
  if (fm.kind === "speciale" && !fm.trigger) {
    throw new NoteValidationError(
      slug,
      "une note spéciale doit déclarer le seuil franchi dans « trigger »",
    );
  }
  if (fm.kind === "hebdo" && fm.trigger) {
    throw new NoteValidationError(
      slug,
      "une hebdo paraît qu'il se soit passé quelque chose ou non : elle ne doit pas déclarer de « trigger »",
    );
  }

  const blocks = readBlockSequence(slug, file.content);

  const seen = new Set<BlockName>();
  for (const block of blocks) {
    if (seen.has(block)) {
      throw new NoteValidationError(slug, `bloc « <${block}> » présent deux fois`);
    }
    seen.add(block);
  }

  for (const required of REQUIRED_BLOCKS[fm.kind]) {
    if (!seen.has(required)) {
      throw new NoteValidationError(
        slug,
        `bloc obligatoire manquant « <${required}> » (${BLOCK_TITLES[required]})`,
      );
    }
  }

  const allowed = ALLOWED_BLOCKS[fm.kind];
  for (const block of blocks) {
    if (!allowed.includes(block)) {
      throw new NoteValidationError(
        slug,
        `bloc « <${block}> » interdit dans une ${fm.kind === "hebdo" ? "hebdo" : "spéciale"} — la structure allégée des spéciales doit rester distincte`,
      );
    }
  }

  // Une source rattachée à un bloc que la note ne porte pas ne s'afficherait nulle part :
  // elle serait perdue en silence, ce qui est exactement ce que la validation doit empêcher.
  for (const block of Object.keys(fm.sources)) {
    if (!(BLOCK_NAMES as readonly string[]).includes(block)) {
      throw new NoteValidationError(
        slug,
        `sources : bloc inconnu « ${block} ». Blocs valides : ${BLOCK_NAMES.join(", ")}`,
      );
    }
    if (!seen.has(block as BlockName)) {
      throw new NoteValidationError(
        slug,
        `sources : le bloc « ${block} » n'existe pas dans cette note — sa source ne s'afficherait nulle part`,
      );
    }
  }

  // Même garde pour l'authorship : indiquer qui a écrit un bloc que la note ne porte pas
  // n'a pas de sens et ne s'afficherait nulle part non plus.
  for (const block of Object.keys(fm.authorship)) {
    if (!(BLOCK_NAMES as readonly string[]).includes(block)) {
      throw new NoteValidationError(
        slug,
        `authorship : bloc inconnu « ${block} ». Blocs valides : ${BLOCK_NAMES.join(", ")}`,
      );
    }
    if (!seen.has(block as BlockName)) {
      throw new NoteValidationError(
        slug,
        `authorship : le bloc « ${block} » n'existe pas dans cette note`,
      );
    }
  }

  // Le régime des guets. Avant la bascule, le bloc 5 est de la prose et le reste ; après,
  // la structure est exigée — sans cette borne le dispositif pourrait s'éteindre en silence.
  if (fm.guets.length === 0 && isoWeek >= GUETS_REQUIS_A_PARTIR_DE) {
    throw new NoteValidationError(
      slug,
      `le bloc « ce que je surveille » doit être structuré à partir de ${GUETS_REQUIS_A_PARTIR_DE} : ` +
        "déclarer « guets » dans le frontmatter plutôt que de la prose",
    );
  }

  const guetIds = new Set<string>();
  for (const guet of fm.guets) {
    if (guetIds.has(guet.id)) {
      throw new NoteValidationError(slug, `guets : identifiant « ${guet.id} » présent deux fois`);
    }
    guetIds.add(guet.id);

    // Un guet sans échéance ne peut pas être expiré : il n'y a pas de date à dépasser.
    // L'incohérence est refusée ici plutôt que corrigée en silence au calcul.
    if (guet.echeance === null && guet.statut === "expire") {
      throw new NoteValidationError(
        slug,
        `guet « ${guet.id} » : sans échéance, un guet ne peut pas expirer — le clore en ` +
          "« sans-objet » si la question ne se pose plus",
      );
    }

    // Un guet résolu doit dire par quoi, et un guet non résolu ne doit pas prétendre l'être.
    const resolu = guet.statut === "confirme" || guet.statut === "infirme";
    if (resolu && !guet.resoluLe) {
      throw new NoteValidationError(
        slug,
        `guet « ${guet.id} » : statut « ${guet.statut} » sans date de résolution`,
      );
    }
    if (!resolu && (guet.resoluPar || guet.resoluLe)) {
      throw new NoteValidationError(
        slug,
        `guet « ${guet.id} » : porte une résolution alors que son statut est « ${guet.statut} »`,
      );
    }
  }

  const canonical = CANONICAL_ORDER[fm.kind].filter((b) => seen.has(b));
  if (blocks.join(",") !== canonical.join(",")) {
    throw new NoteValidationError(
      slug,
      `ordre des blocs non canonique — attendu ${canonical.join(" → ")}, trouvé ${blocks.join(" → ")}`,
    );
  }

  return {
    meta: {
      slug,
      kind: fm.kind,
      date: fm.date,
      isoWeek,
      parentWeek,
      comparesTo: fm.comparesTo,
      trigger: fm.trigger,
      regimeStatement: fm.regimeStatement,
      keyIndicators: fm.keyIndicators,
      zones: fm.zones,
      driverOrder: fm.driverOrder,
      trendRefs: fm.trendRefs,
      instrumentRefs: fm.instrumentRefs,
      veilleItemRefs: fm.veilleItemRefs,
      channels: fm.channels,
      sources: fm.sources,
      status: fm.status,
      publishedAt: fm.publishedAt,
      authorship: fm.authorship,
      // Un guet neuf appartient à la note qui le déclare ; un guet remonté garde la sienne,
      // sans quoi son ancienneté disparaîtrait au premier report.
      guets: fm.guets.map((g) => ({ ...g, noteSlug: g.noteSlug ?? slug })),
    },
    body: file.content,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Règles inter-fichiers
// ---------------------------------------------------------------------------

/**
 * Règles d'articulation de la chaîne des notes : elles ne peuvent pas s'évaluer sur un
 * fichier isolé, mais ne concernent que les notes entre elles.
 *
 * Les références sortantes — vers les tendances, les instruments, les drivers — sont
 * vérifiées ailleurs, par `checkIntegrity` (`lib/integrity.ts`), qui contrôle tout le graphe
 * de contenu d'un seul tenant.
 */
export function validateNoteChain(notes: ParsedNote[]): Note[] {
  const byDate = [...notes].sort(
    (a, b) => a.meta.date.localeCompare(b.meta.date) || a.meta.slug.localeCompare(b.meta.slug),
  );
  const slugs = new Set(byDate.map((e) => e.meta.slug));

  byDate.forEach((note, index) => {
    const { slug, kind, comparesTo, isoWeek } = note.meta;
    const previous = byDate.slice(0, index);

    // « Le bloc "ce qui a changé" d'une hebdo se compare à la hebdo précédente, jamais à la
    // dernière spéciale. Une spéciale se compare à la dernière note, quelle qu'elle soit. »
    const expected =
      kind === "hebdo"
        ? (previous.filter((e) => e.meta.kind === "hebdo").at(-1)?.meta.slug ?? null)
        : (previous.at(-1)?.meta.slug ?? null);

    if (comparesTo !== expected) {
      throw new NoteValidationError(
        slug,
        kind === "hebdo"
          ? `une hebdo se compare à la hebdo précédente (${expected ?? "aucune"}), pas à ${comparesTo ?? "rien"} — sinon le fil hebdomadaire se rompt`
          : `une spéciale se compare à la dernière note parue (${expected ?? "aucune"}), pas à ${comparesTo ?? "rien"}`,
      );
    }

    if (comparesTo && !slugs.has(comparesTo)) {
      throw new NoteValidationError(slug, `« comparesTo » pointe vers ${comparesTo}, qui n'existe pas`);
    }

    // « La hebdo suivante consolide les spéciales de la semaine » — l'antidote à la réaction
    // à chaud. Une semaine qui a produit des spéciales doit les relire avec du recul.
    if (kind === "hebdo") {
      const specialsThisWeek = notes.filter(
        (e) => e.meta.kind === "speciale" && e.meta.parentWeek === isoWeek,
      );
      const hasRecap = note.blocks.includes("RecapDesSpeciales");
      if (specialsThisWeek.length > 0 && !hasRecap) {
        throw new NoteValidationError(
          slug,
          `la semaine ${isoWeek} porte ${specialsThisWeek.length} spéciale(s) : le bloc « <RecapDesSpeciales> » est obligatoire`,
        );
      }
      if (specialsThisWeek.length === 0 && hasRecap) {
        throw new NoteValidationError(
          slug,
          `aucune spéciale n'a paru en semaine ${isoWeek} : le bloc « <RecapDesSpeciales> » n'a rien à consolider`,
        );
      }
    }

  });

  return byDate.map((e) => e.meta);
}

// ---------------------------------------------------------------------------
// Chargement depuis le disque
// ---------------------------------------------------------------------------

export function readNoteSources(): Array<{ slug: string; source: string }> {
  return readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((file) => ({
      slug: file.replace(/\.mdx$/, ""),
      source: readFileSync(path.join(NOTES_DIR, file), "utf8"),
    }));
}
