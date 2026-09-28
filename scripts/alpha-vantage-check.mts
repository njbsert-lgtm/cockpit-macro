/**
 * Vérification à blanc des symboles Alpha Vantage.
 *
 *   npm run alphavantage:check
 *   npm run alphavantage:check -- C50.PAR CAC.PAR    (un sous-ensemble, par symbole)
 *
 * Interroge une fois chaque symbole déclaré dans `config/alpha-vantage-series.ts` —
 * `TIME_SERIES_DAILY` — et affiche les derniers points reçus face aux bornes de plausibilité
 * déclarées. Rien ne doit passer en `enabled: true` sans être sorti vert d'ici.
 *
 * Un délai sépare chaque symbole : le palier gratuit plafonne à 5 appels par minute, le plus
 * serré des quatre sources (voir le commentaire en tête de `config/alpha-vantage-series.ts` et
 * `ALPHA_VANTAGE_CALL_TIMEOUT_MS` dans `lib/alpha-vantage.ts`, où le cron quotidien assume au
 * contraire de n'espacer aucun appel faute de budget). Ce script, lui, n'a pas cette contrainte
 * de budget : un contrôle à blanc peut se permettre d'être lent pour rester propre.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { ALPHA_VANTAGE_SERIES } from "../config/alpha-vantage-series";
import { fetchAlphaVantageSeries } from "../lib/alpha-vantage";

const apiKey = process.env.ALPHA_VANTAGE_API;
if (!apiKey) {
  console.error("ALPHA_VANTAGE_API manquante. Copier .env.example en .env.local et la renseigner.");
  process.exit(1);
}

const only = process.argv.slice(2);
const series =
  only.length > 0
    ? ALPHA_VANTAGE_SERIES.filter((m) => only.includes(m.symbol))
    : ALPHA_VANTAGE_SERIES.filter((m) => m.symbol !== ""); // hsi : aucun ticker à sonder

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let failures = 0;

for (const [index, mapping] of series.entries()) {
  // 13 s entre deux appels : sous les 5 par minute déclarés, avec une marge sur l'arrondi.
  if (index > 0) await sleep(13_000);

  const flag = mapping.enabled ? "actif " : "inactif";
  const header = `${mapping.symbol.padEnd(12)} [${flag}] -> ${mapping.target.id}`;

  const result = await fetchAlphaVantageSeries(mapping, apiKey);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
    if (mapping.disabledReason) console.log(`    (désactivée : ${mapping.disabledReason})`);
    continue;
  }

  console.log(`✓ ${header}`);
  const last = result.points.slice(-3);
  if (last.length === 0) {
    console.log(`    (aucune observation dans la fenêtre demandée)`);
  } else {
    const rendered = last.map((p) => `${p.date} = ${p.value}`).join("  ·  ");
    console.log(`    ${rendered}`);
    console.log(`    bornes déclarées [${mapping.plausible.min} ; ${mapping.plausible.max}]`);
  }

  // La base YTD (`Instrument.ytdBasis`) se saisit à la main une fois par an, d'après la dernière
  // clôture connue au 31 décembre précédent. `outputsize=compact` ne sert que les cent derniers
  // jours de bourse : la clôture du 31/12 n'y figure donc que dans les tout premiers mois de
  // l'année. Signalé plutôt que deviné.
  const cutoff = `${new Date().getUTCFullYear() - 1}-12-31`;
  const ytd = [...result.points].reverse().find((p) => p.date <= cutoff);
  if (ytd) {
    console.log(`    base YTD (dernière clôture ≤ ${cutoff}) : ${ytd.date} = ${ytd.value}`);
  } else if (result.points.length > 0) {
    console.log(
      `    base YTD introuvable dans les cent derniers jours de bourse — recourir à ` +
        `TIME_SERIES_MONTHLY (voir sonder-alphavantage-ytd) pour la retrouver.`,
    );
  }
}

console.log(
  `\n${series.length - failures}/${series.length} symbole(s) conformes à ce que la configuration déclare.`,
);
process.exit(failures > 0 ? 1 : 0);
