/**
 * Vérification à blanc des séries OCDE.
 *
 *   npm run oecd:check
 *   npm run oecd:check -- cn-policy-rate       (un sous-ensemble ; par défaut les deux séries)
 *
 * Interroge une fois chaque série déclarée dans `config/oecd-series.ts` — l'API SDMX de l'OCDE (CSV)
 * sans clé — et affiche la dernière valeur reçue face aux bornes de plausibilité
 * déclarées. Même rôle que `ons:check` et `estat:check` : confronter la configuration à un
 * appel réel avant d'activer.
 *
 * N'écrit rien : ni en base, ni dans la configuration. C'est un contrôle, pas une migration.
 */
import { request as httpsRequest } from "node:https";
import { OECD_SERIES, OECD_VERIFIED } from "../config/oecd-series";
import { buildOecdUrl, parseOecdResponse } from "../lib/oecd";

const only = process.argv.slice(2);
const series = only.length > 0 ? OECD_SERIES.filter((m) => only.includes(m.target.id)) : OECD_SERIES;

if (series.length === 0) {
  console.error("Aucune série ne correspond aux identifiants demandés.");
  process.exit(1);
}

console.log(
  OECD_VERIFIED
    ? "OECD_VERIFIED = true — la collecte est active.\n"
    : "OECD_VERIFIED = false — rien n'est collecté tant que ce drapeau n'est pas basculé.\n",
);

let failures = 0;

for (const mapping of series) {
  const header = `${mapping.target.id.padEnd(20)} ${mapping.dataflow}/${mapping.key}`;
  const url = buildOecdUrl(mapping);

  let payload: string;
  try {
    // `Accept-Language: en` : voir `lib/oecd.ts`, l'API répond 500 à la valeur par défaut `*` de fetch.
    const response = await fetch(url, { headers: { "Accept-Language": "en" } });
    payload = await response.text();
  } catch (error) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    appel impossible — ${(error as Error).message}`);
    console.log(`    ${url}`);
    continue;
  }

  const result = parseOecdResponse(mapping, payload);
  if (!result.ok) {
    failures += 1;
    console.log(`✗ ${header}`);
    console.log(`    ${result.error}`);
    console.log(`    ${url}`);
    // Diagnostic : la même URL réussit sous `curl` et échoue sous `fetch` (500 « Internal server
    // error », constaté le 04/10/2026). On rejoue avec des jeux d'en-têtes pour localiser la cause
    // plutôt que de la deviner.
    const variantes: Array<[string, Record<string, string>]> = [
      ["fetch par défaut", {}],
      ["User-Agent Mozilla/5.0", { "User-Agent": "Mozilla/5.0" }],
      ["User-Agent applicatif", { "User-Agent": "Marguerite/1.0 (tableau de bord personnel)" }],
      ["Accept */*", { Accept: "*/*" }],
      ["Accept-Encoding identity", { "Accept-Encoding": "identity" }],
      ["Mozilla + Accept */* + identity", { "User-Agent": "Mozilla/5.0", Accept: "*/*", "Accept-Encoding": "identity" }],
      ["Accept-Language en", { "Accept-Language": "en" }],
      ["imite curl", { "User-Agent": "curl/8.5.0", Accept: "*/*", "Accept-Language": "en", "Accept-Encoding": "identity" }],
    ];
    for (const [nom, headers] of variantes) {
      try {
        const r = await fetch(url, { headers });
        const t = await r.text();
        console.log(`    · ${nom} : HTTP ${r.status} — ${t.slice(0, 60).replace(/\s+/g, " ")}`);
      } catch (e) {
        console.log(`    · ${nom} : ${(e as Error).message}`);
      }
    }
    // Client de bas niveau : seuls les en-têtes posés ici partent, ni `Sec-Fetch-Mode` ni `Accept-Language`.
    await new Promise<void>((resolve) => {
      const u = new URL(url);
      const req = httpsRequest(
        { host: u.host, path: u.pathname + u.search, method: "GET", headers: { "User-Agent": "curl/8.5.0", Accept: "*/*" } },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            console.log(`    · node:https minimal : HTTP ${res.statusCode} — ${body.slice(0, 60).replace(/\s+/g, " ")}`);
            resolve();
          });
        },
      );
      req.on("error", (e) => {
        console.log(`    · node:https minimal : ${e.message}`);
        resolve();
      });
      req.end();
    });
    // La clé avec jokers, qui répondait sous curl.
    const partielle = url.replace(mapping.key, "Q.Y.CHN.S1.S1.B1GQ....PC.L.GY.");
    try {
      const r = await fetch(partielle);
      const t = await r.text();
      console.log(`    · clé partielle, fetch : HTTP ${r.status} — ${t.slice(0, 60).replace(/\s+/g, " ")}`);
    } catch (e) {
      console.log(`    · clé partielle, fetch : ${(e as Error).message}`);
    }
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
if (failures === 0 && !OECD_VERIFIED) {
  console.log("Tout est vert : basculer OECD_VERIFIED à true dans config/oecd-series.ts.");
}
process.exit(failures > 0 ? 1 : 0);
