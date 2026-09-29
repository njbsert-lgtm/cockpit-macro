import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getWriteClient, missingSupabaseConfig } from "@/lib/supabase";
import {
  runAlphaVantageIngest,
  runBoeIngest,
  runBojIngest,
  runEstatIngest,
  runEurostatIngest,
  runIngest,
  runOnsIngest,
  runSpreadIngest,
  runTwelveDataIngest,
  type IngestReport,
} from "@/lib/ingest";
import { runVeilleCollect, type VeilleCollector, type VeilleReport } from "@/lib/veille/collect";
import { collectInstitutional } from "@/lib/veille/sources/institutional";
import { collectEdgar } from "@/lib/veille/sources/edgar";
import { collectGdelt } from "@/lib/veille/sources/gdelt";

/**
 * L'orchestrateur de la collecte quotidienne. Déclenché par le cron Vercel à 6 h UTC, jamais à
 * la demande. Le plan Hobby n'autorise qu'un déclenchement quotidien : cette route exécute donc
 * dix modules indépendants l'un après l'autre plutôt que d'ajouter un second cron.
 *
 * L'ordre n'est pas négociable : FRED d'abord, et durablement écrit, avant que les spreads, puis
 * Twelve Data, puis Alpha Vantage, puis Eurostat, puis ONS, puis e-Stat, puis BoE, puis BoJ, puis
 * la veille ne démarrent. Si l'un des modules suivants échoue — y compris une exception non
 * rattrapée — FRED est déjà en base ; c'est pour ça que son résultat ne dépend de rien de ce qui
 * suit. Le statut HTTP de la réponse ne reflète que FRED : ce sont ses données qui priment. Les
 * spreads passent juste après FRED parce qu'ils dépendent de ce qu'il vient d'écrire (`us10y`,
 * `de10y`, `fr10y`), puis Twelve Data et Alpha Vantage : ce sont aussi des données de marché
 * quotidiennes, avant Eurostat, ONS, e-Stat, BoE et BoJ, tous mensuels ou trimestriels sauf les
 * deux derniers — business-daily, mais de faible volume (une série chacun).
 *
 * Chaque module journalise pour son compte. FRED, Twelve Data, Alpha Vantage, Eurostat, ONS,
 * e-Stat, BoE et BoJ écrivent tous dans `series_health`, mais sous une colonne `source`
 * distincte, si bien que l'indicateur de fraîcheur les présente séparément : un échec de l'un ne
 * peut jamais se lire comme un échec d'un autre. Les spreads n'y écrivent rien — voir le
 * commentaire sur `runSpreadIngest` dans `lib/ingest.ts`, leur fraîcheur est entièrement celle de
 * leurs jambes. La veille garde sa propre table, `veille_health`, qui n'alimente pas cet
 * indicateur.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le temps total qu'on s'autorise, nettement sous les 60 s de `maxDuration`.
 *
 * Un dépassement côté plateforme renvoie un 504 et **perd le rapport entier** : on ne sait
 * alors ni ce qui a été écrit, ni pourquoi ça a calé. La marge existe pour que la réponse
 * parte toujours, même quand chaque module a consommé son budget jusqu'au bout.
 */
const TOTAL_BUDGET_MS = 58_000;

/**
 * Le partage du temps entre modules, dans l'ordre de priorité du cahier.
 *
 * FRED d'abord et servi le plus largement : ce sont les données de marché, elles priment.
 * Twelve Data ensuite — deux symboles actifs, un budget court suffit. Eurostat, ONS et e-Stat
 * ensuite, mensuels et trimestriels, donc sans urgence à la journée. La veille en dernier avec
 * ce qui reste, parce qu'elle est la seule à savoir reprendre où elle s'est arrêtée grâce à son
 * curseur.
 *
 * **FRED et Eurostat relevés le 28/09** : la liste FRED est passée de 25 à 32 séries (Bund/OAT
 * élargi à quatre pays de plus, cuivre, taux directeur BCE, PIB indien) et Eurostat de 20 à 25
 * (solde budgétaire, dette publique) sans que leur budget ne suive. Conséquence réelle,
 * constatée en production : `wti` (DCOILWTICO), en fin de liste FRED, n'a plus été confirmée
 * depuis six jours — deux ou trois appels lents ailleurs dans la liste suffisaient à épuiser les
 * 20 s d'origine avant de l'atteindre, sans qu'aucune erreur ne soit jamais journalisée (rien
 * n'était tenté, ce n'est pas un échec). Le délai par appel de FRED est resserré à 5 s
 * (`lib/fred.ts`) en plus de ce relèvement, pour qu'un seul appel lent ne puisse plus à lui seul
 * coûter le quart du budget du module.
 */
