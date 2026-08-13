"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScenarioVersion } from "@/lib/types";
import { BRANCH_LABELS, IMPACT_LABELS, LIKELIHOOD_LABELS } from "@/lib/scenario-labels";

const DIRECTION_CLASS: Record<string, string> = {
  up: "text-teal",
  down: "text-rust",
  flat: "text-mute",
};

const DIRECTION_ARROW: Record<string, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

export function ScenarioFamilyTabs({
  title,
  branches,
  centralBranchId,
}: {
  title: string;
  branches: ScenarioVersion[];
  centralBranchId: string | null;
}) {
  const [selected, setSelected] = useState(centralBranchId ?? branches[0]?.branchId);

  if (branches.length === 0) {
    return null;
  }

  const active = branches.find((b) => b.branchId === selected) ?? branches[0];

  return (
    <div className="mt-6 border border-line bg-card">
      <h3 className="border-b border-line px-4 py-3 font-mono text-[13px] font-semibold uppercase tracking-wider">
        {title}
      </h3>
      <div role="tablist" aria-label={title} className="flex flex-col border-b border-line md:flex-row">
        {branches.map((b, i) => (
          <button
            key={b.branchId}
            role="tab"
            aria-selected={b.branchId === active.branchId}
            id={`tab-${b.branchId}`}
            aria-controls={`panel-${b.branchId}`}
            onClick={() => setSelected(b.branchId)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const next = branches[(i + d + branches.length) % branches.length];
              setSelected(next.branchId);
              document.getElementById(`tab-${next.branchId}`)?.focus();
            }}
            className={`border-b border-line px-4 py-3 text-left last:border-b-0 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-ochre md:flex-1 md:border-b-0 md:border-r md:last:border-r-0 ${
              b.branchId === active.branchId ? "bg-card shadow-[inset_0_3px_0_0_var(--color-ink)]" : "bg-paper hover:bg-line-2"
            }`}
          >
            <span className="block font-display text-[15px] font-bold text-ink">
              {BRANCH_LABELS[b.branchId] ?? b.branchId}
            </span>
            <span
              className={`mt-0.5 block font-mono text-[11px] tracking-wide ${
                b.branchId === active.branchId ? "text-ochre" : "text-mute"
              }`}
            >
              {LIKELIHOOD_LABELS[b.likelihood] ?? b.likelihood}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${active.branchId}`} aria-labelledby={`tab-${active.branchId}`} className="p-4 md:p-5">
        <p className="max-w-[70ch] text-[15.5px] text-ink-2">{active.thesis}</p>

        {active.likelihoodChangedFrom && (
          <p className="mt-3 border-l-3 border-ochre bg-ochre-bg px-3 py-2 text-[13.5px] text-ink-2">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ochre">
              Révision
            </span>{" "}
            — {LIKELIHOOD_LABELS[active.likelihoodChangedFrom]} → {LIKELIHOOD_LABELS[active.likelihood]}.{" "}
            {active.why}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {(["eq", "fi", "fx", "cm"] as const).map((key) => {
            const impact = active.impacts[key];
            return (
              <div key={key} className="bg-card p-3.5">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                  {IMPACT_LABELS[key]}
                </p>
                <p className={`mt-1.5 font-display text-[14.5px] font-bold ${DIRECTION_CLASS[impact.direction]}`}>
                  {DIRECTION_ARROW[impact.direction]} {impact.label}
                </p>
                <p className="mt-1 text-[13.5px] text-ink-2">{impact.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-l-3 border-ink bg-paper px-3.5 py-3">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mute">
            Signaux à surveiller
          </p>
          <p className="mt-1 text-[14px] text-ink-2">{active.watchSignals}</p>
        </div>

        <Link
          href={`/bulletin/scenarios/${active.familyId}`}
          className="mt-4 inline-block font-mono text-[12px] font-medium text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
        >
          Voir la trajectoire de cette famille →
        </Link>
      </div>
    </div>
  );
}
