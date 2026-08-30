import type { RapportChiffres } from "@/lib/redaction/figures";
import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import { ValidationPill } from "./ValidationPill";

/**
 * Le rapport de contrôle des chiffres, en premier dans le portail (DESIGN.md) : une ligne par
 * nombre, sa source, son verdict. C'est le garde-fou le plus important du pipeline — un
 * chiffre légèrement de travers dans une phrase bien tournée est invisible à la relecture.
 */
export function FigureReport({ rapport }: { rapport: RapportChiffres }) {
  if (rapport.verdicts.length === 0) {
    return (
      <div className="rounded-rc bg-repos px-4 py-3">
        <p className="text-12-5 text-doux">Aucun chiffre à contrôler dans les blocs relus.</p>
      </div>
    );
  }

  return (
    <div className="rounded-rc bg-repos px-4 py-3">
      <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
        Contrôle des chiffres
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {rapport.verdicts.map((v, i) => (
          <li key={`${v.bloc}-${v.ecrit}-${i}`} className="flex items-start gap-2.5">
            <ValidationPill ok={v.verdict === "trouve"} />
            <span className="min-w-0 text-12-5">
              <span className="font-mono text-encre">{v.ecrit}</span>
              <span className="ml-1.5 text-tenu">
                dans « {BLOCK_TITLES[v.bloc as BlockName] ?? v.bloc} »
              </span>
              {v.source && <span className="ml-1.5 text-doux">— {v.source}</span>}
              {v.verdict === "introuvable" && (
                <span className="ml-1.5 text-k-choc">introuvable dans le vivier du jour</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {rapport.bloque && (
        <p className="mt-2.5 text-12 text-k-choc">
          Publication indisponible tant qu&rsquo;un chiffre introuvable reste dans un bloc non relu.
        </p>
      )}
    </div>
  );
}
