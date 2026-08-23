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
import { getActiveDrivers } from "../lib/content";

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

const report = await classifyVeilleItems(client, items, { drivers }, caller);

console.log(`\n${report.ok}/${items.length} classé(s), ${report.failed} en échec, ${report.skipped} omis.`);
for (const outcome of report.outcomes.filter((o) => !o.ok)) {
  console.log(`✗ ${outcome.id} — ${outcome.error}`);
}

process.exit(report.failed > 0 && report.ok === 0 ? 1 : 0);
