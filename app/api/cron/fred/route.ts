import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/lib/supabase";
import { runIngest } from "@/lib/ingest";

/**
 * La collecte quotidienne. Déclenchée par le cron Vercel à 6 h UTC, jamais à la demande —
 * « un appel par instrument par jour » (cahier des charges).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const report = await runIngest(client, apiKey);

  // Les écrans de données sont en revalidation horaire ; on ne les fait pas attendre après une
  // collecte réussie.
  for (const path of ["/", "/marches", "/macro"]) revalidatePath(path);

  // 200 même en cas d'échec partiel : le passage a bien eu lieu, et le détail est dans le
  // rapport. Un 500 ferait croire à un cron qui n'a pas tourné.
  return NextResponse.json(report, { status: report.failed > 0 && report.ok === 0 ? 502 : 200 });
}
