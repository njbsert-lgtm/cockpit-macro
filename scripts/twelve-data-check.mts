/**
 * Vérification à blanc des symboles Twelve Data.
 *
 *   npm run twelve-data:check
 *
 * Interroge une fois chaque symbole déclaré dans `config/twelve-data-series.ts` — `/quote` pour
 * les métadonnées, `/time_series` pour un aperçu des valeurs — et confronte la devise réelle à
 * ce que la configuration annonce. Rien ne doit passer en `enabled: true` sans être sorti vert
 * d'ici.
 *
 * Un délai sépare chaque symbole : le palier gratuit plafonne à 8 appels par minute, confirmé
 * en sondant l'API réelle (voir les commentaires de `config/twelve-data-series.ts`).
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { TWELVE_DATA_SERIES } from "../config/twelve-data-series";
import { checkSymbolMetadata, fetchTwelveDataSeries } from "../lib/twelve-data";

const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!apiKey) {
  console.error("TWELVE_DATA_API_KEY manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

const only = process.argv.slice(2);
const series =
  only.length > 0 ? TWELVE_DATA_SERIES.filter((m) => only.includes(m.symbol)) : TWELVE_DATA_SERIES;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let failures = 0;

for (const [index, mapping] of series.entries()) {
  // Deux appels par symbole (métadonnées + observations) : un délai toutes les deux itérations
  // suffit à rester sous 8 appels par minute sans ralentir inutilement un contrôle à un seul
  // symbole.
  if (index > 0) await sleep(8_000);

  const flag = mapping.enabled ? "actif " : "inactif";
  const header = `${mapping.symbol.padEnd(12)} [${flag}] -> ${mapping.target.id}`;

  const meta = await checkSymbolMetadata(mapping, apiKey);
  if (!meta.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    for (const problem of meta.problems) console.log(`    ${problem}`);
    if (mapping.disabledReason) console.log(`    (désactivée : ${mapping.disabledReason})`);
    continue;
  }

  console.log(`✓ ${header}`);
  console.log(`    « ${meta.actual?.name ?? "(sans nom)"} » · ${meta.actual?.currency ?? "?"}`);

  await sleep(8_000);

  const observations = await fetchTwelveDataSeries(mapping, apiKey);
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

  // La base YTD (`Instrument.ytdBasis`) se saisit à la main une fois par an, d'après la dernière
  // clôture connue au 31 décembre précédent. L'afficher ici évite un aller-retour séparé quand
  // une série vient d'être activée.
  const cutoff = `${new Date().getUTCFullYear() - 1}-12-31`;
  const ytd = [...observations.points].reverse().find((p) => p.date <= cutoff);
  if (ytd) console.log(`    base YTD (dernière clôture ≤ ${cutoff}) : ${ytd.date} = ${ytd.value}`);
}

console.log(
  `\n${series.length - failures}/${series.length} symbole(s) conformes à ce que la configuration déclare.`,
);
process.exit(failures > 0 ? 1 : 0);
