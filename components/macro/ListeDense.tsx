import Link from "next/link";
import type { MacroIndicator, Observation } from "@/lib/types";
import { construireChiffre, libelleDate } from "@/lib/chiffres-vivants";
import { metricOf } from "@/lib/macro";
import { resolveNextRelease } from "@/lib/next-release";
import { estNonCollectee } from "@/lib/provenance";
import { NonCollecteBadge } from "@/components/states/NonCollecteBadge";

const PUB = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Courbe 64×22, trait 1.5px `--doux`, sans point : le profil d'une série, pas sa lecture. */
function MiniCourbe({ valeurs }: { valeurs: number[] }) {
  if (valeurs.length < 2) return <span className="block h-[22px] w-16" aria-hidden="true" />;
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const y = (v: number) => (max === min ? 11 : 2 + 18 * (1 - (v - min) / (max - min)));
  const d = valeurs.map((v, i) => `${i ? "L" : "M"}${((i / (valeurs.length - 1)) * 64).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 64 22" className="h-[22px] w-16" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--color-doux)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * La liste dense de l'onglet Macro sur mobile (maquette 1d) : une ligne par indicateur — libellé,
 * période et prochaine publication, mini-courbe, valeur et variation. Quatre indicateurs se lisent
 * sans défiler, là où les cartes hautes n'en montraient qu'un et demi.
 */
export function ListeDense({
  indicators,
  observations,
  citesParLaNote,
  semaine,
}: {
  indicators: MacroIndicator[];
  observations: Map<string, Observation[]>;
  citesParLaNote: Set<string>;
  semaine: string | null;
}) {
  return (
    <ul className="overflow-hidden rounded-rc border border-trait">
      {indicators.map((indicator) => {
        const obs = [...(observations.get(indicator.id) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
        const dernier = obs.at(-1);
        const precedent = obs.at(-2);
        const nonCollecte = estNonCollectee(dernier);
        const chiffre = construireChiffre({
          chiffre: { label: indicator.label, value: "" },
          note: { date: dernier?.date ?? "" },
          cible: { kind: "macro", id: indicator.id },
          indicateur: indicator,
          observations: obs,
          source: null,
        });
        const tauxDirecteur = metricOf(indicator) === "policy-rate";
        const ecart = dernier && precedent && !nonCollecte && !tauxDirecteur ? dernier.value - precedent.value : null;
        const prochaine = resolveNextRelease(indicator.nextRelease);
        const sous = [
          dernier ? libelleDate(dernier.date, indicator.frequency) : null,
          prochaine ? `pub. ${PUB.format(new Date(`${prochaine}T00:00:00Z`))}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <li key={indicator.id} className="border-b border-trait last:border-b-0">
            <Link
              href={`/macro/${indicator.id}`}
              className="grid min-h-11 grid-cols-[1fr_64px_auto] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-repos"
            >
              <span className="min-w-0">
                <span className="block text-14-5 font-bold leading-tight text-encre">{indicator.label}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-11 text-tenu">
                  {citesParLaNote.has(indicator.id) && semaine && (
                    <span className="rounded-rp border border-current px-1.5 text-9-5 font-semibold uppercase tracking-cap text-k-taux">
                      Cité {semaine}
                    </span>
                  )}
                  {sous}
                </span>
              </span>
              <MiniCourbe valeurs={obs.slice(-36).map((o) => o.value)} />
              <span className="text-right">
                {chiffre.actuel ? (
                  <>
                    <span className="block text-15 font-semibold text-encre">{chiffre.actuel.valeur}</span>
                    {nonCollecte ? (
                      <span className="mt-0.5 inline-flex"><NonCollecteBadge /></span>
                    ) : ecart !== null ? (
                      <span
                        className={`block text-12 font-semibold ${ecart > 0 ? "text-hausse" : ecart < 0 ? "text-baisse" : "text-tenu"}`}
                      >
                        {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
                        {Math.abs(ecart).toFixed(1).replace(".", ",")} pt
                      </span>
                    ) : chiffre.actuel.mention ? (
                      <span className="block text-11 text-tenu">{chiffre.actuel.mention.replace(/ depuis.*/, "")}</span>
                    ) : chiffre.actuel.variation ? (
                      <span
                        className={`block text-12 font-semibold ${chiffre.actuel.variation.sens === "up" ? "text-hausse" : chiffre.actuel.variation.sens === "down" ? "text-baisse" : "text-tenu"}`}
                      >
                        {chiffre.actuel.variation.texte}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-13 italic text-tenu">non suivi</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
