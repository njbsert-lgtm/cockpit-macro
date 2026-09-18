/**
 * Vérification à blanc des séries e-Stat.
 *
 *   npm run estat:check
 *   npm run estat:check -- jp-cpi jp-wages        (un sous-ensemble)
 *
 * Interroge une fois chaque série déclarée dans `config/estat-series.ts` et affiche, pour
 * chacune : la table et les dimensions fixées, la dernière valeur et sa date. Nécessite
 * `ESTAT_APP_ID` (clé d'application e-Stat, gratuite sur inscription).
 *
 * Le contrôle porte sur `ESTAT_SERIES` en entier, sans passer par `ESTAT_VERIFIED` : on
 * vérifie précisément pour pouvoir activer ensuite.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { ESTAT_SERIES, ESTAT_VERIFIED } from "../config/estat-series";
import { buildEstatUrl, parseEstatResponse } from "../lib/estat";

function seriesKey(mapping: (typeof ESTAT_SERIES)[number]): string {
  const dims = Object.entries(mapping.filters)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return `${mapping.statsDataId}?${dims}`;
}

const appId = process.env.ESTAT_APP_ID;
if (!appId) {
  console.error("ESTAT_APP_ID n'est pas définie — impossible d'appeler e-Stat.");
  process.exit(1);
}

const only = process.argv.slice(2);
const series =
  only.length > 0 ? ESTAT_SERIES.filter((m) => only.includes(m.target.id)) : ESTAT_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  ESTAT_VERIFIED
    ? "ESTAT_VERIFIED = true — la collecte est active.\n"
    : "ESTAT_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

let failures = 0;
const now = new Date();

for (const mapping of series) {
  const key = seriesKey(mapping);
  const header = `${mapping.target.id.padEnd(20)} ${key}`;
  const url = buildEstatUrl(mapping, appId, now);

  let payload: unknown;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      failures += 1;
      console.log(`✗ ${header}`);
      console.log(`    HTTP ${response.status} ${response.statusText}`);
      continue;
    }
    payload = await response.json();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    continue;
  }

  const result = parseEstatResponse(mapping, payload);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
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
if (failures === 0 && !ESTAT_VERIFIED) {
  console.log("Tout est vert : basculer ESTAT_VERIFIED à true dans config/estat-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
