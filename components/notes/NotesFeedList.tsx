"use client";

import { useState } from "react";
import type { Note } from "@/lib/types";
import { EmptyState } from "@/components/states/EmptyState";
import { NoteCard, type NoteCardDriver } from "./NoteCard";

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

export type FeedDriverOption = { id: string; label: string };

export type FeedListItem =
  | { kind: "note"; note: Note; excerpt: string | null; drivers: NoteCardDriver[] }
  | { kind: "gap"; isoWeek: string };

/**
 * Le fil chronologique plat de `/notes` : les mêmes cartes-articles que l'étagère, empilées
 * du plus récent au plus ancien, sans arborescence par semaine. Filtrable par type et par
 * driver. Une semaine sans hebdo reste visible même filtrée : la discipline rompue n'est pas
 * quelque chose qu'un filtre doit pouvoir masquer.
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
    if (item.kind === "gap") return true;
    if (typeFilter !== "tout" && item.note.kind !== typeFilter) return false;
    if (driverFilter !== "tout" && !item.drivers.some((d) => d.id === driverFilter)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-2 border border-line bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 font-mono text-10-5 uppercase tracking-wider text-mute">Type</span>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 font-mono text-10-5 uppercase tracking-wider text-mute">Driver</span>
          <FilterButton active={driverFilter === "tout"} onClick={() => setDriverFilter("tout")}>
            Tout
          </FilterButton>
          {drivers.map((d) => (
            <FilterButton key={d.id} active={driverFilter === d.id} onClick={() => setDriverFilter(d.id)}>
              {d.label}
            </FilterButton>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Rien ne correspond à ces filtres"
            description="Choisissez « Tout » sur l'un des deux filtres pour retrouver les notes."
          />
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-3" aria-label="Notes, de la plus récente à la plus ancienne">
          {visible.map((item) =>
            item.kind === "gap" ? (
              <li
                key={`gap-${item.isoWeek}`}
                className="flex items-center gap-2 border-l-2 border-rust bg-rust-bg/40 px-3 py-2 font-mono text-11-5 text-ink-2"
              >
                <span className="font-semibold text-rust">{item.isoWeek}</span>
                aucune hebdo publiée — discipline rompue
              </li>
            ) : (
              <li key={item.note.slug}>
                <NoteCard note={item.note} excerpt={item.excerpt} drivers={item.drivers} />
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}
