/**
 * Exploration d'Eurostat, pour choisir un code plutôt que le deviner.
 *
 *   npm run eurostat:explore -- catalogue hicp        cherche un dataset par mot-clé
 *   npm run eurostat:explore -- une_rt_m geo          liste les codes d'une dimension
 *
 * Le pendant de `eurostat:check` : celui-ci vérifie ce qui est déjà déclaré, celui-là sert
 * quand un code manque ou qu'un code refusé doit être remplacé. Un identifiant de dimension
 * mal choisi ne se corrige pas au jugé — il se lit dans la nomenclature de la source.
 *
 * N'écrit rien.
 */
const BASE = "https://ec.europa.eu/eurostat/api/dissemination";

const [mode, argument] = process.argv.slice(2);

if (!mode) {
  console.error("Usage : eurostat:explore -- catalogue <terme>  |  <dataset> <dimension>");
  process.exit(1);
}

if (mode === "catalogue") {
  const term = (argument ?? "").toLowerCase();
  const response = await fetch(`${BASE}/catalogue/toc/txt?lang=en`);
  if (!response.ok) {
    console.error(`catalogue illisible — HTTP ${response.status}`);
    process.exit(1);
  }
  const lines = (await response.text()).split("\n");
  const hits = lines.filter((l) => l.toLowerCase().includes(term));
  console.log(`${hits.length} entrée(s) contenant « ${term} » :\n`);
  // Le TOC est tabulé : titre, code, type, date de dernière mise à jour. On le rend tel quel,
  // c'est la source qui décrit sa propre nomenclature.
  for (const line of hits.slice(0, 120)) console.log(line.trim());
  if (hits.length > 120) console.log(`\n… ${hits.length - 120} autre(s) non affichée(s).`);
  process.exit(0);
}

const dataset = mode;
const dimension = argument;
if (!dimension) {
  console.error("Préciser la dimension à lister, ex. : eurostat:explore -- une_rt_m geo");
  process.exit(1);
}

// Une seule période : on veut la nomenclature, pas les données.
const url = `${BASE}/statistics/1.0/data/${dataset}?format=JSON&lang=EN&lastTimePeriod=1`;
const response = await fetch(url, { headers: { Accept: "application/json" } });
if (!response.ok) {
  console.error(`HTTP ${response.status} — ${url}`);
  process.exit(1);
}

const payload = (await response.json()) as {
  id?: string[];
  size?: number[];
  dimension?: Record<string, { label?: string; category?: { label?: Record<string, string> } }>;
};

const dims = payload.id ?? [];
console.log(`${dataset} — dimensions : ${dims.map((d, i) => `${d}(${payload.size?.[i]})`).join(" · ")}\n`);

const found = payload.dimension?.[dimension];
if (!found) {
  console.error(`Dimension « ${dimension} » absente de ${dataset}.`);
  process.exit(1);
}

const labels = found.category?.label ?? {};
const entries = Object.entries(labels);
console.log(`${dimension} — ${entries.length} code(s) :\n`);
for (const [code, label] of entries) console.log(`  ${code.padEnd(16)} ${label}`);
