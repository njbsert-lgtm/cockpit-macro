"use client";

import { useState } from "react";
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

function BranchBody({ branch }: { branch: ScenarioVersion }) {
  return (
    <>
      <p className="text-14-5 text-ink-2">{branch.thesis}</p>

      {branch.likelihoodChangedFrom && (
        <p className="mt-3 border-l-3 border-ochre bg-ochre-bg px-3 py-2 text-13 text-ink-2">
          <span className="font-mono text-10-5 font-semibold uppercase tracking-wider text-ochre">
            Révision
          </span>{" "}
          — {LIKELIHOOD_LABELS[branch.likelihoodChangedFrom]} →{" "}
          {LIKELIHOOD_LABELS[branch.likelihood]}. {branch.why}
        </p>
      )}

      <dl className="mt-3 flex flex-col gap-2">
        {(["eq", "fi", "fx", "cm"] as const).map((key) => {
          const impact = branch.impacts[key];
          return (
            <div key={key} className="border-t border-line-2 pt-2">
              <dt className="font-mono text-10 font-semibold uppercase tracking-wider text-mute">
                {IMPACT_LABELS[key]}
              </dt>
              <dd>
                <span
                  className={`font-display text-13-5 font-bold ${DIRECTION_CLASS[impact.direction]}`}
                >
                  {DIRECTION_ARROW[impact.direction]} {impact.label}
                </span>
                <span className="mt-0.5 block text-13 text-ink-2">{impact.text}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-3 border-l-3 border-ink bg-paper px-3 py-2.5">
        <p className="font-mono text-10-5 font-semibold uppercase tracking-wider text-mute">
          Signaux à surveiller
        </p>
        <p className="mt-1 text-13 text-ink-2">{branch.watchSignals}</p>
      </div>
    </>
  );
}

function BranchHeading({
  branch,
  dominant,
}: {
  branch: ScenarioVersion;
  dominant: boolean;
}) {
  return (
    <>
      <span className="block font-display text-15 font-bold text-ink">
        {BRANCH_LABELS[branch.branchId] ?? branch.branchId}
      </span>
      <span
        className={`mt-0.5 block font-mono text-11 tracking-wide ${
          dominant ? "font-semibold text-ochre" : "text-mute"
        }`}
      >
        {LIKELIHOOD_LABELS[branch.likelihood]}
        {dominant && " · dominante"}
      </span>
    </>
  );
}

/**
 * Les trois branches d'un driver. Côte à côte sur desktop pour qu'elles soient comparables
 * d'un coup d'œil ; en onglets sur mobile, où trois colonnes seraient illisibles.
 */
export function DriverBranches({
  branches,
  dominantBranchId,
}: {
  branches: ScenarioVersion[];
  dominantBranchId: string;
}) {
  const [selected, setSelected] = useState(dominantBranchId);
  const active = branches.find((b) => b.branchId === selected) ?? branches[0];

  if (branches.length === 0) return null;

  return (
    <>
      {/* Mobile : onglets. */}
      <div className="md:hidden">
        <div role="tablist" aria-label="Branches du scénario" className="flex flex-col border border-line">
          {branches.map((b, i) => (
            <button
              key={b.branchId}
              role="tab"
              id={`branche-${b.branchId}`}
              aria-selected={b.branchId === active.branchId}
              aria-controls={`panneau-${b.branchId}`}
              onClick={() => setSelected(b.branchId)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const next = branches[(i + d + branches.length) % branches.length];
                setSelected(next.branchId);
                document.getElementById(`branche-${next.branchId}`)?.focus();
              }}
              className={`border-b border-line px-4 py-3 text-left last:border-b-0 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ochre ${
                b.branchId === active.branchId ? "bg-card shadow-active-tab" : "bg-paper"
              }`}
            >
              <BranchHeading branch={b} dominant={b.branchId === dominantBranchId} />
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`panneau-${active.branchId}`}
          aria-labelledby={`branche-${active.branchId}`}
          className="border border-t-0 border-line bg-card p-4"
        >
          <BranchBody branch={active} />
        </div>
      </div>

      {/* Desktop : les trois côte à côte, comparables. */}
      <div className="hidden gap-px bg-line md:grid md:grid-cols-3 md:border md:border-line">
        {branches.map((b) => (
          <section key={b.branchId} className="bg-card p-4">
            <header
              className={`border-b-2 pb-2 ${
                b.branchId === dominantBranchId ? "border-ink" : "border-line-2"
              }`}
            >
              <BranchHeading branch={b} dominant={b.branchId === dominantBranchId} />
            </header>
            <div className="mt-3">
              <BranchBody branch={b} />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
