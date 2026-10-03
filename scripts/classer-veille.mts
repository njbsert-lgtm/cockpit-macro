/**
 * Passe 2 de veille — classification quotidienne par l'API Claude.
 *
 *   npm run veille:classer
 *
 * Reprend les items en attente (`status: 'nouveau'`) et leur applique la grille des cinq
 * canaux de transmission + le test « flux ou déclaration » (cahier des charges, § Veille),
 * en remplacement du jugement grossier par mots-clés posé par la passe 1.
 *
 * N'écrit jamais `status` : la file de `/triage` reste celle que l'humain peut consulter.
 * Un run en échec est sans conséquence — les items non classés gardent le `isSignal: true`
 * de la passe 1 et sont repris au passage suivant.
 */
import { getAnthropicCaller } from "../lib/anthropic";
import { getWriteClient, missingSupabaseConfig } from "../lib/supabase";
import { getPendingVeilleItems } from "../lib/veille/queries";
import { classifyVeilleItems } from "../lib/veille/classify";
import { getActiveDrivers, getLatestNote } from "../lib/content";
import { AXES } from "../content/axes";
import { enregistrerAnglesMorts } from "../lib/angles-morts";
import { CLASSIFICATION_MODEL } from "../config/ai-models";

const caller = getAnthropicCaller();
if (!caller) {
  console.error("ANTHROPIC_API_KEY manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

const client = getWriteClient();
if (!client) {
  console.error(
    `Supabase n'est pas configuré côté écriture — variables manquantes : ${missingSupabaseConfig().join(", ")}`,
  );
  process.exit(1);
}

const items = await getPendingVeilleItems();
if (items.length === 0) {
  console.log("Aucun item en attente — rien à classer.");
  process.exit(0);
}

const drivers = getActiveDrivers().map((d) => ({ id: d.id, label: d.label, question: d.question }));

console.log(`${items.length} item(s) en attente, ${drivers.length} driver(s) actif(s).`);

// Les guets ouverts de la dernière note publiée : ce sont ceux qu'un item peut résoudre.
const guets = (getLatestNote()?.guets ?? []).filter((g) => g.statut === "ouvert");

console.log(`${AXES.length} axe(s) et ${guets.length} guet(s) ouvert(s) montrés au modèle.`);

const report = await classifyVeilleItems(client, items, { drivers, axes: AXES, guets }, caller);

console.log(`\n${report.ok}/${items.length} classé(s), ${report.failed} en échec, ${report.skipped} omis.`);
for (const outcome of report.outcomes.filter((o) => !o.ok)) {
  console.log(`✗ ${outcome.id} — ${outcome.error}`);
}

const classes = report.outcomes.filter((o) => o.ok);

// La migration de l'étape 4 n'est pas appliquée : la passe fonctionne, mais rien n'est écrit
// des axes. Dit une fois, clairement, plutôt que de laisser croire que tout est enregistré.
if (classes.some((o) => o.etape4NonEcrite)) {
  console.log(
    "\n⚠ Colonnes de l'étape 4 absentes (axe_id, materialite, resout_guet, axe_manquant_propose) : " +
      "appliquer la migration de supabase/schema.sql. La classification d'origine est écrite ; " +
      "axes, matérialité et guets ne le sont pas.",
  );
}
// Les angles morts : matérialité haute, aucun axe. Persistés à part, puisque l'item de veille est
// purgé à quinze jours et que les seuils se comptent sur un trimestre.
const angles = await enregistrerAnglesMorts(client, report.outcomes);
if (angles.tableAbsente) {
  console.log(
    "\n⚠ Table angles_morts absente : appliquer la migration de supabase/schema.sql. Aucun angle mort enregistré.",
  );
} else if (angles.erreur) {
  console.log(`\n⚠ Angles morts non enregistrés : ${angles.erreur}`);
} else {
  console.log(`\nAngles morts : ${angles.enregistres} enregistré(s), ${angles.retires} retiré(s) après reclassement.`);
}
const incoherents = classes.filter((o) => o.axeIncoherent).length;
if (incoherents > 0) console.log(`${incoherents} rattachement(s) à un axe étranger au driver de l'item, écarté(s).`);
const signal = classes.filter((o) => o.isSignal === true);

console.log(`\n${signal.length}/${classes.length} retenu(s) comme signal.`);

function repartition(label: string, valeurs: string[]): void {
  if (valeurs.length === 0) {
    console.log(`\nPar ${label} : aucun item classé.`);
    return;
  }
  const compte = new Map<string, number>();
  for (const v of valeurs) compte.set(v, (compte.get(v) ?? 0) + 1);
  console.log(`\nPar ${label} :`);
  for (const [cle, n] of [...compte.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cle.padEnd(24)} ${n}`);
  }
}

// Un item peut porter plusieurs drivers, ou aucun — « aucun driver » reste visible plutôt que
// de disparaître silencieusement du décompte, même principe que le reste du cahier.
repartition(
  "driver",
  classes.flatMap((o) => (o.driverRefs && o.driverRefs.length > 0 ? o.driverRefs : ["(aucun driver)"])),
);
repartition("source", classes.map((o) => o.source ?? "(source inconnue)"));

console.log(
  `\nJetons consommés (${CLASSIFICATION_MODEL}) : ${report.usage.input} en entrée, ` +
    `${report.usage.output} en sortie (${report.usage.input + report.usage.output} au total).`,
);

process.exit(report.failed > 0 && report.ok === 0 ? 1 : 0);
