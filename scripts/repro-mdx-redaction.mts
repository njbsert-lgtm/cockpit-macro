/**
 * Reproduction minimale de la nouvelle approche de rédaction : MDX brut en sortie, avec une
 * section JSON délimitée pour les objets structurés (révisions de scénario, guets), plutôt
 * que la sortie structurée de l'API (`output_config.format`) — abandonnée après quatre échecs
 * en conditions réelles (« The compiled grammar is too large »), voir l'historique de commits
 * autour de `lib/redaction/schema.ts`.
 *
 * Volontairement **découplé du pipeline réel** (`lib/redaction/`) : un contexte factice, un
 * seul appel, une validation locale. Le but est de tester l'hypothèse — le modèle produit-il
 * fidèlement ce format ? — en quelques secondes et pour quelques centimes, sans toucher au
 * code de production tant que l'hypothèse n'est pas confirmée.
 *
 *   npm run redaction:repro
 *   npm run redaction:repro -- --model=claude-haiku-4-5
 *   npm run redaction:repro -- --max-tokens=6000 --show
 */
import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import { z } from "zod";

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const MODEL = arg("model", "claude-sonnet-5");
const MAX_TOKENS = Number(arg("max-tokens", "4000"));
const SHOW_RAW = args.includes("--show");

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Le gabarit — ce qui deviendra SYSTEM_PROMPT dans lib/redaction/prompt.ts si l'hypothèse tient
// ---------------------------------------------------------------------------

const DELIM_DEBUT = "```structure-json";
const DELIM_FIN = "```";

const SYSTEM_PROMPT = `Tu rédiges le brouillon d'une note d'analyse macroéconomique pour un carnet personnel. Tu écris en français.

Tu produis directement le fichier MDX complet — frontmatter YAML puis corps — exactement selon le gabarit ci-dessous. Tu ne rédiges rien avant le frontmatter ni après la section JSON finale : ta réponse est le fichier, en entier, sans commentaire.

## Le frontmatter

\`\`\`yaml
---
kind: hebdo
date: '2026-09-20'
comparesTo: 2026-S32
regimeStatement: Le régime en une phrase, à cette date.
keyIndicators:
  - label: Un libellé court
    value: Une valeur courte
driverOrder: [rates]
trendRefs: []
instrumentRefs: [us10y]
veilleItemRefs: [item-1]
channels: [fonction-reaction]
---
\`\`\`

- \`driverOrder\` : une permutation exacte des drivers actifs listés plus bas, du plus explicatif au moins, jamais un sous-ensemble.
- \`channels\` : le premier est le canal dominant.
- \`instrumentRefs\` et \`veilleItemRefs\` : uniquement des identifiants qui figurent dans le contexte fourni. Une référence à un identifiant absent du contexte est une erreur.

## Le corps

Dans cet ordre exact, chaque bloc étant un composant XML sur son propre paragraphe :

\`\`\`
<CeQuiAChange>
Texte.
</CeQuiAChange>

<CeQuiSestConfirme>
Texte.
</CeQuiSestConfirme>

<RevisionDesScenarios>
Texte de synthèse — la structure exacte des révisions est dans la section JSON, plus bas. Explique en prose ce qui a changé et pourquoi.
</RevisionDesScenarios>

<CeQueJavaisMalLu>
</CeQueJavaisMalLu>

<CeQueJeSurveille>
Texte de synthèse des guets — le détail structuré est dans la section JSON, plus bas.
</CeQueJeSurveille>
\`\`\`

\`<CeQueJavaisMalLu>\` reste **toujours vide** : tu ne l'écris jamais, un humain le remplit après coup. Le composant doit tout de même être présent, ouvrant et fermant, sans rien entre les deux.

## La section JSON

Après le dernier bloc, une unique section délimitée ainsi, et rien d'autre après :

${DELIM_DEBUT}
{
  "scenarioRevisions": [
    {
      "driverId": "rates",
      "branches": [
        {
          "branchId": "hausse",
          "likelihood": "central",
          "why": "Justification obligatoire dès que la vraisemblance d'une branche bouge.",
          "thesis": "Thèse de la branche.",
          "impacts": [
            { "classe": "eq", "direction": "down", "label": "Actions", "text": "..." },
            { "classe": "fi", "direction": "down", "label": "Taux", "text": "..." },
            { "classe": "fx", "direction": "flat", "label": "Change", "text": "..." },
            { "classe": "cm", "direction": "flat", "label": "Matières premières", "text": "..." }
          ],
          "watchSignals": "..."
        }
      ]
    }
  ],
  "guets": [
    {
      "driverId": "rates",
      "libelle": "Ce que tu surveilles, en une phrase.",
      "attendu": "Ce que tu anticipes.",
      "confirmeSi": "Le signal qui validerait la branche dominante.",
      "infirmeSi": "Le signal qui la ferait basculer.",
      "echeance": null,
      "sourceAttendue": ["FED:communique"]
    }
  ]
}
${DELIM_FIN}

Règles pour cette section, vérifiées mécaniquement après ta réponse :
- \`scenarioRevisions\` peut être vide : une semaine où rien ne justifie une révision produit une liste vide, c'est une réponse juste.
- Réviser un driver, c'est émettre ses **trois** branches d'un coup, avec une seule à \`"central"\` — jamais une branche isolée.
- \`impacts\` : exactement quatre entrées, une par classe (\`eq\`, \`fi\`, \`fx\`, \`cm\`), chacune une seule fois.
- \`echeance\` vaut \`null\` quand l'événement n'a pas de date connue.
- Trois guets maximum.
- Cette section doit être un JSON strictement valide — pas de virgule finale, pas de commentaire.`;

