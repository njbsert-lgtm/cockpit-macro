import { getReadClient, getWriteClient, missingSupabaseConfig } from "./supabase";
import { getMacroIndicators } from "./data";

/**
 * Le diagnostic de la chaîne de collecte, lisible depuis le navigateur.
 *
 * Il existe parce qu'une panne de mise en service se lit aujourd'hui dans les journaux de la
 * plateforme, c'est-à-dire nulle part quand on est sur un téléphone. Or les trois questions à
 * trancher sont simples : les variables sont-elles là, la base répond-elle en lecture, accepte-
 * t-elle une écriture ? Chacune a une réponse courte, et c'est leur combinaison qui désigne la
 * pièce fautive.
 *
 * **Aucune valeur de clé n'est jamais renvoyée** — seulement leur présence. Un écran de
 * diagnostic qui affiche un secret est un secret publié.
 */

export type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

export type Diagnostic = {
  checks: Check[];
  /** La conclusion, en une phrase : ce qu'il faut aller corriger. */
  verdict: string;
};

/** Le nom des variables attendues, sans jamais lire leur contenu. */
function checkEnvironment(): Check {
  const attendues = [
    "FRED_API_KEY",
    "CRON_SECRET",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  // Les noms préfixés `NEXT_PUBLIC_` restent acceptés en repli, comme dans `lib/supabase.ts`.
  const present = (nom: string) =>
    Boolean(
      process.env[nom] ??
        process.env[`NEXT_PUBLIC_${nom}`] ??
        (nom === "SUPABASE_ANON_KEY" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined) ??
        (nom === "SUPABASE_SERVICE_ROLE_KEY" ? process.env.SUPABASE_SECRET_KEY : undefined),
    );

  const absentes = attendues.filter((nom) => !present(nom));
  return {
    label: "Variables d'environnement",
    ok: absentes.length === 0,
    detail:
      absentes.length === 0
        ? `Les ${attendues.length} variables attendues sont renseignées.`
        : `Absente(s) : ${absentes.join(", ")}.`,
  };
}

async function checkRead(): Promise<Check> {
  const client = getReadClient();
  if (!client) {
    return {
      label: "Lecture de la base",
      ok: false,
      detail: `Client de lecture non construit — ${missingSupabaseConfig().join(", ")} manquante(s).`,
    };
  }

  try {
    const { count, error } = await client
      .from("series_health")
      .select("series_key", { count: "exact", head: true });
    if (error) {
      return { label: "Lecture de la base", ok: false, detail: `Refusée — ${error.message}` };
    }
    return {
      label: "Lecture de la base",
      ok: true,
      detail: `La base répond. ${count ?? 0} série(s) dans series_health.`,
    };
  } catch (err) {
    return {
      label: "Lecture de la base",
      ok: false,
      detail: `Injoignable — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * L'écriture est éprouvée avec la même opération que celle du cron : la projection du catalogue
 * des indicateurs. Elle est idempotente et sans effet de bord — la relancer ne fait que
 * réécrire ce que la configuration déclare déjà.
 */
async function checkWrite(): Promise<Check> {
  const client = getWriteClient();
  if (!client) {
    return {
      label: "Écriture en base",
      ok: false,
      detail: "Client d'écriture non construit — SUPABASE_SERVICE_ROLE_KEY manquante.",
    };
  }

  const indicator = getMacroIndicators()[0];
  if (!indicator) {
    return { label: "Écriture en base", ok: false, detail: "Catalogue vide, rien à écrire." };
  }

  try {
    const { error } = await client.from("macro_indicators").upsert(
      {
        id: indicator.id,
        label: indicator.label,
        zone: indicator.zone,
        unit: indicator.unit,
        frequency: indicator.frequency,
        series_key: indicator.seriesKey,
        next_release: indicator.nextRelease,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      return { label: "Écriture en base", ok: false, detail: `Refusée — ${error.message}` };
    }
    return {
      label: "Écriture en base",
      ok: true,
      detail: "La clé de service écrit bien dans macro_indicators.",
    };
  } catch (err) {
    return {
      label: "Écriture en base",
      ok: false,
      detail: `Injoignable — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * La conclusion se lit dans la **combinaison** des trois contrôles, pas dans chacun isolément :
 * une lecture qui passe et une écriture qui échoue désignent la clé de service, alors que deux
 * échecs désignent l'URL ou le projet lui-même. C'est ce raisonnement-là qu'on veut éviter de
 * refaire à la main à chaque incident.
 */
function conclude(env: Check, read: Check, write: Check): string {
  if (!env.ok) return "Complétez d'abord les variables manquantes, puis redéployez.";
  if (!read.ok && !write.ok) {
    return "Ni lecture ni écriture : l'URL du projet est erronée, ou le projet Supabase est en pause. Vérifiez SUPABASE_URL et l'état du projet dans son tableau de bord.";
  }
  if (read.ok && !write.ok) {
    return "La base répond mais refuse l'écriture : SUPABASE_SERVICE_ROLE_KEY ne contient probablement pas la clé de service. Une clé anonyme est bloquée par les politiques RLS, qui n'autorisent que la lecture.";
  }
  if (!read.ok && write.ok) {
    return "L'écriture passe mais pas la lecture : SUPABASE_ANON_KEY est erronée.";
  }
  return "La chaîne est complète. S'il n'y a toujours aucune donnée, lancez le cron et regardez son rapport.";
}

export async function runDiagnostic(): Promise<Diagnostic> {
  const env = checkEnvironment();
  // Les deux sondes sont lancées ensemble : elles sont indépendantes, et le diagnostic doit
  // rester rapide même quand la base met du temps à refuser.
  const [read, write] = await Promise.all([checkRead(), checkWrite()]);
  return { checks: [env, read, write], verdict: conclude(env, read, write) };
}
