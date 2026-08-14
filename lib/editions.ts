import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Edition, EditionKind, Zone } from "./types";

export const EDITIONS_DIR = path.join(process.cwd(), "content", "editions");

// ---------------------------------------------------------------------------
// Les blocs analytiques
// ---------------------------------------------------------------------------

/**
 * Les blocs sont des composants nommés dans le corps MDX, pas des titres markdown : un titre
 * mal orthographié disparaît en silence, un composant inconnu est rejeté à la validation.
 */
export const BLOCK_NAMES = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
  "CeQueJeSurveille",
  "RecapDesSpeciales",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

export const BLOCK_TITLES: Record<BlockName, string> = {
  CeQuiAChange: "Ce qui a changé",
  CeQuiSestConfirme: "Ce qui s'est confirmé",
  RevisionDesScenarios: "Révision des scénarios",
  CeQueJavaisMalLu: "Ce que j'avais mal lu",
  CeQueJeSurveille: "Ce que je surveille",
  RecapDesSpeciales: "Ce que les spéciales de la semaine ont établi",
};

/**
 * L'ordre porte du sens : « ce que j'avais mal lu » placé en tête d'une édition n'a pas la
 * même valeur qu'après la révision des scénarios. L'ordre canonique est donc imposé.
 */
const CANONICAL_ORDER: Record<EditionKind, BlockName[]> = {
  hebdo: [
    "CeQuiAChange",
    "CeQuiSestConfirme",
    "RevisionDesScenarios",
    "CeQueJavaisMalLu",
    "CeQueJeSurveille",
    "RecapDesSpeciales",
  ],
  // Exiger « ce que j'avais mal lu » trente minutes après un choc n'a aucun sens : une
  // spéciale ne requiert que trois blocs (cahier des charges).
  speciale: ["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"],
};

const REQUIRED_BLOCKS: Record<EditionKind, BlockName[]> = {
  hebdo: [
    "CeQuiAChange",
    "CeQuiSestConfirme",
    "RevisionDesScenarios",
    "CeQueJavaisMalLu",
    "CeQueJeSurveille",
  ],
  speciale: ["CeQuiAChange", "RevisionDesScenarios", "CeQueJeSurveille"],
};

