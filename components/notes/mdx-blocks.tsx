import { BLOCK_TITLES, type BlockName } from "@/lib/notes";
import type { Guet, Note, VeilleItem } from "@/lib/types";
import { GuetLine } from "./GuetLine";

type NoteSource = { label: string; url: string };
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
/**
 * Les sources du bloc — d'où viennent les chiffres qu'il avance. Elles sont déclarées bloc par
 * bloc dans le frontmatter, pas en pied de note : une liste unique en bas ne dit pas quelle
 * affirmation vient d'où.
 */
function BlockSources({ sources }: { sources: NoteSource[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-11 text-tenu">
      <span className="font-semibold uppercase tracking-cap">Sources</span>
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-trait underline-offset-4 transition-colors hover:text-encre hover:decoration-encre"
        >
          {s.label}
        </a>
      ))}
    </p>
  );
}

function Block({
  name,
  evidence,
  sources,
  children,
}: {
  name: BlockName;
  evidence: VeilleItem[];
  sources: NoteSource[];
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
      <BlockSources sources={sources} />
    </section>
  );
}

/**
 * Le bloc « ce que je surveille », dans sa forme structurée : une liste de guets plutôt que
 * de la prose. Le texte rédigé, s'il y en a, reste au-dessus — un guet est une pré-inscription,
 * pas un commentaire, et l'auteur peut vouloir dire un mot avant de les énumérer.
 *
 * Les notes antérieures à la bascille (`GUETS_REQUIS_A_PARTIR_DE`) n'ont pas de guets : elles
 * retombent sur le rendu en prose, sans traitement particulier ni mention de l'absence. Leur
 * bloc 5 n'a jamais été structuré, ce n'est pas une donnée manquante.
 */
function CeQueJeSurveilleBlock({
  guets,
  noteSlug,
  evidence,
  sources,
  children,
}: {
  guets: Guet[];
  noteSlug: string;
  evidence: VeilleItem[];
  sources: NoteSource[];
  children?: React.ReactNode;
}) {
  if (guets.length === 0) {
    return (
      <Block name="CeQueJeSurveille" evidence={evidence} sources={sources}>
        {children}
      </Block>
    );
  }

  return (
    <section className="border-t border-trait py-4 first:border-t-0">
      <h4 className="text-11 font-semibold uppercase tracking-cap text-tenu">
        {BLOCK_TITLES.CeQueJeSurveille}
      </h4>
      {children && (
        <div className="mt-2 max-w-[70ch] text-15-5 leading-relaxed text-doux [&>p]:mt-3 [&>p:first-child]:mt-0">
          {children}
        </div>
      )}
      <ul className="mt-3" aria-label="Guets posés par cette note">
        {guets.map((guet) => (
          <GuetLine key={guet.id} guet={guet} noteSlug={noteSlug} />
        ))}
      </ul>
      <EvidencePills items={evidence} />
      <BlockSources sources={sources} />
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
export function createNoteMdxComponents(
  veilleItems: VeilleItem[],
  sources: Note["sources"],
  guets: Guet[] = [],
  noteSlug = "",
) {
  const byBlock = groupEvidenceByBlock(veilleItems);
  const evidenceFor = (name: BlockName) => byBlock.get(name) ?? [];
  const sourcesFor = (name: BlockName) => sources[name] ?? [];
  const props = (name: BlockName) => ({ evidence: evidenceFor(name), sources: sourcesFor(name) });

  return {
    CeQuiAChange: (p: BlockProps) => <Block name="CeQuiAChange" {...props("CeQuiAChange")} {...p} />,
    CeQuiSestConfirme: (p: BlockProps) => (
      <Block name="CeQuiSestConfirme" {...props("CeQuiSestConfirme")} {...p} />
    ),
    RevisionDesScenarios: (p: BlockProps) => (
      <Block name="RevisionDesScenarios" {...props("RevisionDesScenarios")} {...p} />
    ),
    CeQueJavaisMalLu: (p: BlockProps) => (
      <Block name="CeQueJavaisMalLu" {...props("CeQueJavaisMalLu")} {...p} />
    ),
    CeQueJeSurveille: (p: BlockProps) => (
      <CeQueJeSurveilleBlock
        guets={guets}
        noteSlug={noteSlug}
        {...props("CeQueJeSurveille")}
        {...p}
      />
    ),
    RecapDesSpeciales: (p: BlockProps) => (
      <Block name="RecapDesSpeciales" {...props("RecapDesSpeciales")} {...p} />
    ),
    LeFilDeLaSemaine: () => <LeFilDeLaSemaineBlock items={veilleItems} />,
  };
}