const FRED_BUDGET_MS = 27_000;
// Aucun appel réseau, deux lectures en base et deux écritures : un budget court suffit très
// largement. Existe surtout pour respecter la même discipline que les autres modules — s'arrêter
// proprement si jamais la base traîne — pas parce que le calcul lui-même est coûteux.
const SPREAD_BUDGET_MS = 1_000;
// Deux symboles actifs : largement le temps de les servir même en cas de latence. Resserré de
// 5 à 3 s le 28/09 pour faire de la place à Alpha Vantage sans dépasser TOTAL_BUDGET_MS — deux
// appels tiennent largement dedans.
const TWELVE_DATA_BUDGET_MS = 3_000;
// Sept symboles, tous quotidiens. **Renversement assumé le 29/09** : le choix initial (aucun
// espacement, « un refus occasionnel se lit comme un échec ordinaire ») donnait en production
// 4 échecs sur 7 chaque jour, pas « occasionnellement » — le message d'erreur d'Alpha Vantage
// nomme une limite à la seconde (« 1 request per second »), que sept appels tirés en quelques
// dizaines de millisecondes violent presque à coup sûr. `runAlphaVantageIngest` espace
// désormais chaque appel de 1,1 s (`ALPHA_VANTAGE_CALL_SPACING_MS`, `lib/ingest.ts`) : six
// intervalles, ~6,6 s, plus la latence réelle des sept appels — 10 s couvre confortablement le
// cas courant, un jour anormalement lent voit `outOfTime` sauter les derniers symboles plutôt
// que les faire échouer, repris le lendemain (aucune donnée n'est perdue, jamais un échec écrit
// pour un appel jamais tenté).
const ALPHA_VANTAGE_BUDGET_MS = 10_000;
// Vingt-huit séries depuis l'ajout des salaires (vingt-cinq avec le solde budgétaire et la
// dette publique, vingt avant elles) : relevé en proportion à chaque palier. Resserré à 9 s le
// 29/09 (15 puis 14 puis 13) pour faire de la place à l'espacement d'Alpha Vantage sans dépasser
// TOTAL_BUDGET_MS — mensuel/trimestriel, un jour manqué se rattrape sans urgence, contrairement
// à Alpha Vantage qui est quotidien.
const EUROSTAT_BUDGET_MS = 9_000;
// Cinq séries actives : une fraction du budget Eurostat suffit largement. Resserré à 4 s le
// 28/09 (6 puis 4,5), même raison que Twelve Data.
const ONS_BUDGET_MS = 4_000;
// Trois séries actives, toutes mensuelles : un budget court suffit, comme pour ONS. Resserré à
// 2 s le 28/09 (4 puis 2,5), même raison que Twelve Data et ONS.
const ESTAT_BUDGET_MS = 2_000;
// Une seule série chacune, sans clé, un appel réseau simple (CSV pour l'une, JSON pour l'autre) :
// même budget minimal que les spreads, pour la même raison — s'arrêter proprement, pas parce que
// l'appel est coûteux.
const BOE_BUDGET_MS = 1_000;
const BOJ_BUDGET_MS = 1_000;

// Les flux institutionnels et EDGAR d'abord : peu de requêtes, rapides, de haute autorité.
// GDELT en dernier — c'est le seul dont la collecte se découpe sur plusieurs passages via un
// curseur, donc celui qui peut légitimement se voir couper le budget sans rien perdre.
const VEILLE_COLLECTORS: VeilleCollector[] = [
  { name: "institutional", run: collectInstitutional },
  { name: "SEC EDGAR", run: collectEdgar },
  { name: "GDELT", run: collectGdelt },
];

