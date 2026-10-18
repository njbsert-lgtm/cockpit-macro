"use client";

import { useState } from "react";
import type { ScenarioVersion } from "@/lib/types";
import { BRANCH_LABELS, IMPACT_LABELS, LIKELIHOOD_LABELS } from "@/lib/scenario-labels";
import { branchSemantic, LIKELIHOOD_FILL, SEMANTIC_FILL } from "@/lib/branch-semantics";

/**
 * Un libellé d'impact (« Hausse forte, élargie ») est du contenu, pas une performance : la
 * règle chromatique de DESIGN.md lui interdit le vert et le rouge. La direction est portée par
 * la flèche et par le mot lui-même, jamais par la couleur seule.
 */
const DIRECTION_CLASS: Record<string, string> = {
  up: "text-encre",
  down: "text-encre",
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
                  className={`text-13 font-semibold ${DIRECTION_CLASS[impact.direction]}`}
                >
                  {DIRECTION_ARROW[impact.direction]} {impact.label}
                </span>
                <span className="mt-0.5 block text-13 text-doux">{impact.text}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-3 rounded-rc bg-repos p-3">
        <p className="text-10-5 font-semibold uppercase tracking-cap text-tenu">
          Signaux à surveiller
        </p>
        <p className="mt-1 text-13 text-doux">{branch.watchSignals}</p>
      </div>
    </>
  );
}

/** La jauge de vraisemblance, à trois crans, à la couleur sémantique de la branche. */
function Gauge({ branch }: { branch: ScenarioVersion }) {
  return (
    <div
      className="mt-1.5 h-[5px] w-full overflow-hidden rounded-rp bg-repos"
      role="img"
      aria-label={`Vraisemblance ${LIKELIHOOD_LABELS[branch.likelihood].toLowerCase()}`}
    >
      <div
        className={`h-full rounded-rp ${LIKELIHOOD_FILL[branch.likelihood]} ${SEMANTIC_FILL[branchSemantic(branch)]}`}
      />
    </div>
  );
}

/**
 * Le nom de la branche, sa vraisemblance écrite, et la mention « dominante » en toutes lettres —
 * jamais une couleur de canal pour dire la dominance (DESIGN.md, page d'un driver).
 */
function BranchHeading({
  branch,
  dominant,
}: {
  branch: ScenarioVersion;
  dominant: boolean;
}) {
  return (
    <>
      <span className="block text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">
        {BRANCH_LABELS[branch.branchId] ?? branch.branchId}
      </span>
      <span className="mt-0.5 block text-11 text-tenu">
        {LIKELIHOOD_LABELS[branch.likelihood]}
        {dominant && <span className="font-semibold text-encre"> · dominante</span>}
      </span>
      <Gauge branch={branch} />
    </>
  );
}

/**
 * Les trois branches d'un driver. Sur mobile, trois lignes-boutons empilées dans une carte —
 * la ligne active passe sur fond `--repos` — et le panneau de la branche active dessous ; sur
 * desktop, trois colonnes comparables dans une seule carte, la dominante marquée d'un filet haut
 * de 2px `--encre`.
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
      {/* Mobile : onglets empilés. */}
      <div className="md:hidden">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Branches du scénario"
          className="flex flex-col divide-y divide-trait overflow-hidden rounded-rc border border-trait"
        >
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
              className={`min-h-11 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-3 ${
                b.branchId === active.branchId ? "bg-repos" : "bg-page"
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
          className="mt-2.5 rounded-rc border border-trait bg-page p-4"
        >
          <BranchBody branch={active} />
        </div>
      </div>

      {/* Desktop : les trois côte à côte, comparables. */}
      <div className="hidden overflow-hidden rounded-rc border border-trait md:grid md:grid-cols-3 md:divide-x md:divide-trait">
        {branches.map((b) => (
          <section
            key={b.branchId}
            className={`bg-page p-4 ${
              b.branchId === dominantBranchId ? "border-t-2 border-t-encre" : "border-t-2 border-t-transparent"
            }`}
          >
            <header className="border-b border-trait pb-3">
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
