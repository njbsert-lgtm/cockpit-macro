import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/lib/supabase";
import { runIngest } from "@/lib/ingest";
import { runVeilleCollect, type VeilleCollector, type VeilleReport } from "@/lib/veille/collect";

/**
 * L'orchestrateur de la collecte quotidienne. Déclenché par le cron Vercel à 6 h UTC, jamais à
 * la demande. Le plan Hobby n'autorise qu'un déclenchement quotidien : cette route exécute donc
 * deux modules indépendants l'un après l'autre plutôt que d'ajouter un second cron.
 *
 * L'ordre n'est pas négociable : FRED d'abord, et durablement écrit, avant que la veille ne
 * démarre. Si la veille échoue — y compris une exception non rattrapée — FRED est déjà en base ;
 * c'est pour ça que son résultat ne dépend de rien de ce qui suit. Le statut HTTP de la réponse
 * ne reflète que FRED, jamais la veille : ce sont les données de marché qui priment.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Marge sous les 60 s de `maxDuration` : le temps qu'il faut pour que la réponse HTTP parte
// encore proprement même si un collecteur a consommé son budget jusqu'au bout.
const TOTAL_BUDGET_MS = 55_000;

// Peuplée au fil de la construction du pipeline de collecte (tâche suivante) : GDELT, les flux
// institutionnels, SEC EDGAR. Une liste vide est un passage valide — l'orchestrateur tourne,
// FRED s'exécute, la veille ne fait rien à journaliser.
const VEILLE_COLLECTORS: VeilleCollector[] = [];

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
    return NextResponse.json(
      { error: "Supabase n'est pas configuré côté écriture" },
      { status: 500 },
    );
  }

  const routeStartedAt = Date.now();

  // Module 1 — FRED. Toujours en premier, jamais parallélisé avec la veille.
  const fred = await runIngest(client, apiKey);

  // Les écrans de données sont en revalidation horaire ; on ne les fait pas attendre après une
  // collecte réussie.
  for (const path of ["/", "/marches", "/macro"]) revalidatePath(path);

  // Module 2 — la veille. Enveloppée dans son propre try/catch : même une exception qui
  // échapperait à `runVeilleCollect` ne doit jamais faire échouer la route après que FRED a
  // déjà écrit.
  const remainingMs = TOTAL_BUDGET_MS - (Date.now() - routeStartedAt);
  let veille: VeilleReport | { error: string };
  try {
    veille = await runVeilleCollect(client, { budgetMs: remainingMs, collectors: VEILLE_COLLECTORS });
  } catch (err) {
    veille = { error: err instanceof Error ? err.message : String(err) };
  }

  // 200 même en cas d'échec partiel : le passage a bien eu lieu, et le détail est dans le
  // rapport. Un 500 ferait croire à un cron qui n'a pas tourné. Le veille ne pèse jamais sur ce
  // statut — il porte le sien, séparément, dans `veille_health`.
  const status = fred.failed > 0 && fred.ok === 0 ? 502 : 200;
  return NextResponse.json({ fred, veille }, { status });
}