// ---------------------------------------------------------------------------
// Contexte factice — pas le vrai pipeline, juste de quoi éprouver le format
// ---------------------------------------------------------------------------

const USER_PROMPT = `# Drivers actifs

- rates (« Taux directeurs ») : La Fed reprend-elle son cycle de hausse ? Branches réelles : hausse, statu-quo, baisses.

# Observations

| id | libellé | dernière valeur | var. semaine |
|---|---|---|---|
| us10y | US 10 ans | 4.32 au 2026-09-19 | +0.08 % |
| us-policy-rate | Taux directeur (Fed funds) | 4.00 au 2026-09-17 | +6.67 % |

# Note précédente (2026-S32)

**Régime affiché :** Statu quo prudent, la Fed attend la donnée d'inflation de septembre.

# Items de veille

- \`item-1\` — Fed — « FOMC relève le taux directeur de 25 points de base »

# Rédige la note 2026-S38, semaine du 2026-09-20, en comparaison avec 2026-S32.`;

// ---------------------------------------------------------------------------
// Le schéma local de la section JSON — aucune contrainte de taille : c'est du Zod pur,
// jamais compilé côté API.
// ---------------------------------------------------------------------------

const impactEntrySchema = z.object({
  classe: z.enum(["eq", "fi", "fx", "cm"]),
  direction: z.enum(["up", "down", "flat"]),
  label: z.string().min(1),
  text: z.string().min(1),
});

const brancheSchema = z.object({
  branchId: z.string().min(1),
  likelihood: z.enum(["central", "moderee", "faible"]),
  why: z.string().min(1),
  thesis: z.string().min(1),
  impacts: z.array(impactEntrySchema).length(4),
  watchSignals: z.string().min(1),
});

const revisionSchema = z.object({
  driverId: z.string().min(1),
  branches: z.array(brancheSchema).length(3),
});

const guetSchema = z.object({
  driverId: z.string().min(1),
  libelle: z.string().min(1),
  attendu: z.string().min(1),
  confirmeSi: z.string().min(1),
  infirmeSi: z.string().min(1),
  echeance: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  sourceAttendue: z.array(z.string().min(1)),
});

const structureSchema = z
  .object({
    scenarioRevisions: z.array(revisionSchema),
    guets: z.array(guetSchema).max(3),
  })
  .refine(
    (d) =>
      d.scenarioRevisions.every((r) => r.branches.filter((b) => b.likelihood === "central").length === 1),
    { message: "chaque révision doit porter une seule branche « central »" },
  )
  .refine(
    (d) =>
      d.scenarioRevisions.every((r) =>
        r.branches.every((b) => {
          const classes = b.impacts.map((i) => i.classe);
          return new Set(classes).size === 4;
        }),
      ),
    { message: "impacts doit couvrir eq, fi, fx, cm sans doublon" },
  );

