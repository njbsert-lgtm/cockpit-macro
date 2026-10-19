import { notFound } from "next/navigation";
import Link from "next/link";
import { getOutlook, getOutlooks } from "@/lib/content";
import type { Outlook, OutlookPoint } from "@/lib/types";
import { SectionHeader } from "@/components/notes/SectionHeader";
import { SerieDocument } from "@/components/outlook/SerieDocument";

export function generateStaticParams() {
  return getOutlooks().flatMap((o) => o.points.map((p) => ({ id: o.id, point: p.id })));
}

/** « 635 Md$ » quand le point porte un chiffre, son thème sinon : le libellé d'un bouton de pied. */
function libelleCourt(outlook: Outlook, point: OutlookPoint): string {
  const theme = outlook.themes.find((t) => t.id === point.themeId);
  return `${theme?.emoji ?? ""} ${point.chiffre?.valeur ?? theme?.court ?? theme?.label ?? ""}`.trim();
}

const TEXTE_LECTURE = "text-14-5 leading-[1.6] text-encre text-justify hyphens-auto";

/**
 * Le détail d'un point majeur (maquette 3c) : son titre, ses chiffres, le graphique redessiné à
 * partir des seuls points cités, l'explication, les risques, et la capture du graphique original
 * quand elle existe. On passe d'un point au suivant sans revenir à la fiche.
 */
export default async function OutlookPointPage({ params }: { params: Promise<{ id: string; point: string }> }) {
  const { id, point: pointId } = await params;
  const outlook = getOutlook(id);
  const index = outlook?.points.findIndex((p) => p.id === pointId) ?? -1;
  if (!outlook || index < 0) notFound();

  const point = outlook.points[index];
  const theme = outlook.themes.find((t) => t.id === point.themeId);
  const precedent = outlook.points[index - 1];
  const suivant = outlook.points[index + 1];
  const chiffres = point.chiffres ?? (point.chiffre ? [point.chiffre] : []);

  return (
    <div className="mx-auto max-w-colonne px-4.5 pb-7 md:max-w-lecture md:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/outlook/${outlook.id}`} className="inline-flex min-h-11 items-center text-12 text-doux hover:text-encre">
          ← {outlook.bankMonogram} · {outlook.periodCovered}
        </Link>
        <span className="text-11 text-tenu">
          Point {index + 1} sur {outlook.points.length}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-2.5">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-rp bg-repos text-15">
          {theme?.emoji}
        </span>
        <span className="text-9-5 font-semibold uppercase tracking-cap text-tenu">{theme?.label}</span>
      </p>
      <h1 className="mt-3 text-21 font-bold leading-[1.25] tracking-[-.02em] text-pretty text-encre">
        {point.titre ?? point.texte}
      </h1>

      {chiffres.length > 0 && (
        <div className="mt-4">
          <dl className={`grid gap-px overflow-hidden rounded-rc border border-trait bg-trait ${chiffres.length >= 3 ? "grid-cols-3" : chiffres.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {chiffres.map((c) => (
              <div key={c.valeur} className="bg-repos px-3 py-2.5">
                <dt className="text-22 font-bold leading-tight text-encre">{c.valeur}</dt>
                <dd className="mt-1 text-11 leading-snug text-doux">{c.legende}</dd>
              </div>
            ))}
          </dl>
          {point.source && <p className="mt-2 text-11 text-tenu">Source : {point.source}</p>}
        </div>
      )}

      {point.serie && (
        <div className="mt-5">
          <SerieDocument serie={point.serie} />
        </div>
      )}

      {point.explication && (
        <section className="mt-6">
          <h2 className="text-17 font-semibold tracking-titre text-encre">L&rsquo;explication</h2>
          <p className={`mt-2 ${TEXTE_LECTURE}`}>{point.explication}</p>
        </section>
      )}
      {point.titre && !point.explication && <p className={`mt-5 ${TEXTE_LECTURE}`}>{point.texte}</p>}

      {point.risques && point.risques.length > 0 && (
        <section className="mt-6">
          <SectionHeader title="Les risques identifiés" count={`${point.risques.length}`} />
          <ul className="mt-3 overflow-hidden rounded-rc border border-trait">
            {point.risques.map((r) => (
              <li key={r} className="border-b border-trait px-3.5 py-3 text-13 text-encre last:border-b-0">
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {point.imageGraphique && (
        <section className="mt-6">
          <SectionHeader title="Le graphique du document" />
          {/* Capture fournie à la main, fichier statique. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={point.imageGraphique}
            alt={`Graphique original : ${point.serie?.titre ?? point.titre ?? point.texte}`}
            className="mt-3 h-[180px] w-full rounded-rc border border-trait object-contain"
          />
        </section>
      )}

      {(precedent || suivant) && (
        <nav aria-label="Points voisins" className="mt-7 flex items-center justify-between gap-3">
          {precedent ? (
            <Link
              href={`/outlook/${outlook.id}/${precedent.id}`}
              className="inline-flex min-h-11 items-center rounded-rb border border-trait px-4 py-2.5 text-13 font-medium text-encre hover:border-trait-f"
            >
              ‹ {libelleCourt(outlook, precedent)}
            </Link>
          ) : (
            <span />
          )}
          {suivant && (
            <Link
              href={`/outlook/${outlook.id}/${suivant.id}`}
              className="inline-flex min-h-11 items-center rounded-rb border border-trait px-4 py-2.5 text-13 font-medium text-encre hover:border-trait-f"
            >
              {libelleCourt(outlook, suivant)} ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
