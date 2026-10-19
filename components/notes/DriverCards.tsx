import Link from "next/link";
import type { Driver, ScenarioVersion } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { BRANCH_LABELS, BRANCH_ORDER, DRIVER_NON_REVISE, LIKELIHOOD_SHORT } from "@/lib/scenario-labels";
import { branchSemantic, LIKELIHOOD_FILL, SEMANTIC_FILL } from "@/lib/branch-semantics";
import { getNote } from "@/lib/content";
import { ALL_CHANNELS, CHANNEL_BG, CHANNEL_LABELS } from "@/lib/channels";

export type DriverWithBranches = { driver: Driver; branches: ScenarioVersion[] };

/**
 * Une branche : grille `1fr auto` — nom à gauche avec son sous-titre, vraisemblance à droite —
 * puis une jauge de 5px pleine largeur.
 *
 * La jauge est ordinale et le libellé est écrit : `likelihood` est une catégorie, pas un
 * pourcentage, et afficher « 55 % » reviendrait à fabriquer un chiffre.
 */
function Branch({ branch }: { branch: ScenarioVersion }) {
  const semantic = branchSemantic(branch);
  return (
    <li>
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
        <span className="min-w-0">
          <span className="block truncate text-13 text-encre">
            {BRANCH_LABELS[branch.branchId] ?? branch.branchId}
          </span>
          <span className="block truncate text-11-5 text-tenu">{branch.impacts.eq.label}</span>
        </span>
        {/* DESIGN.md ne colore que le remplissage de la jauge : la vraisemblance reste en
            encre. La peindre en vert ferait lire « faible » comme un jugement favorable. */}
        <span className="text-13 font-semibold text-encre">
          {LIKELIHOOD_SHORT[branch.likelihood]}
        </span>
      </div>
      <div
        className="mt-1.5 h-[5px] w-full overflow-hidden rounded-rp bg-repos"
        role="img"
        aria-label={`Vraisemblance ${LIKELIHOOD_SHORT[branch.likelihood].toLowerCase()}`}
      >
        <div className={`h-full rounded-rp ${LIKELIHOOD_FILL[branch.likelihood]} ${SEMANTIC_FILL[semantic]}`} />
      </div>
    </li>
  );
}

/**
 * Le pied d'une carte de driver (DESIGN.md) : les points de canal suivis de leurs noms. Les
 * canaux d'un driver sont ceux de la note qui l'a révisé en dernier, dans l'ordre fixe de la
 * grille ; sans canal déclaré, le libellé du driver tient la place plutôt qu'un vide.
 */
function DriverChannels({ driverLabel, noteSlug }: { driverLabel: string; noteSlug: string }) {
  const declared = new Set(getNote(noteSlug)?.channels ?? []);
  const channels = ALL_CHANNELS.filter((c) => declared.has(c));
  if (channels.length === 0) {
    return <span className="truncate text-11 text-doux">{driverLabel}</span>;
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      {channels.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 text-11 text-doux">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-rp ${CHANNEL_BG[c]}`} />
          {CHANNEL_LABELS[c]}
        </span>
      ))}
    </span>
  );
}

/**
 * Couche 1 des Notes : ce qu'on lit en dix secondes, et le point d'entrée de toute la
 * navigation. Cartes empilées en pleine largeur — chacune porte une question, trois branches
 * et une date, ce qui est trop de texte pour une vignette étroite.
 *
 * L'ordre est celui du `driverOrder` de la dernière note : un jugement d'intensité, pas un
 * calcul. Un driver retiré n'a pas de carte, mais sa page reste accessible.
 */
export function DriverCards({ drivers }: { drivers: DriverWithBranches[] }) {
  if (drivers.length === 0) return null;

  return (
    <section className="mt-7" aria-label="Les drivers du moment">
      <ol className="flex flex-col gap-2.5">
        {drivers.map(({ driver, branches }) => {
          const ordered = (BRANCH_ORDER[driver.id] ?? [])
            .map((id) => branches.find((b) => b.branchId === id))
            .filter((b): b is ScenarioVersion => b !== undefined);
          const list = ordered.length > 0 ? ordered : branches;

          return (
            <li key={driver.id}>
              <Link
                href={`/notes/drivers/${driver.id}`}
                className="block rounded-rc border border-trait bg-page p-4 transition-colors hover:border-trait-f active:scale-[.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-15-5 font-semibold leading-[1.25] tracking-titre text-encre">
                    {driver.question}
                  </h3>
                  <span className="shrink-0 rounded-rp bg-repos px-2 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-tenu">
                    Driver
                  </span>
                </div>

                {driver.lastRevisedIn && driver.lastRevisedAt && list.length > 0 ? (
                  <>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {list.map((b) => (
                        <Branch key={b.branchId} branch={b} />
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-trait pt-2.5">
                      <DriverChannels driverLabel={driver.label} noteSlug={driver.lastRevisedIn} />
                      <span className="shrink-0 text-11 tabular-nums text-tenu">
                        révisé le {formatDateShort(driver.lastRevisedAt)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 rounded-rp bg-repos px-3 py-2 text-12-5 text-doux">{DRIVER_NON_REVISE}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
