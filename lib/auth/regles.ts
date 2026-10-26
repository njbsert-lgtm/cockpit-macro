/**
 * Les règles de l'accès administrateur, sans dépendance à Next ni à Supabase.
 *
 * Elles sont lues à trois endroits — le middleware (runtime edge), les gardes des pages et des
 * Server Actions (runtime Node), et `next.config.ts` au build —, d'où ce module pur : une règle
 * écrite une fois, testée une fois, et jamais recopiée avec une variante.
 *
 * Un seul compte, un seul rôle. Le rôle vit dans `app_metadata`, que seul la clé de service peut
 * écrire : `user_metadata`, lui, est modifiable par l'utilisateur connecté et ne prouve rien.
 */

export const ROLE_ADMIN = "admin";

/** Les routes d'administration. Le `matcher` de `middleware.ts` doit les couvrir, et elles seules. */
export const ROUTES_PROTEGEES = ["/redaction", "/triage", "/diagnostic"] as const;

/** Où l'on se connecte, et où le lien magique ramène. Jamais protégées : elles ouvrent la porte. */
export const ROUTE_CONNEXION = "/connexion";
export const ROUTE_CONFIRMATION = "/auth/confirmer";

/** La page vers laquelle le middleware réécrit un refus : elle n'existe pas, donc 404. */
export const ROUTE_INTROUVABLE = "/_introuvable";

type UtilisateurMinimal = { app_metadata?: Record<string, unknown> | null } | null | undefined;

export function estAdmin(utilisateur: UtilisateurMinimal): boolean {
  return utilisateur?.app_metadata?.role === ROLE_ADMIN;
}

export function estRouteProtegee(chemin: string): boolean {
  return ROUTES_PROTEGEES.some((route) => chemin === route || chemin.startsWith(`${route}/`));
}

/**
 * La destination d'après connexion, bornée aux routes d'administration : un paramètre `suite`
 * qui pointerait ailleurs — autre site, `//evil.example` — retombe sur `/redaction`. Sans ce
 * filtre, le lien de connexion deviendrait une redirection ouverte.
 */
export function destinationApresConnexion(suite: string | null | undefined): string {
  if (suite && suite.startsWith("/") && !suite.startsWith("//") && estRouteProtegee(suite)) {
    return suite;
  }
  return "/redaction";
}

type Env = Record<string, string | undefined>;

const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1"]);

/** Le nom d'hôte d'un en-tête `Host`, sans le port. */
export function nomHote(hote: string | null | undefined): string {
  if (!hote) return "";
  return hote.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Le contournement de développement : sans lui, travailler sur `/redaction` en local exigerait
 * une base joignable et un lien magique — ce que l'environnement de développement n'a pas.
 *
 * Quatre conditions **cumulatives**, chacune suffisant à le refuser : la variable explicite, le
 * mode développement, l'absence de Vercel, et un hôte local. Un déploiement mal configuré qui
 * porterait `ADMIN_LOCAL` échoue de toute façon au build (`verifierContournementAuBuild`) ; les
 * trois autres conditions sont la ceinture sous les bretelles.
 */
export function contournementLocal(env: Env, hote: string | null | undefined): boolean {
  return (
    env.ADMIN_LOCAL === "1" &&
    env.NODE_ENV === "development" &&
    !env.VERCEL &&
    HOTES_LOCAUX.has(nomHote(hote))
  );
}

/**
 * Appelée par `next.config.ts` : `ADMIN_LOCAL` posé en production ou sur Vercel fait échouer
 * le build plutôt que d'ouvrir une porte. Une variable oubliée dans un tableau de bord se voit
 * alors au déploiement, pas le jour où quelqu'un trouve l'URL.
 */
export function verifierContournementAuBuild(env: Env): void {
  if (!env.ADMIN_LOCAL) return;
  if (env.NODE_ENV === "production" || env.VERCEL) {
    throw new Error(
      "ADMIN_LOCAL est posé hors développement local : retirez cette variable. " +
        "Elle ouvre les routes d'administration sans session et n'a sa place que dans .env.local.",
    );
  }
}
