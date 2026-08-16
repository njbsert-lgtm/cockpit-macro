/**
 * Vérification à blanc des métadonnées FRED.
 *
 *   npm run fred:check
 *
 * Interroge une fois chaque série déclarée dans `config/fred-series.ts` et confronte son
 * unité et sa fréquence réelles à ce que la configuration annonce. Rien ne doit passer en
 * `enabled: true` sans être sorti vert d'ici.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { FRED_SERIES } from "../config/fred-series";
import { checkSeriesMetadata, fetchFredSeries } from "../lib/fred";

const apiKey = process.env.FRED_API_KEY;
if (!apiKey) {
  console.error("FRED_API_KEY manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

const only = process.argv.slice(2);
const series = only.length > 0 ? FRED_SERIES.filter((m) => only.includes(m.seriesId)) : FRED_SERIES;

let failures = 0;

for (const mapping of series) {
  const flag = mapping.enabled ? "actif " : "inactif";
  const header = `${mapping.seriesId.padEnd(18)} [${flag}] -> ${mapping.target.id}`;

  const meta = await checkSeriesMetadata(mapping, apiKey);
  if (!meta.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    for (const problem of meta.problems) console.log(`    ${problem}`);
    if (mapping.disabledReason) console.log(`    (désactivée : ${mapping.disabledReason})`);
    continue;
  }

  console.log(`✓ ${header}`);
  console.log(`    « ${meta.actual!.title} »`);
  console.log(`    ${meta.actual!.units} · ${meta.actual!.frequency}`);

  // Un aperçu des valeurs réellement renvoyées : c'est ce qui confirme que la transformation
  // d'unité fait bien ce qu'on croit, et que les bornes de plausibilité sont bien calibrées.
  const observations = await fetchFredSeries(mapping, apiKey);
  if (!observations.ok) {
    failures += 1;
    console.log(`    ✗ observations : ${observations.error}`);
    continue;
  }
  const last = observations.points.slice(-3);
  if (last.length === 0) {
    console.log(`    (aucune observation dans la fenêtre demandée)`);
  } else {
    const rendered = last.map((p) => `${p.date} = ${p.value}`).join("  ·  ");
    console.log(`    ${rendered}`);
    console.log(`    bornes déclarées [${mapping.plausible.min} ; ${mapping.plausible.max}]`);
  }
}

console.log(
  `\n${series.length - failures}/${series.length} série(s) conformes à ce que la configuration déclare.`,
);
process.exit(failures > 0 ? 1 : 0);
