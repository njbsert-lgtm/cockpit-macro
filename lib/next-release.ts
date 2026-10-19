/**
 * Une prochaine date de publication déjà passée n'est plus une prochaine date : c'est
 * exactement le symptôme qui a motivé ce fichier — des dates saisies à la main dans le seed,
 * jamais resynchronisées, qui continuaient de s'afficher comme si la publication restait à
 * venir alors qu'elle avait déjà eu lieu (voir la correction du 19/09 sur les séries UK).
 *
 * Aucun calendrier de publication vivant et gratuit n'existe pour Eurostat, ONS ou e-Stat
 * (recherché ce jour-là). FRED en expose un (`/fred/series/release` puis `/fred/release/dates`)
 * mais il s'est révélé peu fiable pour au moins une série testée (le taux directeur, dont le
 * calendrier renvoyé ne correspondait pas au rythme réel des réunions du FOMC) : l'utiliser en
 * direct au rendu risquerait d'afficher une date fabriquée par une API elle-même bruitée, sur
 * une page consultée en continu plutôt qu'une fois par jour avec relecture.
 *
 * Depuis le 19/10/2026, les dates viennent de `config/calendrier-publications.ts`, relevées dans
 * les calendriers officiels et non plus saisies une par une dans le seed. Ce garde-fou reste : une
 * date dépassée ne s'affiche jamais comme à venir, quelle que soit son origine.
 */
export function resolveNextRelease(
  nextRelease: string | null,
  today: string = new Date().toISOString().slice(0, 10),
): string | null {
  if (!nextRelease) return null;
  return nextRelease >= today ? nextRelease : null;
}
