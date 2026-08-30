import type { ReactNode } from "react";
import type { DecisionProposition } from "@/lib/redaction/publication";

const BOUTON_44 = "min-h-11 rounded-rb px-4 text-13 font-medium";

/**
 * Une proposition de révision — scénario ou tendance —, acceptée ou refusée d'un geste
 * (DESIGN.md) : bouton secondaire « Refuser », primaire « Accepter ». Aucun n'est coché par
 * défaut, et il n'existe aucun bouton qui accepterait tout en bloc.
 */
export function PropositionCard({
  titre,
  sousTitre,
  children,
  decision,
  action,
}: {
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  decision: DecisionProposition | undefined;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-rc border border-trait bg-page px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-14-5 font-semibold text-encre">{titre}</p>
          {sousTitre && <p className="mt-0.5 text-12 text-tenu">{sousTitre}</p>}
        </div>
        {decision && (
          <span className="shrink-0 rounded-rp bg-repos px-1.5 py-0.5 text-9-5 font-semibold uppercase tracking-cap text-doux">
            {decision.action === "accepter" ? "Acceptée" : "Refusée"}
          </span>
        )}
      </div>

      <div className="mt-2 text-12-5 text-doux">{children}</div>

      <div className="mt-3 flex gap-2">
        <form action={action}>
          <input type="hidden" name="action" value="refuser" />
          <button type="submit" className={`${BOUTON_44} border border-trait bg-page text-doux hover:border-trait-f hover:text-encre`}>
            Refuser
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="action" value="accepter" />
          <button type="submit" className={`${BOUTON_44} border border-encre bg-encre text-white hover:border-trait-f`}>
            Accepter
          </button>
        </form>
      </div>
    </div>
  );
}
