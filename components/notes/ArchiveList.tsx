"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArchiveWeek } from "@/lib/archive";
import { formatDateLong } from "@/lib/format";
import { ZONE_LABELS } from "@/lib/zones";
import type { Zone } from "@/lib/types";

type TypeFilter = "tout" | "hebdo" | "speciale";

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`border px-3 py-1.5 font-mono text-12-5 font-medium ${
        active ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink-2 hover:border-mute"
      }`}
    >
      {children}
    </button>
  );
}

export type ArchiveDriverOption = { id: string; label: string };

export function ArchiveList({
  weeks,
  zone,
  drivers,
  revisionsBySlug,
}: {
  weeks: ArchiveWeek[];
  zone: Zone;
  /** Les drivers proposés au filtre — libellés résolus côté serveur. */
  drivers: ArchiveDriverOption[];
  /** Pour chaque slug de note, les drivers qu'elle a révisés. */
  revisionsBySlug: Record<string, string[]>;
}) {
  const [filter, setFilter] = useState<TypeFilter>("tout");
  const [driverFilter, setDriverFilter] = useState<string>("tout");
  const ordered = [...weeks].reverse(); // le plus récent en tête

  // Filtrer par driver, c'est demander « quelles notes ont révisé cette incertitude ? ».
  const revisedBySelectedDriver = (slug: string) =>
    driverFilter === "tout" || (revisionsBySlug[slug] ?? []).includes(driverFilter);

  return (
    <div>
      <div className="flex flex-col gap-2 border border-line bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 font-mono text-10-5 uppercase tracking-wider text-mute">Type</span>
          <FilterButton active={filter === "tout"} onClick={() => setFilter("tout")}>
            Tout
          </FilterButton>
          <FilterButton active={filter === "hebdo"} onClick={() => setFilter("hebdo")}>
            Hebdo
          </FilterButton>
          <FilterButton active={filter === "speciale"} onClick={() => setFilter("speciale")}>
            Spéciales
          </FilterButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 font-mono text-10-5 uppercase tracking-wider text-mute">Driver</span>
          <FilterButton active={driverFilter === "tout"} onClick={() => setDriverFilter("tout")}>
            Tout
          </FilterButton>
          {drivers.map((d) => (
            <FilterButton
              key={d.id}
              active={driverFilter === d.id}
              onClick={() => setDriverFilter(d.id)}
            >
              {d.label}
            </FilterButton>
          ))}
        </div>
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {ordered.map((week) => {
          const showHebdo =
            filter !== "speciale" && week.hebdo && revisedBySelectedDriver(week.hebdo.slug)
              ? week.hebdo
              : null;
          const showSpecials =
            filter !== "hebdo"
              ? week.specials.filter((s) => revisedBySelectedDriver(s.slug))
              : [];

          return (
            <li key={week.isoWeek} className="border border-line bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-line-2 bg-paper px-3.5 py-2">
                <span className="font-mono text-xs font-semibold text-ink-2">{week.isoWeek}</span>
                {week.isGap && (
                  <span className="font-mono text-11 font-semibold uppercase tracking-wide text-rust">
                    Trou — aucune hebdo publiée
                  </span>
                )}
                {week.isCurrentWeek && !week.hebdo && (
                  <span className="font-mono text-11 font-semibold uppercase tracking-wide text-mute">
                    Semaine en cours — hebdo à paraître dimanche
                  </span>
                )}
              </div>

              <div className="px-3.5 py-3">
                {week.emptyForZone && (
                  <p className="text-13-5 italic text-mute">
                    Aucune note ne concerne {ZONE_LABELS[zone]} cette semaine.
                  </p>
                )}

                {!week.emptyForZone && week.isGap && (
                  <p className="text-13-5 italic text-rust">
                    Discipline rompue : aucune note, pas même une hebdo courte, n&rsquo;a été
                    publiée cette semaine-là.
                  </p>
                )}

                {!week.emptyForZone && !week.isGap && !showHebdo && showSpecials.length === 0 && (
                  <p className="text-13-5 italic text-mute">
                    Rien dans cette semaine ne correspond aux filtres.
                  </p>
                )}

                {showHebdo && week.hebdo && (
                  <Link
                    href={`/notes/${week.hebdo.slug}`}
                    className="block border border-line-2 px-3 py-2.5 hover:border-deep"
                  >
                    <span className="font-display text-14-5 font-bold text-ink">
                      {week.hebdo.regimeStatement}
                    </span>
                    <span className="mt-1 block font-mono text-11 text-mute">
                      Hebdo · {formatDateLong(week.hebdo.date)}
                    </span>
                  </Link>
                )}

                {showSpecials.length > 0 && (
                  <ol className={`flex flex-col gap-2 ${showHebdo ? "mt-2 ml-4 border-l-2 border-line pl-3" : ""}`}>
                    {showSpecials.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/notes/${s.slug}`}
                          className="block border border-ochre-bg bg-ochre-bg/40 px-3 py-2 hover:border-ochre"
                        >
                          <span className="font-display text-13-5 font-bold text-ink">
                            {s.regimeStatement}
                          </span>
                          <span className="mt-1 block font-mono text-11 text-mute">
                            {s.slug} · {formatDateLong(s.date)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