// ---------------------------------------------------------------------------
// Extraction — mêmes outils que le pipeline réel (gray-matter), un regex pour la section JSON
// ---------------------------------------------------------------------------

const REQUIRED_BLOCKS_HEBDO = [
  "CeQuiAChange",
  "CeQuiSestConfirme",
  "RevisionDesScenarios",
  "CeQueJavaisMalLu",
  "CeQueJeSurveille",
];

type Diagnostic = { ok: boolean; erreurs: string[] };

function analyser(brut: string): Diagnostic {
  const erreurs: string[] = [];

  const debut = brut.indexOf(DELIM_DEBUT);
  const fin = debut >= 0 ? brut.indexOf(DELIM_FIN, debut + DELIM_DEBUT.length) : -1;
  if (debut < 0 || fin < 0) {
    erreurs.push(`section JSON introuvable (délimiteur « ${DELIM_DEBUT} » attendu)`);
    return { ok: false, erreurs };
  }

  const mdxSeul = brut.slice(0, debut).trim();
  const jsonBrut = brut.slice(debut + DELIM_DEBUT.length, fin).trim();

  // Le frontmatter et les blocs, sur le MDX débarrassé de la section JSON.
  const file = matter(mdxSeul);
  if (!file.data || Object.keys(file.data).length === 0) {
    erreurs.push("frontmatter absent ou vide");
  } else {
    for (const champ of ["kind", "date", "regimeStatement", "keyIndicators", "driverOrder"]) {
      if (!(champ in file.data)) erreurs.push(`frontmatter : champ manquant « ${champ} »`);
    }
    if (Array.isArray(file.data.driverOrder) && file.data.driverOrder.length === 0) {
      erreurs.push("frontmatter : driverOrder est vide");
    }
  }

  for (const bloc of REQUIRED_BLOCKS_HEBDO) {
    const re = new RegExp(`<${bloc}>([\\s\\S]*?)</${bloc}>`);
    if (!re.test(file.content)) erreurs.push(`bloc manquant ou mal formé « <${bloc}> »`);
  }
  const maLuMatch = /<CeQueJavaisMalLu>([\s\S]*?)<\/CeQueJavaisMalLu>/.exec(file.content);
  if (maLuMatch && maLuMatch[1].trim().length > 0) {
    erreurs.push("« CeQueJavaisMalLu » ne doit jamais être pré-rempli par le modèle");
  }

  // La section JSON.
  let json: unknown;
  try {
    json = JSON.parse(jsonBrut);
  } catch (e) {
    erreurs.push(`section JSON invalide : ${(e as Error).message}`);
    return { ok: erreurs.length === 0, erreurs };
  }
  const parsed = structureSchema.safeParse(json);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      erreurs.push(`JSON : ${issue.path.join(".") || "(racine)"} — ${issue.message}`);
    }
  }

  return { ok: erreurs.length === 0, erreurs };
}

// ---------------------------------------------------------------------------
// L'appel — messages.create, sans output_config.format
// ---------------------------------------------------------------------------

const client = new Anthropic({ apiKey });

const debut = Date.now();
const message = await client.messages.create({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: USER_PROMPT }],
});
const dureeMs = Date.now() - debut;

const texte = message.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

const diagnostic = analyser(texte);

console.log(`Modèle : ${MODEL} · ${dureeMs} ms · stop_reason: ${message.stop_reason}`);
console.log(
  `Tokens : ${message.usage.input_tokens} entrée / ${message.usage.output_tokens} sortie`,
);
console.log(diagnostic.ok ? "\n✅ Format conforme.\n" : "\n❌ Format non conforme :\n");
for (const e of diagnostic.erreurs) console.log(`  - ${e}`);

if (SHOW_RAW || !diagnostic.ok) {
  console.log("\n--- Sortie brute du modèle ---\n");
  console.log(texte);
}

process.exit(diagnostic.ok ? 0 : 1);
