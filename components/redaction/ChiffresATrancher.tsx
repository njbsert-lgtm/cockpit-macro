import { reproche, cleChiffre, type VerdictChiffre } from "@/lib/redaction/figures";
import { BLOCK_NAMES, BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import { corrigerPhrase, garderChiffre } from "@/app/redaction/actions";

/** La phrase, avec le nombre surligné — pour le retrouver sans lire tout le bloc. */
function PhraseSurlignee({ phrase, ecrit }: { phrase: string; ecrit: string }) {
  const i = phrase.indexOf(ecrit);
  if (i < 0) return <>{phrase}</>;
  return (
    <>
      {phrase.slice(0, i)}
      <mark className="rounded-sm bg-k-choc/25 px-0.5 font-semibold text-encre">{ecrit}</mark>
      {phrase.slice(i + ecrit.length)}
    </>
  );
}

/**
 * Les nombres que le contrôle reproche, un par un, dans leur phrase. Deux gestes, jamais en bloc :
 * corriger la phrase sur place, ou garder le nombre tel quel — après l'avoir lu. Un nombre gardé
 * reste listé, avec de quoi revenir sur sa décision.
 */
export function ChiffresATrancher({
  slug,
  verdicts,
}: {
  slug: string;
  verdicts: VerdictChiffre[];
}) {
  const fautifs = verdicts.filter((v) => v.verdict !== "conforme");
  if (fautifs.length === 0) return null;
  const restants = fautifs.filter((v) => !v.garde).length;

  return (
    <section aria-label="Chiffres à trancher" className="rounded-rc border border-k-choc bg-page">
      <p className="px-4 pt-3 text-9-5 font-semibold uppercase tracking-cap text-k-choc">
        Chiffres à trancher · {restants} restant{restants > 1 ? "s" : ""} sur {fautifs.length}
      </p>
      <ul className="flex flex-col divide-y divide-trait">
        {fautifs.map((v, i) => {
          const cle = cleChiffre(v);
          const corrigeable = (BLOCK_NAMES as readonly string[]).includes(v.bloc);
          return (
            <li key={`${cle}-${i}`} className="flex flex-col gap-2 px-4 py-3">
              <p className="text-11 uppercase tracking-cap text-tenu">
                {BLOCK_TITLES[v.bloc as BlockName] ?? v.bloc}
                {v.garde && <span className="ml-2 font-semibold text-doux">· gardé</span>}
              </p>
              <p className="text-13 leading-relaxed text-encre">
                <PhraseSurlignee phrase={v.phrase} ecrit={v.ecrit} />
              </p>
              <p className="text-12 text-doux">{reproche(v)}</p>

              {corrigeable && !v.garde && (
                <form action={corrigerPhrase.bind(null, slug, cle)} className="flex flex-col gap-2">
                  <textarea
                    name="phrase"
                    defaultValue={v.phrase}
                    rows={3}
                    className="w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
                  />
                  <button
                    type="submit"
                    className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
                  >
                    Corriger la phrase
                  </button>
                </form>
              )}

              <form action={garderChiffre.bind(null, slug, cle)}>
                <input type="hidden" name="action" value={v.garde ? "examiner" : "garder"} />
                <button
                  type="submit"
                  className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f"
                >
                  {v.garde ? "Reprendre l'examen" : "Garder tel quel"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
