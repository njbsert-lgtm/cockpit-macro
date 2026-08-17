"use client";

import { useState } from "react";
import type { ScenarioVersion } from "@/lib/types";
import { BRANCH_LABELS, IMPACT_LABELS, LIKELIHOOD_LABELS } from "@/lib/scenario-labels";

const DIRECTION_CLASS: Record<string, string> = {
  up: "text-hausse",
  down: "text-baisse",
  flat: "text-tenu",
};

const DIRECTION_ARROW: Record<string, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

function BranchBody({ branch }: { branch: ScenarioVersion }) {
  return (
    <>
      <p className="text-14-5 text-doux">{branch.thesis}</p>

      {branch.likelihoodChangedFrom && (
        <p className="mt-3 border-l-3 border-k-choc bg-k-choc/11 px-3 py-2 text-13 text-doux">
          <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">
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
            <div key={key} className="border-t border-trait pt-2">
              <dt className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
                {IMPACT_LABELS[key]}
              </dt>
              <dd>
                <span
                  className={`text-13 font-bold ${DIRECTION_CLASS[impact.direction]}`}
                >
                  {DIRECTION_ARROW[impact.direction]} {impact.label}
                </span>
                <span className="mt-0.5 block text-13 text-doux">{impact.text}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-3 border-l-3 border-encre bg-repos px-3 py-2.5">
        <p className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
          Signaux à surveiller
        </p>
        <p className="mt-1 text-13 text-doux">{branch.watchSignals}</p>
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
      <span className="block text-15 font-bold text-encre">
        {BRANCH_LABELS[branch.branchId] ?? branch.branchId}
      </span>
      <span
        className={`mt-0.5 block text-11 tracking-wide ${
          dominant ? "font-semibold text-k-choc" : "text-tenu"
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
        <div role="tablist" aria-label="Branches du scénario" className="flex flex-col border border-trait">
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
              className={`border-b border-trait px-4 py-3 text-left last:border-b-0 focus-visible:-outline-offset-3 ${
                b.branchId === active.branchId ? "bg-page shadow-active-tab" : "bg-repos"
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
          className="border border-t-0 border-trait bg-page p-4"
        >
          <BranchBody branch={active} />
        </div>
      </div>

      {/* Desktop : les trois côte à côte, comparables. */}
      <div className="hidden gap-px bg-trait md:grid md:grid-cols-3 md:border md:border-trait">
        {branches.map((b) => (
          <section key={b.branchId} className="bg-page p-4">
            <header
              className={`border-b-2 pb-2 ${
                b.branchId === dominantBranchId ? "border-encre" : "border-trait"
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
