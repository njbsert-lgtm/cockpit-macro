/**
 * Vérification à blanc des séries ONS.
 *
 *   npm run ons:check
 *   npm run ons:check -- uk-cpi uk-gdp        (un sous-ensemble)
 *
 * Interroge une fois chaque série déclarée dans `config/ons-series.ts` et affiche, pour
 * chacune : l'identifiant ONS complet (série + dataset), la dernière valeur et sa date de
 * publication. Aucun de ces identifiants n'a été confronté à un appel réseau réel depuis
 * l'environnement où ce fichier a été écrit — c'est ce script qui doit trancher, pas la lecture
 * du code.
 *
 * Le contrôle porte sur `ONS_SERIES` en entier, sans passer par `ONS_VERIFIED` : on vérifie
 * précisément pour pouvoir activer ensuite.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { ONS_SERIES, ONS_VERIFIED } from "../config/ons-series";
import { buildOnsUrl, parseOnsResponse } from "../lib/ons";

const only = process.argv.slice(2);
const series = only.length > 0 ? ONS_SERIES.filter((m) => only.includes(m.target.id)) : ONS_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  ONS_VERIFIED
    ? "ONS_VERIFIED = true — la collecte est active.\n"
    : "ONS_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

let failures = 0;

for (const mapping of series) {
  const header = `${mapping.target.id.padEnd(20)} ${mapping.timeseriesId}/${mapping.datasetId}`;

  let payload: unknown;
  try {
    const response = await fetch(buildOnsUrl(mapping), { headers: { Accept: "application/json" } });
    if (!response.ok) {
      failures += 1;
      console.log(`✗ ${header}`);
      console.log(`    HTTP ${response.status} ${response.statusText}`);
      console.log(`    ${buildOnsUrl(mapping)}`);
      continue;
    }
    payload = await response.json();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    continue;
  }

  const result = parseOnsResponse(mapping, payload);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
    console.log(`    ${buildOnsUrl(mapping)}`);
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
  console.log(`    dernière valeur : ${last.value}   au ${last.date}   (${mapping.cadence})`);
  if (result.unitLabel) console.log(`    unité renvoyée  : ${result.unitLabel}`);
  if (mapping.expect.unitLabel) console.log(`    unité attendue  : ${mapping.expect.unitLabel}`);
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
if (failures === 0 && !ONS_VERIFIED) {
  console.log("Tout est vert : basculer ONS_VERIFIED à true dans config/ons-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
