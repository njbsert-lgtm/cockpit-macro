"use client";

import { useState } from "react";
import { EmptyState } from "@/components/states/EmptyState";
import type { Note } from "@/lib/types";
import type { BlockName } from "@/lib/note-blocks";
import { groupByMonth, type ArchiveEntry as Entry } from "@/lib/notes-archive";
import type { NoteCardDriver } from "./NoteCard";
import { ArchiveEntry } from "./ArchiveEntry";

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
      className={`min-h-11 shrink-0 whitespace-nowrap rounded-rp border px-3 text-13 font-medium transition-colors ${
        active
          ? "border-encre bg-encre text-white"
          : "border-trait bg-page text-doux hover:border-trait-f hover:text-encre"
      }`}
    >
      {children}
    </button>
  );
}

export type FeedDriverOption = { id: string; label: string };

export type FeedListItem = {
  kind: "note";
  note: Note;
  excerpt: string | null;
  blocks: BlockName[];
  drivers: NoteCardDriver[];
};

/**
 * L'archive de `/notes` : groupée par mois avec un intertitre en capitales, chaque entrée
 * dépliable pour montrer l'état de ses blocs obligatoires (DESIGN.md).
 *
 * Filtrable par type et par driver.
 */
export function NotesFeedList({
  items,
  drivers,
}: {
  items: FeedListItem[];
  drivers: FeedDriverOption[];
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("tout");
  const [driverFilter, setDriverFilter] = useState<string>("tout");

  const visible = items.filter((item) => {
    if (typeFilter !== "tout" && item.note.kind !== typeFilter) return false;
    if (driverFilter !== "tout" && !item.drivers.some((d) => d.id === driverFilter)) return false;
    return true;
  });

  const months = groupByMonth(
    visible.map(
      (item): Entry => ({ kind: "note", note: item.note, excerpt: item.excerpt, blocks: item.blocks }),
    ),
  );

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="sans-barre -mx-4.5 flex items-center gap-2 overflow-x-auto px-4.5">
          <span className="shrink-0 text-9-5 font-semibold uppercase tracking-cap text-tenu">
            Type
          </span>
          <FilterButton active={typeFilter === "tout"} onClick={() => setTypeFilter("tout")}>
            Tout
          </FilterButton>
          <FilterButton active={typeFilter === "hebdo"} onClick={() => setTypeFilter("hebdo")}>
            Hebdo
          </FilterButton>
          <FilterButton active={typeFilter === "speciale"} onClick={() => setTypeFilter("speciale")}>
            Spéciales
          </FilterButton>
        </div>
        <div className="sans-barre -mx-4.5 flex items-center gap-2 overflow-x-auto px-4.5">
          <span className="shrink-0 text-9-5 font-semibold uppercase tracking-cap text-tenu">
            Driver
          </span>
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

      {months.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Rien ne correspond à ces filtres"
            description="Choisissez « Tout » sur l'un des deux filtres pour retrouver les notes."
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {months.map((month) => (
            <section key={month.key}>
              <h2 className="text-11 font-semibold uppercase tracking-cap text-tenu">
                {month.label}
              </h2>
              <ol className="mt-2 flex flex-col gap-2">
                {month.entries.map((entry) => (
                  <li key={entry.note.slug}>
                    <ArchiveEntry note={entry.note} excerpt={entry.excerpt} blocks={entry.blocks} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
