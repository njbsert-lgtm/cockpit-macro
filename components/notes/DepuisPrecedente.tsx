import Link from "next/link";
import type { LigneDepuis } from "@/lib/depuis";
import { formatJourMois } from "@/lib/format";
import { LIKELIHOOD_SHORT } from "@/lib/scenario-labels";
import { SEMANTIC_FILL } from "@/lib/branch-semantics";
import { PREMIERE_VERSION_SUIVIE } from "@/lib/revision";
import type { ScenarioLikelihood } from "@/lib/types";
import { SectionHeader } from "./SectionHeader";

/** Le cran de la jauge, en pourcentage de sa largeur : trois crans ordinaux, jamais un chiffre. */
const CRAN: Record<ScenarioLikelihood, number> = { faible: 100 / 3, moderee: 200 / 3, central: 100 };

/**
 * « Depuis S41 » : ce qui a changé depuis la note de comparaison, en tête de l'accueil. Une carte,
 * une ligne par changement — révision de driver (jauge et repère de l'ancien cran), guet échu à
 * trancher, nouvelle lecture. Sans changement, la section ne se dessine pas.
 */
export function DepuisPrecedente({
  lignes,
  comparesTo,
  noteSlug,
}: {
  lignes: LigneDepuis[];
  comparesTo: string;
  noteSlug: string;
}) {
  if (lignes.length === 0) return null;
  const semaine = comparesTo.replace(/^\d{4}-/, "");

  return (
    <section className="mt-6" aria-label={`Ce qui a changé depuis ${semaine}`}>
      <SectionHeader
        title={`Depuis ${semaine}`}
        count={`${lignes.length} changement${lignes.length > 1 ? "s" : ""}`}
      />
      <ul className="mt-3 overflow-hidden rounded-rc border border-trait">
        {lignes.map((ligne, i) => (
          <li key={i} className="border-b border-trait last:border-b-0">
            <Ligne ligne={ligne} noteSlug={noteSlug} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ligne({ ligne, noteSlug }: { ligne: LigneDepuis; noteSlug: string }) {
  const surtitre = (texte: string) => (
    <span className="block text-9-5 font-semibold uppercase tracking-cap text-tenu">{texte}</span>
  );
  const chevron = (
    <span aria-hidden="true" className="self-center text-17 text-tenu">
      ›
    </span>
  );
  const classe = "grid min-h-11 grid-cols-[1fr_auto] gap-3 px-3.5 py-3 transition-colors hover:bg-repos";

  if (ligne.type === "revision") {
    return (
      <Link href={`/notes/drivers/${ligne.driverId}`} className={classe}>
        <span className="min-w-0">
          {surtitre(`Révision · ${ligne.driverLabel}`)}
          <span className="mt-0.5 block text-13-5 font-medium text-encre">
            {ligne.avant
              ? `${ligne.branche} : ${LIKELIHOOD_SHORT[ligne.avant].toLowerCase()} → ${LIKELIHOOD_SHORT[ligne.apres].toLowerCase()}`
              : `${ligne.branche} : ${LIKELIHOOD_SHORT[ligne.apres].toLowerCase()}`}
          </span>
          <span className="relative mt-2 block h-[5px] rounded-rp bg-repos" aria-hidden="true">
            <span
              className={`block h-full rounded-rp ${SEMANTIC_FILL[ligne.semantique]}`}
              style={{ width: `${CRAN[ligne.apres]}%` }}
            />
            {ligne.avant && (
              <span
                className="absolute -top-0.5 h-[9px] w-0.5 bg-encre"
                style={{ left: `calc(${CRAN[ligne.avant]}% - 1px)` }}
              />
            )}
          </span>
          <span className="mt-1.5 flex justify-between gap-2 text-10-5 text-tenu">
            <span>Vraisemblance éditoriale · faible, modérée, centrale</span>
            <span>{ligne.semaineAvant ? `▏ ${ligne.semaineAvant}` : PREMIERE_VERSION_SUIVIE}</span>
          </span>
        </span>
        {chevron}
      </Link>
    );
  }

  if (ligne.type === "guet") {
    return (
      <Link href={`/notes/${noteSlug}#CeQueJeSurveille`} className={classe}>
        <span className="min-w-0">
          {surtitre(`Guet échu le ${formatJourMois(ligne.echeance)} · ${ligne.driverLabel}`)}
          <span className="mt-0.5 block text-13-5 font-medium text-encre">{ligne.libelle}</span>
        </span>
        <span className="self-center rounded-rp bg-k-choc/11 px-2 py-0.5 text-11 font-semibold text-k-choc">
          À trancher
        </span>
      </Link>
    );
  }

  return (
    <Link href={`/notes/${noteSlug}#CeQuiAChange`} className={classe}>
      <span className="min-w-0">
        {surtitre(`Nouvelle lecture · ${ligne.sujet}`)}
        <span className="mt-0.5 block text-13-5 font-medium text-encre">{ligne.libelle}</span>
      </span>
      {chevron}
    </Link>
  );
}