export async function GET(request: Request) {
  // Sans ce contrôle, n'importe qui peut déclencher vos appels FRED et brûler votre quota.
  // Vercel envoie automatiquement cet en-tête dès que CRON_SECRET est défini.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET n'est pas configuré" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY n'est pas configurée" }, { status: 500 });
  }

  const client = getWriteClient();
  if (!client) {
    // Nommer les variables absentes plutôt que de constater la panne : une configuration
    // incomplète est le premier motif d'échec d'une mise en service, et « pas configuré »
    // n'aide personne à savoir laquelle il manque.
    return NextResponse.json(
      {
        error: "Supabase n'est pas configuré côté écriture",
        variablesManquantes: missingSupabaseConfig(),
      },
      { status: 500 },
    );
  }

  const routeStartedAt = Date.now();

  // Module 1 — FRED. Toujours en premier, jamais parallélisé avec la veille.
  const fred = await runIngest(client, apiKey, {
    deadline: routeStartedAt + FRED_BUDGET_MS,
  });

  // Les écrans de données sont en revalidation horaire ; on ne les fait pas attendre après une
  // collecte réussie.
  for (const path of ["/", "/marches", "/macro"]) revalidatePath(path);

  // Module 1bis — Les spreads. Dans son propre try/catch comme tous les modules suivants : un
  // calcul qui échouerait ne doit jamais empêcher la route de rendre le rapport FRED déjà écrit.
  // Lit ce que FRED vient d'écrire (`us10y`, `de10y`, `fr10y`), jamais le seed — voir
  // `runSpreadIngest` dans `lib/ingest.ts`.
  let spreads: IngestReport | { error: string };
  try {
    spreads = await runSpreadIngest(client, {
      deadline: Math.min(Date.now() + SPREAD_BUDGET_MS, routeStartedAt + FRED_BUDGET_MS + SPREAD_BUDGET_MS),
    });
  } catch (err) {
    spreads = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/marches");

  // Module 2 — Twelve Data. Dans son propre try/catch, comme Eurostat et la veille : une clé
  // absente ou une panne ici ne doit jamais empêcher la route de rendre le rapport FRED déjà
  // écrit. La clé est optionnelle au sens de la route — seuls deux symboles en dépendent
  // aujourd'hui — donc son absence est un module en erreur, pas un 500 global.
  const twelveDataApiKey = process.env.TWELVE_DATA_API_KEY;
  let twelveData: IngestReport | { error: string };
  if (!twelveDataApiKey) {
    twelveData = { error: "TWELVE_DATA_API_KEY n'est pas configurée" };
  } else {
    try {
      twelveData = await runTwelveDataIngest(client, twelveDataApiKey, {
        deadline: Math.min(
          Date.now() + TWELVE_DATA_BUDGET_MS,
          routeStartedAt + FRED_BUDGET_MS + SPREAD_BUDGET_MS + TWELVE_DATA_BUDGET_MS,
        ),
      });
    } catch (err) {
      twelveData = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  revalidatePath("/marches");

  // Module 2bis — Alpha Vantage. Dans son propre try/catch, même raisonnement que Twelve Data :
  // sept ETF de repli (voir config/alpha-vantage-series.ts), tous quotidiens. La clé est
  // optionnelle au sens de la route, comme celle de Twelve Data et d'e-Stat.
  const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API;
  let alphaVantage: IngestReport | { error: string };
  if (!alphaVantageApiKey) {
    alphaVantage = { error: "ALPHA_VANTAGE_API n'est pas configurée" };
  } else {
    try {
      alphaVantage = await runAlphaVantageIngest(client, alphaVantageApiKey, {
        deadline: Math.min(
          Date.now() + ALPHA_VANTAGE_BUDGET_MS,
          routeStartedAt +
            FRED_BUDGET_MS +
            SPREAD_BUDGET_MS +
            TWELVE_DATA_BUDGET_MS +
            ALPHA_VANTAGE_BUDGET_MS,
        ),
      });
    } catch (err) {
      alphaVantage = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  revalidatePath("/marches");

  // Module 3 — Eurostat. Dans son propre try/catch : ses séries sont mensuelles ou
  // trimestrielles, donc un passage manqué se rattrape le lendemain sans rien perdre, alors
  // qu'une exception ici ne doit surtout pas empêcher la route de rendre le rapport FRED.
  let eurostat: IngestReport | { error: string };
  try {
    eurostat = await runEurostatIngest(client, {
      deadline: Math.min(
        Date.now() + EUROSTAT_BUDGET_MS,
        routeStartedAt +
          FRED_BUDGET_MS +
          SPREAD_BUDGET_MS +
          TWELVE_DATA_BUDGET_MS +
          ALPHA_VANTAGE_BUDGET_MS +
          EUROSTAT_BUDGET_MS,
      ),
    });
  } catch (err) {
    eurostat = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/macro");

  // Module 4 — ONS (Royaume-Uni). Dans son propre try/catch, même raisonnement qu'Eurostat.
  // `ENABLED_ONS_SERIES` est vide tant qu'`ONS_VERIFIED` n'est pas basculé à true dans
  // `config/ons-series.ts` — ce module ne collecte donc rien encore, mais sa présence ici
  // permet de l'activer sans toucher à l'orchestrateur le jour où `npm run ons:check` sort vert.
  let ons: IngestReport | { error: string };
  try {
    ons = await runOnsIngest(client, {
      deadline: Math.min(
        Date.now() + ONS_BUDGET_MS,
        routeStartedAt +
          FRED_BUDGET_MS +
          SPREAD_BUDGET_MS +
          TWELVE_DATA_BUDGET_MS +
          ALPHA_VANTAGE_BUDGET_MS +
          EUROSTAT_BUDGET_MS +
          ONS_BUDGET_MS,
      ),
    });
  } catch (err) {
    ons = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/macro");

  // Module 5 — e-Stat (Japon). Dans son propre try/catch, même raisonnement qu'Eurostat et ONS.
  // La clé (`appId`) est optionnelle au sens de la route, comme celle de Twelve Data : son
  // absence est un module en erreur, pas un 500 global.
  const estatAppId = process.env.ESTAT_APP_ID;
  let estat: IngestReport | { error: string };
  if (!estatAppId) {
    estat = { error: "ESTAT_APP_ID n'est pas configurée" };
  } else {
    try {
      estat = await runEstatIngest(client, estatAppId, {
        deadline: Math.min(
          Date.now() + ESTAT_BUDGET_MS,
          routeStartedAt +
            FRED_BUDGET_MS +
            SPREAD_BUDGET_MS +
            TWELVE_DATA_BUDGET_MS +
            ALPHA_VANTAGE_BUDGET_MS +
            EUROSTAT_BUDGET_MS +
            ONS_BUDGET_MS +
            ESTAT_BUDGET_MS,
        ),
      });
    } catch (err) {
      estat = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  revalidatePath("/macro");

  // Module 6 — Bank of England (taux directeur britannique). Dans son propre try/catch, même
  // raisonnement qu'Eurostat, ONS et e-Stat. Sans clé — jamais un module en erreur pour absence
  // de variable d'environnement, contrairement à Twelve Data, Alpha Vantage et e-Stat.
  let boe: IngestReport | { error: string };
  try {
    boe = await runBoeIngest(client, {
      deadline: Math.min(
        Date.now() + BOE_BUDGET_MS,
        routeStartedAt +
          FRED_BUDGET_MS +
          SPREAD_BUDGET_MS +
          TWELVE_DATA_BUDGET_MS +
          ALPHA_VANTAGE_BUDGET_MS +
          EUROSTAT_BUDGET_MS +
          ONS_BUDGET_MS +
          ESTAT_BUDGET_MS +
          BOE_BUDGET_MS,
      ),
    });
  } catch (err) {
    boe = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/macro");

  // Module 7 — Bank of Japan (taux directeur japonais). Même raisonnement, sans clé non plus.
  let boj: IngestReport | { error: string };
  try {
    boj = await runBojIngest(client, {
      deadline: Math.min(
        Date.now() + BOJ_BUDGET_MS,
        routeStartedAt +
          FRED_BUDGET_MS +
          SPREAD_BUDGET_MS +
          TWELVE_DATA_BUDGET_MS +
          ALPHA_VANTAGE_BUDGET_MS +
          EUROSTAT_BUDGET_MS +
          ONS_BUDGET_MS +
          ESTAT_BUDGET_MS +
          BOE_BUDGET_MS +
          BOJ_BUDGET_MS,
      ),
    });
  } catch (err) {
    boj = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/macro");

  // Module 8 — la veille. Enveloppée dans son propre try/catch : même une exception qui
  // échapperait à `runVeilleCollect` ne doit jamais faire échouer la route après que FRED a
  // déjà écrit. Elle passe en dernier parce qu'elle est la seule à savoir reprendre où elle
  // s'est arrêtée : si les modules de données ont mangé le budget, son curseur reprendra demain
  // là où il en était.
  const remainingMs = Math.max(0, TOTAL_BUDGET_MS - (Date.now() - routeStartedAt));
  let veille: VeilleReport | { error: string };
  try {
    veille = await runVeilleCollect(client, { budgetMs: remainingMs, collectors: VEILLE_COLLECTORS });
  } catch (err) {
    veille = { error: err instanceof Error ? err.message : String(err) };
  }

  // 200 même en cas d'échec partiel : le passage a bien eu lieu, et le détail est dans le
  // rapport. Un 500 ferait croire à un cron qui n'a pas tourné. Aucun des neuf modules suivants
  // ne pèse sur ce statut — chacun porte le sien, séparément (sauf les spreads, voir plus haut).
  const status = fred.failed > 0 && fred.ok === 0 ? 502 : 200;
  return NextResponse.json(
    { fred, spreads, twelveData, alphaVantage, eurostat, ons, estat, boe, boj, veille },
    { status },
  );
}
