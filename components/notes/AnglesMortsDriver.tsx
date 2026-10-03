import Link from "next/link";
import { ANGLES_MORTS } from "@/config/angles-morts";
import type { VueDriver } from "@/lib/angles-morts";
import { formatDateShort } from "@/lib/format";
import { NonMesureBadge } from "@/components/states/NonMesureBadge";
import { SectionHeader } from "./SectionHeader";

/**
 * Les angles morts d'un driver (DESIGN.md) : en dernière section de la page, la liste au motif du
 * rappel de calendrier — panneau `--repos`, date, titre en lien vers la source, axe manquant
 * proposé. Le second compteur, « sans driver », n'a pas de driver : il tient en une phrase de pied.
 */
export function AnglesMortsDriver({ vue }: { vue: VueDriver }) {
  const compteur =
    vue.etat === "normal" ? `${vue.n} en ${ANGLES_MORTS.fenetreJours} jours` : undefined;

  return (
    <section className="mt-10">
      <SectionHeader
        title="Les angles morts"
        count={compteur}
        note="Ce que ce driver n'a pas su accueillir : un événement de matérialité haute qui ne se rattache à aucun de ses axes."
      />

      {vue.etat === "illisible" && (
        <div className="mt-3 rounded-rb bg-repos px-3.5 py-3">
          <NonMesureBadge />
          <p className="mt-2 text-12 text-doux">
            La table des angles morts n&rsquo;est pas lisible — migration non appliquée ou base
            injoignable. Le compteur ne dit rien plutôt que zéro.
          </p>
        </div>
      )}

      {vue.etat === "vide" && (
        <p className="mt-3 rounded-rb bg-repos px-3.5 py-3 text-12 text-doux">
          Aucun angle mort pour ce driver sur les {ANGLES_MORTS.fenetreJours} derniers jours — tout
          ce qui a été jugé de matérialité haute s&rsquo;est rattaché à l&rsquo;un de ses axes.
        </p>
      )}

      {vue.etat === "normal" && (
        <>
          {vue.alerte && (
            <p className="mt-3">
              <span className="rounded-rp bg-k-choc/11 px-2 py-0.5 text-11 font-semibold text-k-choc">
                Seuil atteint
              </span>{" "}
              <span className="text-12 text-tenu">
                {vue.n} sur ce driver — il manque probablement un axe.
              </span>
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-3 rounded-rb bg-repos px-3.5 py-3">
            {vue.angles.map((a) => (
              <li key={a.id}>
                <p className="text-10-5 tabular-nums text-tenu">{formatDateShort(a.date)}</p>
                <a
                  href={a.url}
                  className="text-13 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
                >
                  {a.titre}
                </a>
                <p className="mt-0.5 text-12 text-tenu">
                  {a.axeManquantPropose ? `Axe manquant : ${a.axeManquantPropose}` : "Aucun axe proposé"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {vue.etat !== "illisible" && (
        <p className="mt-3 text-12 text-tenu">
          Sans driver sur le trimestre : {vue.sansDriver} —{" "}
          <Link href="/" className="text-encre underline decoration-trait underline-offset-4">
            voir l&rsquo;accueil
          </Link>
          .
        </p>
      )}
    </section>
  );
}
