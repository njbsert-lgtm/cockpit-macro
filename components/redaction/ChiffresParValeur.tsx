import {
  enJourMois,
  type ElementsDeDecision,
  type GroupeValeur,
  type OccurrenceValeur,
} from "@/lib/redaction/figures";
import { cleChiffre } from "@/lib/redaction/figures";
import { BLOCK_EMOJI, BLOCK_NAMES, BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import { corrigerPhrase, garderChiffres } from "@/app/redaction/actions";

function date(d: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? enJourMois(d) : d;
}

/** La phrase, avec chaque borne de l'occurrence surlignée — sans toucher aux autres nombres. */
function Phrase({ occurrence }: { occurrence: OccurrenceValeur }) {
  let reste = occurrence.phrase;
  const morceaux: Array<{ texte: string; marque: boolean }> = [];
  for (const v of occurrence.verdicts) {
    const i = reste.indexOf(v.ecrit);
    if (i < 0) continue;
    if (i > 0) morceaux.push({ texte: reste.slice(0, i), marque: false });
    morceaux.push({ texte: v.ecrit, marque: true });
    reste = reste.slice(i + v.ecrit.length);
  }
  if (reste) morceaux.push({ texte: reste, marque: false });
  return (
    <>
      {morceaux.map((m, i) =>
        m.marque ? (
          <mark key={i} className="rounded-rb bg-k-choc/25 px-0.5 font-semibold text-encre">
            {m.texte}
          </mark>
        ) : (
          <span key={i}>{m.texte}</span>
        ),
      )}
    </>
  );
}

/**
 * Les chiffres non conformes regroupés par valeur (4c) : dix-neuf lignes qui ne portent que huit
 * valeurs se lisent comme huit décisions. **Le geste reste par occurrence** — chaque phrase a son
 * « Garder », le groupe n'en a aucun —, et l'encadré « Pour trancher » ne dit que ce que les
 * données existantes savent : même valeur conforme ailleurs, valeur de la note précédente, date
 * retenue et valeur en base.
 */
export function ChiffresParValeur({
  slug,
  groupes,
}: {
  slug: string;
  groupes: Array<{ groupe: GroupeValeur; elements: ElementsDeDecision }>;
}) {
  if (groupes.length === 0) {
    return <p className="rounded-rc bg-repos p-4 text-12-5 text-doux">Aucun chiffre à trancher.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {groupes.map(({ groupe, elements }) => (
        <li key={groupe.cle} className="rounded-rc border border-trait bg-page px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-19 font-bold leading-tight tracking-titre text-encre">{groupe.valeur}</p>
              <p className="mt-0.5 text-12 text-tenu">
                {groupe.serie ?? "série non rattachée"} · <span className="text-k-choc">{groupe.reproche}</span>
              </p>
            </div>
            <span className="shrink-0 rounded-rp bg-repos px-2 py-0.5 text-11 font-semibold text-doux">
              {groupe.occurrences.length} occurrence{groupe.occurrences.length > 1 ? "s" : ""}
            </span>
          </div>

          {(elements.conformeAilleurs || elements.base || elements.notePrecedente) && (
            <div className="mt-3 rounded-rb bg-repos px-3 py-2.5 text-12-5 leading-snug text-doux">
              <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Pour trancher</p>
              <ul className="mt-1 flex flex-col gap-1">
                {elements.conformeAilleurs && (
                  <li>
                    Le même chiffre est <span className="font-semibold text-encre">conforme</span> dans{" "}
                    {BLOCK_TITLES[elements.conformeAilleurs.bloc as BlockName] ??
                      elements.conformeAilleurs.bloc.replace("keyIndicators/", "les chiffres clés · ")}
                    {elements.conformeAilleurs.valeurBase && elements.conformeAilleurs.dateRetenue
                      ? ` (base ${elements.conformeAilleurs.valeurBase} au ${date(elements.conformeAilleurs.dateRetenue)})`
                      : ""}
                    . Dans ces phrases, le contrôle ne l&rsquo;a pas rattaché à la série.
                  </li>
                )}
                {elements.base && (
                  <li>
                    Date retenue : {date(elements.base.dateRetenue)} · valeur en base : {elements.base.valeurBase}.
                  </li>
                )}
                {elements.notePrecedente && (
                  <li>Ce nombre figure littéralement dans la note précédente ({elements.notePrecedente}).</li>
                )}
              </ul>
            </div>
          )}

          <ul className="mt-3 flex flex-col divide-y divide-trait">
            {groupe.occurrences.map((o, i) => {
              const cles = o.verdicts.map((v) => cleChiffre(v));
              const corrigeable = (BLOCK_NAMES as readonly string[]).includes(o.bloc);
              return (
                <li key={`${cles.join("|")}-${i}`} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="text-11 uppercase tracking-cap text-tenu">
                    <span aria-hidden="true">{BLOCK_EMOJI[o.bloc as BlockName] ?? ""} </span>
                    {BLOCK_TITLES[o.bloc as BlockName] ?? o.bloc}
                    {o.garde && <span className="ml-2 font-semibold text-doux">· gardé</span>}
                  </p>
                  <p className="text-13 leading-relaxed text-encre">
                    <Phrase occurrence={o} />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <form action={garderChiffres.bind(null, slug)}>
                      {cles.map((c) => (
                        <input key={c} type="hidden" name="cle" value={c} />
                      ))}
                      <input type="hidden" name="action" value={o.garde ? "examiner" : "garder"} />
                      <button
                        type="submit"
                        className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f"
                      >
                        {o.garde ? "Reprendre l'examen" : "Garder"}
                      </button>
                    </form>
                    {corrigeable && !o.garde && o.verdicts.length === 1 && (
                      <details className="open:basis-full">
                        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white [&::-webkit-details-marker]:hidden">
                          Corriger
                        </summary>
                        <form action={corrigerPhrase.bind(null, slug, cles[0])} className="mt-2 flex flex-col gap-2">
                          <textarea
                            name="phrase"
                            defaultValue={o.phrase}
                            rows={3}
                            aria-label="Phrase corrigée"
                            className="w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
                          />
                          <button
                            type="submit"
                            className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white"
                          >
                            Corriger la phrase
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
