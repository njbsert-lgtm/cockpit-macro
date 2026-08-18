/**
 * Vérification à blanc des séries Eurostat.
 *
 *   npm run eurostat:check
 *   npm run eurostat:check -- fr-cpi ez-gdp        (un sous-ensemble)
 *
 * Interroge une fois chaque série déclarée dans `config/eurostat-series.ts` et affiche, pour
 * chacune : **l'identifiant Eurostat complet avec ses dimensions**, la dernière valeur et sa
 * date de publication. C'est ce tableau qui permet de confronter les chiffres à la main avant
 * de leur faire confiance.
 *
 * Le contrôle porte sur `EUROSTAT_SERIES` en entier, sans passer par `EUROSTAT_VERIFIED` : on
 * vérifie précisément pour pouvoir activer ensuite.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { EUROSTAT_SERIES, EUROSTAT_VERIFIED } from "../config/eurostat-series";
import { buildEurostatUrl, parseEurostatResponse } from "../lib/eurostat";

const only = process.argv.slice(2);
const series =
  only.length > 0 ? EUROSTAT_SERIES.filter((m) => only.includes(m.target.id)) : EUROSTAT_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  EUROSTAT_VERIFIED
    ? "EUROSTAT_VERIFIED = true — la collecte est active.\n"
    : "EUROSTAT_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

let failures = 0;

for (const mapping of series) {
  const dims = Object.entries(mapping.dimensions)
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ");
  const header = `${mapping.target.id.padEnd(18)} ${mapping.dataset}  [${dims}]`;

  let payload: unknown;
  try {
    const response = await fetch(buildEurostatUrl(mapping), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      failures += 1;
      console.log(`✗ ${header}`);
      console.log(`    HTTP ${response.status} ${response.statusText}`);
      console.log(`    ${buildEurostatUrl(mapping)}`);
      continue;
    }
    payload = await response.json();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    continue;
  }

  const result = parseEurostatResponse(mapping, payload);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
    console.log(`    ${buildEurostatUrl(mapping)}`);
    continue;
  }

  const last = result.points.at(-1);
  if (!last) {
    // Une réponse vide n'est pas une erreur de collecte, mais elle ne prouve rien non plus :
    // on ne peut pas activer une série dont on n'a vu aucune valeur.
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    aucune observation dans la fenêtre demandée — série non vérifiable`);
    continue;
  }

  console.log(`✓ ${header}`);
  console.log(`    dernière valeur : ${last.value}   au ${last.date}   (${mapping.cadence})`);
  if (result.unitLabel) console.log(`    unité renvoyée  : ${result.unitLabel}`);
  if (mapping.expect.unitLabel) console.log(`    unité attendue  : ${mapping.expect.unitLabel}`);
  console.log(
    `    bornes déclarées [${mapping.plausible.min} ; ${mapping.plausible.max}] · ${result.points.length} point(s)`,
  );

  // Les deux points précédents : c'est ce qui permet de repérer une série qui aurait la bonne
  // unité mais la mauvaise nomenclature — un niveau d'indice là où on attend un taux se voit
  // surtout dans la succession.
  const previous = result.points.slice(-4, -1);
  if (previous.length > 0) {
    console.log(`    avant           : ${previous.map((p) => `${p.date} = ${p.value}`).join("  ·  ")}`);
  }
}

console.log(
  `\n${series.length - failures}/${series.length} série(s) exploitables et conformes à ce que la configuration déclare.`,
);
if (failures === 0 && !EUROSTAT_VERIFIED) {
  console.log("Tout est vert : basculer EUROSTAT_VERIFIED à true dans config/eurostat-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
