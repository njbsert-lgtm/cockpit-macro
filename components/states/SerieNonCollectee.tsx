/**
 * Sur une fiche, l'étiquette de la valeur du jour ne couvre pas le reste de la page : le
 * graphique, les performances et l'historique sont calculés sur les mêmes valeurs saisies à
 * la main. Cette phrase, placée juste sous l'étiquette, le dit une fois pour toute la fiche.
 */
export function SerieNonCollectee() {
  return (
    <p className="mt-2 max-w-[60ch] text-12-5 text-tenu">
      Aucune source ne collecte encore cette série. Toutes les valeurs de cette page —
      graphique, performances, historique — sont saisies à la main et n&rsquo;ont jamais été
      vérifiées.
    </p>
  );
}
