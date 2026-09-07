/**
 * Identifiants de modèle pour les deux usages de l'API Claude (`lib/anthropic.ts`). Centralisés
 * ici, jamais en dur dans le client ou dans les appelants (`lib/veille/classify.ts`,
 * `lib/redaction/run.ts`) : changer de modèle ne doit jamais toucher qu'un seul fichier, jamais
 * du code fonctionnel. `StructuredRequest.model` est obligatoire précisément pour empêcher un
 * appel silencieux sur un modèle par défaut non voulu.
 */

/**
 * Passe 2 de veille (`lib/veille/classify.ts`) — classification en lot contre une grille fermée
 * (cinq canaux, sortie structurée), plusieurs fois par jour, prompt système en cache. Un modèle
 * léger suffit à ce jugement borné.
 */
export const CLASSIFICATION_MODEL = "claude-haiku-4-5-20251001";

/**
 * Rédaction hebdomadaire des notes (`lib/redaction/run.ts`) — publiée sans relecture humaine
 * avant mise en ligne (CLAUDE.md, § Rédaction assistée), une fois par semaine : le jugement
 * demandé (ton, synthèse, révision de scénarios) justifie un modèle plus capable.
 */
export const REDACTION_MODEL = "claude-sonnet-5";
