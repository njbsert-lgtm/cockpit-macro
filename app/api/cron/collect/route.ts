import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getWriteClient, missingSupabaseConfig } from "@/lib/supabase";
import { runEurostatIngest, runIngest, type IngestReport } from "@/lib/ingest";
import { runVeilleCollect, type VeilleCollector, type VeilleReport } from "@/lib/veille/collect";
import { collectInstitutional } from "@/lib/veille/sources/institutional";
import { collectEdgar } from "@/lib/veille/sources/edgar";
import { collectGdelt } from "@/lib/veille/sources/gdelt";

/**
 * L'orchestrateur de la collecte quotidienne. Déclenché par le cron Vercel à 6 h UTC, jamais à
 * la demande. Le plan Hobby n'autorise qu'un déclenchement quotidien : cette route exécute donc
 * trois modules indépendants l'un après l'autre plutôt que d'ajouter un second cron.
 *
 * L'ordre n'est pas négociable : FRED d'abord, et durablement écrit, avant qu'Eurostat puis la
 * veille ne démarrent. Si l'un des deux suivants échoue — y compris une exception non rattrapée
 * — FRED est déjà en base ; c'est pour ça que son résultat ne dépend de rien de ce qui suit.
 * Le statut HTTP de la réponse ne reflète que FRED : ce sont ses données qui priment.
 *
 * Chaque module journalise pour son compte. FRED et Eurostat écrivent tous deux dans
 * `series_health`, mais sous une colonne `source` distincte, si bien que l'indicateur de
 * fraîcheur les présente séparément : un échec Eurostat ne peut jamais se lire comme un échec
 * FRED. La veille garde sa propre table, `veille_health`, qui n'alimente pas cet indicateur.
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
const TOTAL_BUDGET_MS = 45_000;

/**
 * Le partage du temps entre modules, dans l'ordre de priorité du cahier.
 *
 * FRED d'abord et servi le plus largement : ce sont les données de marché, elles priment.
 * Eurostat ensuite, mensuel et trimestriel, donc sans urgence à la journée. La veille en
 * dernier avec ce qui reste, parce qu'elle est la seule à savoir reprendre où elle s'est
 * arrêtée grâce à son curseur.
 */
const FRED_BUDGET_MS = 25_000;
const EUROSTAT_BUDGET_MS = 12_000;

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

  // Module 2 — Eurostat. Après FRED, dans son propre try/catch : ses séries sont mensuelles ou
  // trimestrielles, donc un passage manqué se rattrape le lendemain sans rien perdre, alors
  // qu'une exception ici ne doit surtout pas empêcher la route de rendre le rapport FRED.
  let eurostat: IngestReport | { error: string };
  try {
    eurostat = await runEurostatIngest(client, {
      deadline: Math.min(
        Date.now() + EUROSTAT_BUDGET_MS,
        routeStartedAt + FRED_BUDGET_MS + EUROSTAT_BUDGET_MS,
      ),
    });
  } catch (err) {
    eurostat = { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/macro");

  // Module 3 — la veille. Enveloppée dans son propre try/catch : même une exception qui
  // échapperait à `runVeilleCollect` ne doit jamais faire échouer la route après que FRED a
  // déjà écrit. Elle passe en dernier parce qu'elle est la seule à savoir reprendre où elle
  // s'est arrêtée : si les deux modules de données ont mangé le budget, son curseur reprendra
  // demain là où il en était.
  const remainingMs = Math.max(0, TOTAL_BUDGET_MS - (Date.now() - routeStartedAt));
  let veille: VeilleReport | { error: string };
  try {
    veille = await runVeilleCollect(client, { budgetMs: remainingMs, collectors: VEILLE_COLLECTORS });
  } catch (err) {
    veille = { error: err instanceof Error ? err.message : String(err) };
  }

  // 200 même en cas d'échec partiel : le passage a bien eu lieu, et le détail est dans le
  // rapport. Un 500 ferait croire à un cron qui n'a pas tourné. Ni Eurostat ni la veille ne
  // pèsent sur ce statut — chacun porte le sien, séparément, dans sa table de santé.
  const status = fred.failed > 0 && fred.ok === 0 ? 502 : 200;
  return NextResponse.json({ fred, eurostat, veille }, { status });
}
