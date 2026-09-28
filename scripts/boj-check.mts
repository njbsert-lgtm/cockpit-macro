/**
 * Vérification à blanc des séries Bank of Japan.
 *
 *   npm run boj:check
 *   npm run boj:check -- jp-policy-rate       (un sous-ensemble, par défaut la seule série)
 *
 * Interroge une fois chaque série déclarée dans `config/boj-series.ts` — l'API BoJ Time-Series
 * Data Search, sans clé — et affiche la dernière valeur reçue face aux bornes de plausibilité
 * déclarées. Même rôle que `ons:check` et `estat:check` : confronter la configuration à un
 * appel réel avant d'activer.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { BOJ_SERIES, BOJ_VERIFIED } from "../config/boj-series";
import { buildBojUrl, parseBojResponse } from "../lib/boj";

const only = process.argv.slice(2);
const series = only.length > 0 ? BOJ_SERIES.filter((m) => only.includes(m.target.id)) : BOJ_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  BOJ_VERIFIED
    ? "BOJ_VERIFIED = true — la collecte est active.\n"
    : "BOJ_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

const now = new Date();
let failures = 0;

for (const mapping of series) {
  const header = `${mapping.target.id.padEnd(20)} ${mapping.db}/${mapping.code}`;
  const url = buildBojUrl(mapping, now);

  let payload: unknown;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    payload = await response.json();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    console.log(`    ${url}`);
    continue;
  }

  const result = parseBojResponse(mapping, payload);
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
if (failures === 0 && !BOJ_VERIFIED) {
  console.log("Tout est vert : basculer BOJ_VERIFIED à true dans config/boj-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
