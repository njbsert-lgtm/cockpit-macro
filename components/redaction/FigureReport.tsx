import type { RapportChiffres, VerdictNom } from "@/lib/redaction/figures";
import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";
import { ValidationPill } from "./ValidationPill";

/** Ce que chaque verdict reproche, en clair. Le régime seul ne le dit pas. */
const REPROCHE: Record<Exclude<VerdictNom, "conforme">, string> = {
  ecart: "écart avec la valeur en base",
  introuvable: "ni en base, ni littéralement dans la fiche",
  "sans-attribution": "dans la fiche, mais aucun émetteur nommé dans la phrase",
};

/**
 * Le rapport de contrôle des chiffres, en premier dans le portail (DESIGN.md) : une ligne par
 * nombre, **son régime**, sa source, son verdict. C'est le garde-fou le plus important du
 * pipeline — un chiffre légèrement de travers dans une phrase bien tournée est invisible à la
 * relecture.
 *
 * Les nombres neutres — une année, un rang — n'y figurent pas : `extraireVerdicts` ne les
 * confronte à rien, et les lister noierait les vrais chiffres sous des lignes muettes.
 */
export function FigureReport({ rapport }: { rapport: RapportChiffres }) {
  const mesures = rapport.verdicts;
  const parRegime = {
    A: mesures.filter((v) => v.regime === "A").length,
    B: mesures.filter((v) => v.regime === "B").length,
  };

  if (mesures.length === 0) {
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
      {/* Le total par régime en tête : une note majoritairement en régime B est normale, une
          note qui n'a que du régime B dit que la collecte n'a rien apporté cette semaine. */}
      <p className="mt-0.5 text-12 text-doux">
        {mesures.length} chiffre{mesures.length > 1 ? "s" : ""} — régime A : {parRegime.A}, régime
        B : {parRegime.B}
        {parRegime.A === 0 && (
          <span className="text-tenu"> · la collecte n&rsquo;a rien apporté à cette note</span>
        )}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {mesures.map((v, i) => (
          <li key={`${v.bloc}-${v.ecrit}-${i}`} className="flex items-start gap-2.5">
            <ValidationPill ok={v.verdict === "conforme"} />
            <span className="min-w-0 text-12-5">
              <span className="font-mono text-encre">{v.ecrit}</span>
              <span className="ml-1.5 font-mono text-11 text-tenu">{v.regime}</span>
              <span className="ml-1.5 text-tenu">
                dans « {BLOCK_TITLES[v.bloc as BlockName] ?? v.bloc} »
              </span>
              {v.verdict === "conforme" && v.source && (
                <span className="ml-1.5 text-doux">— {v.source}</span>
              )}
              {v.verdict !== "conforme" && (
                <span className="ml-1.5 text-k-choc">
                  {REPROCHE[v.verdict]}
                  {v.attendu && ` — la base porte ${v.attendu}`}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {rapport.bloque && (
        <p className="mt-2.5 text-12 text-k-choc">
          Publication indisponible tant qu&rsquo;un chiffre non conforme reste dans un bloc non
          relu.
        </p>
      )}
    </div>
  );
}
