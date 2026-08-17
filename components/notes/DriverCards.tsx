import Link from "next/link";
import type { Driver } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { BRANCH_LABELS } from "@/lib/scenario-labels";

/**
 * Couche 1 des Notes : ce qu'on lit en dix secondes, et le point d'entrée de toute la
 * navigation. Cartes claires sur le bandeau bleu pétrole — le contraste 7:1 exigé par le
 * cahier interdit de poser du texte de corps directement sur ce fond.
 *
 * L'ordre est celui du `driverOrder` de la dernière note : un jugement d'intensité, pas un
 * calcul. Un driver retiré n'a pas de carte, mais sa page reste accessible.
 */
export function DriverCards({ drivers }: { drivers: Driver[] }) {
  if (drivers.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Les drivers du moment">
      <h2 className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
        Ce qui fait bouger le marché
      </h2>
      <ol className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((driver, i) => (
          <li key={driver.id}>
            <Link
              href={`/notes/drivers/${driver.id}`}
              className="flex h-full flex-col rounded-rc border border-trait bg-page px-3.5 py-3 hover:border-k-choc"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-10-5 font-semibold text-tenu">{i + 1}</span>
                <span className="text-10-5 uppercase tracking-cap text-tenu">
                  {driver.label}
                </span>
              </span>
              <span className="mt-1 text-14-5 font-bold leading-snug text-encre">
                {driver.question}
              </span>
              <span className="mt-2 border-t border-trait pt-2 text-13 font-bold text-k-choc">
                {BRANCH_LABELS[driver.dominantBranchId] ?? driver.dominantBranchId}
              </span>
              <span className="mt-0.5 text-10-5 text-tenu">
                révisé le {formatDateShort(driver.lastRevisedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
