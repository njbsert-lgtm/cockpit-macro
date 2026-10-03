/**
 * Classement rétrospectif des items de veille contre les axes des drivers — LECTURE SEULE.
 *
 *   npm run veille:retro-axes
 *
 * Reprend les items déjà classés « signal » par la passe 2 et leur applique le nouveau
 * classement : driver, axe (`content/axes.ts`), matérialité, guet résolu. N'écrit rien — ni
 * `veille_items`, ni aucun fichier : le but est de *voir* l'écart entre les axes posés a priori
 * et ce qui remonte réellement, avant qu'un compteur ne l'agrège.
 *
 * Le modèle a le droit de répondre « aucun axe » et « aucun driver », et le prompt le lui dit
 * en toutes lettres : un modèle qui force un rattachement ferait disparaître exactement ce
 * qu'on cherche à mesurer.
 */
import { z } from "zod";
import { getAnthropicCaller } from "../lib/anthropic";
import { getReadClient, getWriteClient } from "../lib/supabase";
import { getActiveDrivers, getLatestNote } from "../lib/content";
import { AXES } from "../content/axes";
import { CLASSIFICATION_MODEL } from "../config/ai-models";

const caller = getAnthropicCaller();
if (!caller) {
  console.error("ANTHROPIC_API_KEY manquante.");
  process.exit(1);
}
const client = getReadClient() ?? getWriteClient();
if (!client) {
  console.error("Supabase non configuré.");
  process.exit(1);
}

type Row = {
  id: string;
  title: string;
  source: string;
  published_at: string;
  driver_refs: string[];
  is_signal: boolean;
};

const { data, error } = await client
  .from("veille_items")
  .select("id, title, source, published_at, driver_refs, is_signal")
  .not("classified_at", "is", null)
  .order("published_at", { ascending: false })
  .limit(1000);
if (error) {
  console.error(`Lecture impossible : ${error.message}`);
  process.exit(1);
}
const toutes = (data ?? []) as Row[];
const items = toutes.filter((r) => r.is_signal);
console.log(
  `${toutes.length} item(s) classé(s) par la passe 2 en base, dont ${items.length} retenu(s) comme signal — ce sont ces derniers qu'on reclasse.`,
);
if (items.length === 0) process.exit(0);

const drivers = getActiveDrivers().map((d) => ({ id: d.id, label: d.label, question: d.question }));
const driverIds = drivers.map((d) => d.id);
const axeIds = AXES.map((a) => a.id);
const axeParId = new Map(AXES.map((a) => [a.id, a]));
const guets = (getLatestNote()?.guets ?? []).filter((g) => g.statut === "ouvert");
const guetIds = guets.map((g) => g.id);

const SYSTEM = `Vous rattachez des items de veille à la grille d'un tableau de bord macroéconomique. Chaque item n'est connu que par son titre, sa source et sa date : classez uniquement ce qui vous est montré, sans supposer de contenu.

La grille : des DRIVERS (une incertitude active) et, pour chacun, des AXES — les chemins par lesquels cette incertitude atteint les prix. Un axe a un mécanisme précis.

Pour chaque item, répondez à trois questions :
1. driverId — l'item touche-t-il l'incertitude d'un driver ? Sinon null.
2. axeId — si oui, agit-il PAR le mécanisme d'un des axes de CE driver ? Sinon null.
3. materialite — haute : l'événement, s'il se confirme, déplace à lui seul la vraisemblance d'une branche du driver. moyenne : il informe un axe sans le déplacer. faible : contexte.

RÈGLE ESSENTIELLE : « aucun » est une réponse légitime et attendue, pas un échec. Ne forcez JAMAIS un rattachement. Un axe ne convient que si le mécanisme décrit est bien celui par lequel l'événement atteint les prix ; une proximité de thème ne suffit pas. Un item rattaché à un driver mais à aucun de ses axes est une information précieuse — il montre que la grille n'a pas de case pour lui. Un item qui n'entre dans aucun driver aussi.

axeManquantPropose : seulement quand axeId est null, pour une matérialité haute ou moyenne, en une courte expression — le chemin de transmission qui manque, pas un résumé de l'item. Sinon null.

resoutGuet : l'identifiant du guet ouvert que l'item résout, s'il en résout un ; sinon null. Ne devinez pas.

reasoning : une phrase, pour l'audit — jamais conservée.`;

