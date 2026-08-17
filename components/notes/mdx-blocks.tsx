import { BLOCK_TITLES, type BlockName } from "@/lib/notes";
import type { VeilleItem } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { groupEvidenceByBlock, sortChronologically } from "@/lib/veille/evidence";

type BlockProps = { children?: React.ReactNode };

/**
 * Un item versé depuis `/triage` vers ce bloc, cité comme pièce à conviction — le titre reste
 * le lien cliquable, la source identifie qui l'a publié.
 */
function EvidencePills({ items }: { items: VeilleItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Pièces à conviction" className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            title={item.title}
            className="inline-block max-w-[26ch] truncate rounded-rc border border-trait bg-repos px-1.5 py-0.5 align-bottom text-10-5 text-doux hover:border-trait-f hover:text-encre"
          >
            {item.source} · {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Chaque bloc analytique du MDX rend son propre titre de section : l'auteur écrit
 * `<CeQuiAChange>` et n'a jamais à répéter l'intitulé, donc il ne peut pas dériver d'une
 * note à l'autre. Les pièces à conviction versées vers ce bloc depuis `/triage` s'affichent
 * en pied de section, après le jugement écrit — jamais avant.
 */
function Block({
  name,
  evidence,
  children,
}: {
  name: BlockName;
  evidence: VeilleItem[];
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t border-trait py-4 first:border-t-0">
      <h4 className="text-11 font-semibold uppercase tracking-cap text-tenu">
        {BLOCK_TITLES[name]}
      </h4>
      <div className="mt-2 max-w-[70ch] text-15-5 leading-relaxed text-doux [&>p]:mt-3 [&>p:first-child]:mt-0">
        {children}
      </div>
      <EvidencePills items={evidence} />
    </section>
  );
}

/**
 * Balise auto-porteuse : l'auteur écrit `<LeFilDeLaSemaine />`, sans contenu — la liste
 * chronologique est résolue au rendu depuis `Note.veilleItemRefs`, pas rédigée à la main.
 * Absent purement et simplement quand la note n'en cite aucun : pas de section vide.
 */
function LeFilDeLaSemaineBlock({ items }: { items: VeilleItem[] }) {
  if (items.length === 0) return null;
  const chronological = sortChronologically(items);

  return (
    <section className="border-t border-trait py-4">
      <h4 className="text-11 font-semibold uppercase tracking-cap text-tenu">
        {BLOCK_TITLES.LeFilDeLaSemaine}
      </h4>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {chronological.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-13 leading-snug text-doux">
            <span className="shrink-0 text-10-5 text-tenu">{formatDateShort(item.publishedAt)}</span>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-encre hover:underline"
            >
              {item.title}
            </a>
            <span className="shrink-0 text-10-5 text-tenu">— {item.source}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Fabrique plutôt que carte statique : les pastilles de preuve et le fil de la semaine ont
 * besoin des items de veille résolus pour *cette* note (`NoteBlocks.tsx` les charge avant
 * d'appeler `compileMDX`), ce qu'une carte de composants figée ne peut pas porter.
 */
export function createNoteMdxComponents(veilleItems: VeilleItem[]) {
  const byBlock = groupEvidenceByBlock(veilleItems);
  const evidenceFor = (name: BlockName) => byBlock.get(name) ?? [];

  return {
    CeQuiAChange: (p: BlockProps) => <Block name="CeQuiAChange" evidence={evidenceFor("CeQuiAChange")} {...p} />,
    CeQuiSestConfirme: (p: BlockProps) => (
      <Block name="CeQuiSestConfirme" evidence={evidenceFor("CeQuiSestConfirme")} {...p} />
    ),
    RevisionDesScenarios: (p: BlockProps) => (
      <Block name="RevisionDesScenarios" evidence={evidenceFor("RevisionDesScenarios")} {...p} />
    ),
    CeQueJavaisMalLu: (p: BlockProps) => (
      <Block name="CeQueJavaisMalLu" evidence={evidenceFor("CeQueJavaisMalLu")} {...p} />
    ),
    CeQueJeSurveille: (p: BlockProps) => (
      <Block name="CeQueJeSurveille" evidence={evidenceFor("CeQueJeSurveille")} {...p} />
    ),
    RecapDesSpeciales: (p: BlockProps) => (
      <Block name="RecapDesSpeciales" evidence={evidenceFor("RecapDesSpeciales")} {...p} />
    ),
    LeFilDeLaSemaine: () => <LeFilDeLaSemaineBlock items={veilleItems} />,
  };
}
