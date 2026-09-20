/**
 * `npm run notion:check` — la vérification d'accès à la base « Vues Macro — Synthèses hebdo »,
 * avant de laisser un run hebdomadaire en dépendre.
 *
 * Même rôle que `fred:check`, `eurostat:check` et les autres : confronter ce que la
 * configuration suppose à ce que la source répond réellement. Ici, un seul piège justifie à lui
 * seul le script — **l'intégration interne doit être ajoutée aux partages de la base**. Sans ce
 * partage, le jeton est valide, l'API répond 200, et la base paraît vide. L'erreur ressemble à
 * un problème de données alors que c'est un problème de droits, et on la cherche longtemps.
 *
 *   npm run notion:check
 *   npm run notion:check -- --week=2026-S38
 *   npm run notion:check -- --show        # affiche le markdown récupéré
 */
import { chercherFiche, configNotion, emetteursCites } from "../lib/notion";
import { isoWeekOf } from "../lib/iso-week";

const args = process.argv.slice(2);
const semaine = args.find((a) => a.startsWith("--week="))?.slice("--week=".length);
const SHOW = args.includes("--show");

const config = configNotion();
if (!config) {
  console.error(
    "NOTION_TOKEN et NOTION_VUES_MACRO_DB attendues. Créer une intégration interne en lecture\n" +
      "seule sur notion.so/my-integrations, puis **partager la base avec elle** — sans ce partage\n" +
      "explicite, le jeton est valide mais ne voit rien.",
  );
  process.exit(1);
}

const isoWeek = semaine ?? isoWeekOf(new Date().toISOString().slice(0, 10));
console.log(`Semaine visée : ${isoWeek}\n`);

const resultat = await chercherFiche(isoWeek, config);

if (!resultat.ok) {
  console.error(`❌ Appel en échec — ${resultat.erreur}`);
  process.exit(1);
}

if (!resultat.fiche) {
  console.error(`❌ Aucune fiche — ${resultat.raison}`);
  process.exit(1);
}

const { fiche } = resultat;
console.log(`✅ Fiche « ${fiche.semaine} »`);
console.log(`   page      : ${fiche.pageId}`);
console.log(`   url       : ${fiche.url}`);
console.log(`   contenu   : ${fiche.contenu.length} caractères, ${fiche.contenu.split("\n\n").length} bloc(s)`);
console.log(`   émetteurs : ${emetteursCites(fiche.contenu).join(" · ") || "aucun détecté"}`);

// Un contenu vide est le second piège : la page existe, la propriété est bonne, mais la fiche
// n'a pas encore été alimentée. Le run le traiterait comme une absence de fiche — autant le
// dire ici plutôt que de le découvrir samedi matin.
if (fiche.contenu.trim().length === 0) {
  console.error("\n❌ La fiche existe mais son contenu est vide.");
  process.exit(1);
}

if (SHOW) console.log(`\n--- markdown récupéré ---\n\n${fiche.contenu}`);

console.log("\nLa propriété « Lue » n'est pas touchée : seul un run réussi la bascule.");
process.exit(0);
