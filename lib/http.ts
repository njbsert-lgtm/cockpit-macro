/**
 * Un appel sortant borné dans le temps.
 *
 * `fetch` n'a pas de délai maximal par défaut : un serveur qui accepte la connexion puis se
 * tait indéfiniment suspend l'appelant aussi longtemps qu'il le veut. Dans la route de cron,
 * cela suffit à faire dépasser la limite de la plateforme et à faire perdre le rapport entier
 * — un 504, sans rien pouvoir dire de ce qui a été collecté.
 *
 * Le budget de temps de l'orchestrateur ne protège pas de ça : il se vérifie **entre** deux
 * appels, jamais pendant. C'est ce délai-ci qui garantit que chaque appel rend la main.
 *
 * Une série qui expire n'est pas écrite, l'échec est journalisé, et le passage du lendemain
 * rattrape : la collecte est idempotente de bout en bout.
 */

/** Assez pour une API publique qui répond normalement, trop court pour bloquer un passage. */
export const DEFAULT_TIMEOUT_MS = 8_000;

export type TimedFetchInit = RequestInit & { timeoutMs?: number };

export async function fetchWithTimeout(
  url: string,
  init: TimedFetchInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}

/**
 * Le message d'une panne d'appel, lisible dans la table de santé. Un `TimeoutError` sans
 * traitement particulier s'affiche « The operation was aborted », ce qui ne dit pas au lecteur
 * que la source n'a simplement pas répondu à temps.
 */
export function describeFetchError(error: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): string {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return `pas de réponse en ${Math.round(timeoutMs / 1000)} s`;
  }
  return error instanceof Error ? error.message : String(error);
}