function formatGrille(): string {
  return drivers
    .map((d) => {
      const axes = AXES.filter((a) => a.driverId === d.id)
        .map((a) => `    - ${a.id} (« ${a.libelle} ») : ${a.mecanisme}`)
        .join("\n");
      return `- ${d.id} (« ${d.label} ») : ${d.question}\n  Axes :\n${axes}`;
    })
    .join("\n");
}

function formatGuets(): string {
  if (guets.length === 0) return "Aucun guet ouvert.";
  return guets
    .map((g) => `- ${g.id} | driver ${g.driverId} | ${g.libelle} | attendu : ${g.attendu} | confirmé si : ${g.confirmeSi} | infirmé si : ${g.infirmeSi}`)
    .join("\n");
}

type Verdict = {
  id: string;
  driverId: string | null;
  axeId: string | null;
  materialite: "haute" | "moyenne" | "faible";
  resoutGuet: string | null;
  axeManquantPropose: string | null;
  reasoning: string;
  incoherent?: boolean;
};

const verdicts = new Map<string, Verdict>();
let usageIn = 0;
let usageOut = 0;
const echecs: string[] = [];
const BATCH = 10;

for (let i = 0; i < items.length; i += BATCH) {
  const lot = items.slice(i, i + BATCH);
  const ids = lot.map((l) => l.id) as [string, ...string[]];
  const schema = z.object({
    items: z.array(
      z.object({
        id: z.enum(ids),
        driverId: z.enum(driverIds as [string, ...string[]]).nullable(),
        axeId: z.enum(axeIds as [string, ...string[]]).nullable(),
        materialite: z.enum(["haute", "moyenne", "faible"]),
        resoutGuet: guetIds.length > 0 ? z.enum(guetIds as [string, ...string[]]).nullable() : z.null(),
        axeManquantPropose: z.string().max(140).nullable(),
        reasoning: z.string().max(250),
      }),
    ),
  });
  const user =
    `Grille :\n${formatGrille()}\n\nGuets ouverts :\n${formatGuets()}\n\nItems :\n` +
    lot.map((l) => `- id=${l.id} | ${l.published_at.slice(0, 10)} | ${l.source} | ${l.title}`).join("\n");
  try {
    const res = await caller({ system: SYSTEM, user, schema, model: CLASSIFICATION_MODEL, thinking: false });
    usageIn += res.usage.input;
    usageOut += res.usage.output;
    for (const v of res.value.items) verdicts.set(v.id, v);
  } catch (err) {
    echecs.push(`lot ${i / BATCH + 1} : ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Un axe n'a de sens que dans son driver : un rattachement croisé est invalide, et on le dit.
for (const v of verdicts.values()) {
  if (v.axeId && axeParId.get(v.axeId)?.driverId !== v.driverId) {
    v.incoherent = true;
    v.axeId = null;
  }
}

const classes = items.filter((i) => verdicts.has(i.id));
const cat = (v: Verdict) => (v.axeId ? "axe" : v.driverId ? "driver-sans-axe" : "sans-driver");
const total = classes.length;
const pct = (n: number) => `${n} (${total ? Math.round((n / total) * 100) : 0} %)`;

console.log(`\n${total}/${items.length} item(s) reclassé(s)${echecs.length ? `, ${echecs.length} lot(s) en échec` : ""}.`);
for (const e of echecs) console.log(`  ✗ ${e}`);

const compte = { axe: 0, "driver-sans-axe": 0, "sans-driver": 0 };
const parMat: Record<string, Record<string, number>> = {};
for (const it of classes) {
  const v = verdicts.get(it.id)!;
  compte[cat(v)]++;
  parMat[v.materialite] ??= { axe: 0, "driver-sans-axe": 0, "sans-driver": 0 };
  parMat[v.materialite][cat(v)]++;
}
console.log(`\n=== Résultat global ===`);
console.log(`Rattachés à un axe existant : ${pct(compte.axe)}`);
console.log(`Driver trouvé, aucun axe    : ${pct(compte["driver-sans-axe"])}`);
console.log(`Aucun driver                : ${pct(compte["sans-driver"])}`);
const inco = [...verdicts.values()].filter((v) => v.incoherent).length;
if (inco > 0) console.log(`(dont ${inco} rattachement(s) axe/driver incohérent(s), comptés sans axe)`);

console.log(`\n=== Par matérialité ===`);
for (const m of ["haute", "moyenne", "faible"]) {
  const r = parMat[m] ?? { axe: 0, "driver-sans-axe": 0, "sans-driver": 0 };
  console.log(`${m.padEnd(8)} axe ${r.axe} · driver sans axe ${r["driver-sans-axe"]} · sans driver ${r["sans-driver"]}`);
}

console.log(`\n=== Activation de chaque axe ===`);
for (const a of AXES) {
  const n = classes.filter((i) => verdicts.get(i.id)!.axeId === a.id).length;
  console.log(`${a.driverId.padEnd(6)} ${a.id.padEnd(28)} ${String(n).padStart(3)}  [${a.lisibilite}]${n === 0 ? "  ← jamais activé" : ""}`);
}

const accord = classes.filter((i) => {
  const v = verdicts.get(i.id)!;
  return v.driverId !== null && i.driver_refs.includes(v.driverId);
}).length;
const avecDriverAvant = classes.filter((i) => i.driver_refs.length > 0).length;
console.log(`\nDriver de la passe 2 retrouvé : ${accord}/${avecDriverAvant} item(s) qui en avaient un.`);

const ordre = { haute: 0, moyenne: 1, faible: 2 } as const;
const sansAxe = classes
  .filter((i) => !verdicts.get(i.id)!.axeId)
  .sort((a, b) => ordre[verdicts.get(a.id)!.materialite] - ordre[verdicts.get(b.id)!.materialite] || b.published_at.localeCompare(a.published_at));

console.log(`\n=== Items sans axe (${sansAxe.length}) — matérialité décroissante ===`);
for (const i of sansAxe) {
  const v = verdicts.get(i.id)!;
  console.log(
    `[${v.materialite}] ${i.published_at.slice(0, 10)} ${(v.driverId ?? "—").padEnd(5)} ${i.source} | ${i.title.slice(0, 120)}` +
      (v.axeManquantPropose ? `\n        → axe manquant proposé : ${v.axeManquantPropose}` : ""),
  );
}

const avecAxe = classes.filter((i) => verdicts.get(i.id)!.axeId);
console.log(`\n=== Items rattachés (${avecAxe.length}) ===`);
for (const a of AXES) {
  const l = avecAxe.filter((i) => verdicts.get(i.id)!.axeId === a.id);
  if (l.length === 0) continue;
  console.log(`\n${a.driverId} / ${a.id} (${l.length})`);
  for (const i of l) {
    const v = verdicts.get(i.id)!;
    console.log(`  [${v.materialite}] ${i.published_at.slice(0, 10)} ${i.source} | ${i.title.slice(0, 110)}`);
  }
}

const resolus = classes.filter((i) => verdicts.get(i.id)!.resoutGuet);
console.log(`\n=== Guets résolus (${resolus.length}) ===`);
for (const i of resolus) console.log(`  ${verdicts.get(i.id)!.resoutGuet} ← ${i.title.slice(0, 110)}`);

console.log(`\nJetons (${CLASSIFICATION_MODEL}) : ${usageIn} en entrée, ${usageOut} en sortie.`);
