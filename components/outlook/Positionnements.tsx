import type { Outlook, Position } from "@/lib/types";
import { SectionHeader } from "@/components/notes/SectionHeader";

const SYMBOLE = { renforcer: "▲", neutre: "●", alleger: "▼" } as const;

function Cellule({ position }: { position: Position }) {
  if (!position) return <span className="text-tenu">n.p.</span>;
  return (
    <span className="text-encre">
      <span aria-hidden="true">{SYMBOLE[position.sens]} </span>
      <span className="sr-only">{position.sens === "renforcer" ? "Renforcer : " : position.sens === "alleger" ? "Alléger : " : "Neutre : "}</span>
      {position.libelle}
    </span>
  );
}

/**
 * La grille des positionnements comparés (maquette 2a) : ce que chaque maison recommande, lu dans
 * le document. ▲ ● ▼ en encre — une recommandation n'est pas une performance, ni vert ni rouge —
 * et « n.p. » quand le document ne tranche pas : on ne déduit jamais une position non écrite.
 */
export function Positionnements({ outlooks }: { outlooks: Outlook[] }) {
  const grille = "grid grid-cols-[64px_1fr_1fr_1fr] gap-2 px-3 py-2.5";
  return (
    <section aria-label="Positionnements comparés">
      <SectionHeader
        title="Positionnements comparés"
        count={`${outlooks.length} maison${outlooks.length > 1 ? "s" : ""}`}
        note="Ce que chaque maison recommande, lu dans le document."
      />
      <div className="mt-3 overflow-hidden rounded-rc border border-trait" role="table">
        <div role="row" className={`${grille} bg-repos text-9-5 font-semibold uppercase tracking-cap text-tenu`}>
          <span role="columnheader">Maison</span>
          <span role="columnheader">Actions</span>
          <span role="columnheader">Obligations</span>
          <span role="columnheader">Or, mat. 1res</span>
        </div>
        {outlooks.map((o) => (
          <div key={o.id} role="row" className={`${grille} border-t border-trait text-12`}>
            <span role="rowheader" className="font-semibold text-encre">
              {o.bankMonogram}
            </span>
            <span role="cell"><Cellule position={o.positionnement.actions} /></span>
            <span role="cell"><Cellule position={o.positionnement.obligations} /></span>
            <span role="cell"><Cellule position={o.positionnement.orMatieres} /></span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-11 text-tenu">▲ renforcer · ● neutre ou prudent · ▼ alléger · n.p. non précisé</p>
    </section>
  );
}
