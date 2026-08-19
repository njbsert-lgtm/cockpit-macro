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

/**
 * La forme de l'URL, sans sa valeur complète.
 *
 * L'erreur la plus courante d'une mise en service Supabase est de coller l'adresse du tableau
 * de bord — `supabase.com/dashboard/project/…` — ou la chaîne de connexion Postgres, à la
 * place de l'adresse de l'API. Les trois se ressemblent assez pour être confondues, et seule
 * la dernière répond aux appels de l'application.
 *
 * L'hôte est affiché parce qu'il n'est pas un secret : c'est le point d'entrée public d'un
 * projet Supabase, protégé par les politiques RLS et non par son obscurité. Le voir suffit
 * généralement à reconnaître l'erreur au premier coup d'œil.
 */
function checkUrlShape(): Check {
  const raw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return { label: "Forme de l'URL", ok: false, detail: "SUPABASE_URL n'est pas renseignée." };
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return {
      label: "Forme de l'URL",
      ok: false,
      detail:
        "Valeur illisible comme adresse. Attendu : https://identifiant.supabase.co — rien d'autre, ni chemin ni barre oblique finale.",
    };
  }

  const problemes: string[] = [];
  if (url.protocol !== "https:") problemes.push(`protocole « ${url.protocol} » au lieu de https`);
  if (url.hostname.endsWith("supabase.com")) {
    problemes.push(
      "c'est l'adresse du tableau de bord, pas celle de l'API — attendu un hôte en .supabase.co",
    );
  } else if (!url.hostname.endsWith(".supabase.co")) {
    problemes.push(`hôte « ${url.hostname} » inattendu — attendu un hôte en .supabase.co`);
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    problemes.push(`chemin « ${url.pathname} » en trop — l'adresse s'arrête à l'hôte`);
  }

  return {
    label: "Forme de l'URL",
    ok: problemes.length === 0,
    detail:
      problemes.length === 0
        ? `Hôte ${url.hostname}, forme attendue.`
        : `${problemes.join(" ; ")}.`,
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
function conclude(env: Check, url: Check, read: Check, write: Check): string {
  if (!env.ok) return "Complétez d'abord les variables manquantes, puis redéployez.";
  // La forme de l'URL prime sur le reste : tant qu'elle est fausse, les deux sondes échouent
  // pour cette seule raison et tout autre diagnostic serait du bruit.
  if (!url.ok) return `Corrigez SUPABASE_URL — ${url.detail} Puis redéployez.`;
  if (!read.ok && !write.ok) {
    return "L'adresse a la bonne forme mais la base ne répond pas : le projet Supabase est probablement en pause, ou l'identifiant du projet n'est pas le bon. Vérifiez son état dans le tableau de bord Supabase.";
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
  const url = checkUrlShape();
  // Les deux sondes sont lancées ensemble : elles sont indépendantes, et le diagnostic doit
  // rester rapide même quand la base met du temps à refuser.
  const [read, write] = await Promise.all([checkRead(), checkWrite()]);
  return { checks: [env, url, read, write], verdict: conclude(env, url, read, write) };
}
