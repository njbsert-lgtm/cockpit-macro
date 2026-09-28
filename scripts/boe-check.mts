/**
 * Vérification à blanc des séries Bank of England.
 *
 *   npm run boe:check
 *   npm run boe:check -- uk-policy-rate       (un sous-ensemble, par défaut la seule série)
 *
 * Interroge une fois chaque série déclarée dans `config/boe-series.ts` — l'IADB de la BoE, sans
 * clé — et affiche la dernière valeur reçue face aux bornes de plausibilité déclarées. Même rôle
 * que `ons:check` et `estat:check` : confronter la configuration à un appel réel avant d'activer.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { BOE_SERIES, BOE_VERIFIED } from "../config/boe-series";
import { buildBoeUrl, parseBoeCsv } from "../lib/boe";

const only = process.argv.slice(2);
const series = only.length > 0 ? BOE_SERIES.filter((m) => only.includes(m.target.id)) : BOE_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  BOE_VERIFIED
    ? "BOE_VERIFIED = true — la collecte est active.\n"
    : "BOE_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

const now = new Date();
let failures = 0;

for (const mapping of series) {
  const header = `${mapping.target.id.padEnd(20)} ${mapping.seriesCode}`;
  const url = buildBoeUrl(mapping, now);

  let body: string;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failures += 1;
      console.log(`✗ ${header}`);
      console.log(`    HTTP ${response.status} ${response.statusText}`);
      console.log(`    ${url}`);
      continue;
    }
    body = await response.text();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    continue;
  }

  const result = parseBoeCsv(mapping, body);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
    console.log(`    ${url}`);
    continue;
  }

  const last = result.points.at(-1);
  if (!last) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    aucune observation dans la réponse — série non vérifiable`);
    continue;
  }

  console.log(`✓ ${header}`);
  console.log(`    dernière valeur : ${last.value}   au ${last.date}`);
  console.log(
    `    bornes déclarées [${mapping.plausible.min} ; ${mapping.plausible.max}] · ${result.points.length} point(s)`,
  );

  const previous = result.points.slice(-4, -1);
  if (previous.length > 0) {
    console.log(`    avant           : ${previous.map((p) => `${p.date} = ${p.value}`).join("  ·  ")}`);
  }
}

console.log(
  `\n${series.length - failures}/${series.length} série(s) exploitables et conformes à ce que la configuration déclare.`,
);
if (failures === 0 && !BOE_VERIFIED) {
  console.log("Tout est vert : basculer BOE_VERIFIED à true dans config/boe-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
