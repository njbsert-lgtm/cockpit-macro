"use client";

import { useState } from "react";
import Link from "next/link";
import { DataValue } from "@/components/states/DataValue";
import { PerfValue } from "./PerfValue";

export type InstrumentRow = {
  id: string;
  label: string;
  href: string;
  value: string | null;
  date: string | null;
  fetchedAt: string | null;
  source: string;
  ytd: number | null;
  oneMonth: number | null;
  note: string;
  inZone: boolean;
};

type SortKey = "default" | "ytd" | "oneMonth";

export function InstrumentTable({ rows, zoneLabel }: { rows: InstrumentRow[]; zoneLabel: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [asc, setAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setAsc((a) => !a);
    } else {
      setSortKey(key);
      setAsc(false);
    }
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === "default") {
      if (a.inZone !== b.inZone) return a.inZone ? -1 : 1;
      return 0;
    }
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return asc ? av - bv : bv - av;
  });

  const headerBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute hover:text-ink"
    >
      {label}
      {sortKey === key && <span aria-hidden="true">{asc ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="overflow-x-auto border border-line bg-card">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-ink">
            <th className="px-3 py-2.5 text-left">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                Instrument
              </span>
            </th>
            <th className="px-3 py-2.5 text-left">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                Valeur
              </span>
            </th>
            <th className="px-3 py-2.5 text-right">{headerBtn("ytd", "YTD")}</th>
            <th className="hidden px-3 py-2.5 text-right sm:table-cell">
              {headerBtn("oneMonth", "1 mois")}
            </th>
            <th className="hidden px-3 py-2.5 text-left lg:table-cell">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                Note
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className={`border-b border-line-2 last:border-b-0 ${row.inZone ? "bg-paper" : ""}`}>
              <td className="px-3 py-3 align-top">
                <Link href={row.href} className="font-display text-[14.5px] font-bold text-ink hover:text-deep">
                  {row.label}
                </Link>
                {row.inZone && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-deep">
                    {zoneLabel}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                <DataValue value={row.value} date={row.date} fetchedAt={row.fetchedAt} source={row.source} size="sm" />
              </td>
              <td className="px-3 py-3 text-right align-top">
                <PerfValue pct={row.ytd} size="sm" />
              </td>
              <td className="hidden px-3 py-3 text-right align-top sm:table-cell">
                <PerfValue pct={row.oneMonth} size="sm" />
              </td>
              <td className="hidden px-3 py-3 align-top text-[13px] text-ink-2 lg:table-cell">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