/** `RecapDesSpeciales` n'est jamais exigé d'office : il dépend de la semaine (voir le corpus). */
const ALLOWED_BLOCKS: Record<EditionKind, BlockName[]> = {
  hebdo: CANONICAL_ORDER.hebdo,
  speciale: CANONICAL_ORDER.speciale,
};

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export class EditionValidationError extends Error {
  constructor(slug: string, reason: string) {
    super(`content/editions/${slug}.mdx — ${reason}`);
    this.name = "EditionValidationError";
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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ");

const frontmatterSchema = z.object({
  kind: z.enum(["hebdo", "speciale"]),
  date: isoDate,
  comparesTo: z.string().nullable().default(null),
  trigger: z.string().min(1).nullable().default(null),
  regimeStatement: z.string().min(1),
  keyIndicators: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(1),
  zones: z.array(z.enum(ZONES)).min(1),
  trendRefs: z.array(z.string()).default([]),
  instrumentRefs: z.array(z.string()).default([]),
  sources: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .default([]),
});

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^(\d{4})-S(\d{2})(?:-E(\d+))?$/;

export type SlugParts = {
  isoWeek: string;
  /** Le type que la forme du slug implique — confronté au `kind` déclaré. */
  impliedKind: EditionKind;
  parentWeek: string | null;
};

/**
 * `isoWeek` et `parentWeek` sont dérivés du nom de fichier plutôt que redéclarés dans le
 * frontmatter : une valeur saisie deux fois est une valeur qui finira par diverger.
 */
export function parseSlug(slug: string): SlugParts {
  const match = SLUG_PATTERN.exec(slug);
  if (!match) {
    throw new EditionValidationError(
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

function readBlockSequence(slug: string, body: string): BlockName[] {
  const sequence: BlockName[] = [];
  for (const match of body.matchAll(COMPONENT_TAG)) {
    const name = match[1];
    if (!(BLOCK_NAMES as readonly string[]).includes(name)) {
      throw new EditionValidationError(
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

export type ParsedEdition = {
  meta: Edition;
  body: string;
  blocks: BlockName[];
};

export function parseEdition(slug: string, source: string): ParsedEdition {
  const { isoWeek, impliedKind, parentWeek } = parseSlug(slug);

  const file = matter(source);
  const parsed = frontmatterSchema.safeParse(file.data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    throw new EditionValidationError(slug, `frontmatter invalide — ${detail}`);
  }
  const fm = parsed.data;

  if (fm.kind !== impliedKind) {
    throw new EditionValidationError(
      slug,
      `le frontmatter déclare « ${fm.kind} » mais la forme du slug implique « ${impliedKind} »`,
    );
  }

  // Le seuil franchi est ce qui justifie l'existence d'une spéciale : sans lui, le lecteur ne
  // peut pas savoir pourquoi elle a été publiée.
  if (fm.kind === "speciale" && !fm.trigger) {
    throw new EditionValidationError(
      slug,
      "une édition spéciale doit déclarer le seuil franchi dans « trigger »",
    );
  }
  if (fm.kind === "hebdo" && fm.trigger) {
    throw new EditionValidationError(
      slug,
      "une hebdo paraît qu'il se soit passé quelque chose ou non : elle ne doit pas déclarer de « trigger »",
    );
  }

  const blocks = readBlockSequence(slug, file.content);

  const seen = new Set<BlockName>();
  for (const block of blocks) {
    if (seen.has(block)) {
      throw new EditionValidationError(slug, `bloc « <${block}> » présent deux fois`);
    }
    seen.add(block);
  }

  for (const required of REQUIRED_BLOCKS[fm.kind]) {
    if (!seen.has(required)) {
      throw new EditionValidationError(
        slug,
        `bloc obligatoire manquant « <${required}> » (${BLOCK_TITLES[required]})`,
      );
    }
  }

  const allowed = ALLOWED_BLOCKS[fm.kind];
  for (const block of blocks) {
    if (!allowed.includes(block)) {
      throw new EditionValidationError(
        slug,
        `bloc « <${block}> » interdit dans une ${fm.kind === "hebdo" ? "hebdo" : "spéciale"} — la structure allégée des spéciales doit rester distincte`,
      );
    }
  }

  const canonical = CANONICAL_ORDER[fm.kind].filter((b) => seen.has(b));
  if (blocks.join(",") !== canonical.join(",")) {
    throw new EditionValidationError(
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
      trendRefs: fm.trendRefs,
      instrumentRefs: fm.instrumentRefs,
      sources: fm.sources,
    },
    body: file.content,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Règles inter-fichiers
// ---------------------------------------------------------------------------

export type CorpusRefs = {
  trendIds: ReadonlySet<string>;
  instrumentIds: ReadonlySet<string>;
};

/**
 * Règles qui ne peuvent pas s'évaluer sur un fichier isolé :
 * l'articulation hebdo/spéciale et les références croisées.
 */
export function validateCorpus(
  editions: ParsedEdition[],
  refs: CorpusRefs,
): Edition[] {
  const byDate = [...editions].sort(
    (a, b) => a.meta.date.localeCompare(b.meta.date) || a.meta.slug.localeCompare(b.meta.slug),
  );
  const slugs = new Set(byDate.map((e) => e.meta.slug));

  byDate.forEach((edition, index) => {
    const { slug, kind, comparesTo, isoWeek } = edition.meta;
    const previous = byDate.slice(0, index);

    // « Le bloc "ce qui a changé" d'une hebdo se compare à la hebdo précédente, jamais à la
    // dernière spéciale. Une spéciale se compare à la dernière édition, quelle qu'elle soit. »
    const expected =
      kind === "hebdo"
        ? (previous.filter((e) => e.meta.kind === "hebdo").at(-1)?.meta.slug ?? null)
        : (previous.at(-1)?.meta.slug ?? null);

    if (comparesTo !== expected) {
      throw new EditionValidationError(
        slug,
        kind === "hebdo"
          ? `une hebdo se compare à la hebdo précédente (${expected ?? "aucune"}), pas à ${comparesTo ?? "rien"} — sinon le fil hebdomadaire se rompt`
          : `une spéciale se compare à la dernière édition parue (${expected ?? "aucune"}), pas à ${comparesTo ?? "rien"}`,
      );
    }

    if (comparesTo && !slugs.has(comparesTo)) {
      throw new EditionValidationError(slug, `« comparesTo » pointe vers ${comparesTo}, qui n'existe pas`);
    }

    // « La hebdo suivante consolide les spéciales de la semaine » — l'antidote à la réaction
    // à chaud. Une semaine qui a produit des spéciales doit les relire avec du recul.
    if (kind === "hebdo") {
      const specialsThisWeek = editions.filter(
        (e) => e.meta.kind === "speciale" && e.meta.parentWeek === isoWeek,
      );
      const hasRecap = edition.blocks.includes("RecapDesSpeciales");
      if (specialsThisWeek.length > 0 && !hasRecap) {
        throw new EditionValidationError(
          slug,
          `la semaine ${isoWeek} porte ${specialsThisWeek.length} spéciale(s) : le bloc « <RecapDesSpeciales> » est obligatoire`,
        );
      }
      if (specialsThisWeek.length === 0 && hasRecap) {
        throw new EditionValidationError(
          slug,
          `aucune spéciale n'a paru en semaine ${isoWeek} : le bloc « <RecapDesSpeciales> » n'a rien à consolider`,
        );
      }
    }

    for (const id of edition.meta.trendRefs) {
      if (!refs.trendIds.has(id)) {
        throw new EditionValidationError(slug, `tendance inconnue « ${id} » dans trendRefs`);
      }
    }
    for (const id of edition.meta.instrumentRefs) {
      if (!refs.instrumentIds.has(id)) {
        throw new EditionValidationError(slug, `instrument inconnu « ${id} » dans instrumentRefs`);
      }
    }
  });

  return byDate.map((e) => e.meta);
}

// ---------------------------------------------------------------------------
// Chargement depuis le disque
// ---------------------------------------------------------------------------

export function readEditionSources(): Array<{ slug: string; source: string }> {
  return readdirSync(EDITIONS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((file) => ({
      slug: file.replace(/\.mdx$/, ""),
      source: readFileSync(path.join(EDITIONS_DIR, file), "utf8"),
    }));
}
