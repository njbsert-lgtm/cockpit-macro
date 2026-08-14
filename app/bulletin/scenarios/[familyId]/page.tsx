import { notFound } from "next/navigation";
import Link from "next/link";
import { getScenarioVersionsByFamily } from "@/lib/data";
import { formatDateLong } from "@/lib/format";
import {
  BRANCH_LABELS,
  BRANCH_ORDER,
  FAMILY_LABELS,
  LIKELIHOOD_LABELS,
} from "@/lib/scenario-labels";
import type { ScenarioFamilyId } from "@/lib/types";

const LIKELIHOOD_CLASS: Record<string, string> = {
  central: "bg-teal-bg text-teal",
  moderee: "bg-ochre-bg text-ochre",
  faible: "bg-line-2 text-ink-2",
};

export default async function ScenarioTrajectoryPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId: raw } = await params;
  const familyId = raw as ScenarioFamilyId;
  const branchOrder = BRANCH_ORDER[familyId];
  if (!branchOrder) notFound();

  const versions = getScenarioVersionsByFamily(familyId);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href="/bulletin"
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Retour au bulletin
      </Link>

      <p className="font-mono text-11 uppercase tracking-wider text-mute">
        Trajectoire des scénarios
      </p>
      <h1 className="mt-1.5 font-display text-28 font-extrabold text-ink">
        {FAMILY_LABELS[familyId]}
      </h1>
      <p className="mt-2 max-w-[64ch] text-15 text-mute">
        Comment la vraisemblance de chaque branche a évolué dans le temps — la vue qui montre
        si la lecture a suivi les données ou couru derrière les prix.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {branchOrder.map((branchId) => {
          const branchVersions = versions
            .filter((v) => v.branchId === branchId)
            .sort((a, b) => a.version - b.version);
          if (branchVersions.length === 0) return null;
          const latest = branchVersions[branchVersions.length - 1];

          return (
            <section key={branchId} className="border border-line bg-card">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3">
                <h2 className="font-display text-base font-bold text-ink">
                  {BRANCH_LABELS[branchId] ?? branchId}
                </h2>
                <span
                  className={`px-2 py-1 font-mono text-11 font-semibold uppercase tracking-wider ${LIKELIHOOD_CLASS[latest.likelihood]}`}
                >
                  {LIKELIHOOD_LABELS[latest.likelihood]}
                </span>
              </header>
              <ol className="flex flex-col gap-3 p-4">
                {branchVersions.map((v) => (
                  <li key={v.version} className="border-l-2 border-line pl-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-11 font-semibold text-mute">
                        v{v.version}
                      </span>
                      <span className="font-mono text-11-5 text-mute">
                        {formatDateLong(v.date)}
                      </span>
                      <Link
                        href={`/bulletin/${v.editionSlug}`}
                        className="font-mono text-11-5 text-deep underline decoration-line underline-offset-4"
                      >
                        {v.editionSlug}
                      </Link>
                      <span
                        className={`px-1.5 py-0.5 font-mono text-10 font-semibold uppercase tracking-wider ${LIKELIHOOD_CLASS[v.likelihood]}`}
                      >
                        {LIKELIHOOD_LABELS[v.likelihood]}
                      </span>
                    </div>
                    {v.likelihoodChangedFrom && (
                      <p className="mt-1.5 text-13-5 text-ink-2">
                        <span className="font-semibold text-ochre">
                          {LIKELIHOOD_LABELS[v.likelihoodChangedFrom]} → {LIKELIHOOD_LABELS[v.likelihood]}.
                        </span>{" "}
                        {v.why}
                      </p>
                    )}
                    <p className="mt-1.5 max-w-[64ch] text-13-5 text-mute">{v.thesis}</p>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
