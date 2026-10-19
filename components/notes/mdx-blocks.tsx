import { ChiffreCite } from "./ChiffreCite";
import type { ChiffreVivant } from "@/lib/chiffres-vivants";
import { BLOCK_TITLES, type BlockName } from "@/lib/notes";
import { BLOCK_EMOJI } from "@/lib/note-blocks";
import type { Guet, Note, VeilleItem } from "@/lib/types";
import { GuetLine } from "./GuetLine";
import { formatDateShort } from "@/lib/format";

type NoteSource = { label: string; url: string };
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
            className="inline-block max-w-[26ch] truncate rounded-rp border border-trait bg-repos px-2 py-0.5 align-bottom text-10-5 text-doux hover:border-trait-f hover:text-encre"
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
          // Plusieurs émetteurs se résolvent vers la même fiche : l'URL seule ne suffit pas.
          key={`${s.label}|${s.url}`}
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

/**
 * L'intitulé d'un bloc sur la page de lecture (DESIGN.md) : l'emoji du bloc sur fond `--page`,
 * tiré dans la marge gauche par-dessus le filet de canal — le fond blanc, plus haut que l'emoji,
 * interrompt le filet à cet endroit —, puis le libellé
 * en capitales 10px à la couleur du canal. L'emoji est décoratif pour un lecteur d'écran : le
 * libellé écrit porte l'information.
 */
function BlockHeading({ name, tone }: { name: BlockName; tone: string }) {
  return (
    <h2 className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="-ml-[39px] flex h-[38px] w-[30px] shrink-0 items-center justify-center bg-page text-14-5"
      >
        {BLOCK_EMOJI[name]}
      </span>
      <span className={`text-15-5 font-semibold leading-[1.25] tracking-titre ${tone}`}>
        {BLOCK_TITLES[name]}
      </span>
    </h2>
  );
}

/**
 * Le texte d'un bloc : 14.5px, interligne 1.6, `--encre` — une note se lit longuement. Chaque
 * sujet porte son sous-titre `###` (15.5px poids 600) ; les paragraphes sont justifiés, avec
 * césure automatique en français pour que la justification ne creuse pas de lézardes sur mobile.
 */
const TEXTE_BLOC = [
  "mt-2.5 text-14-5 leading-[1.6] text-encre [&_strong]:font-normal",
  "[&_p]:mt-3 [&>p:first-child]:mt-0 [&_p]:text-justify [&_p]:hyphens-auto",
  "[&_h3]:mt-6 [&>h3:first-child]:mt-1 [&_h3]:text-15-5 [&_h3]:leading-[1.25] [&_h3]:font-bold [&_h3]:tracking-titre [&_h3]:text-encre",
  "[&_h3+p]:mt-1.5",
].join(" ");

function Block({
  name,
  evidence,
  sources,
  tone,
  children,
}: {
  name: BlockName;
  evidence: VeilleItem[];
  sources: NoteSource[];
  tone: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={name} className="mt-7 first:mt-0">
      <BlockHeading name={name} tone={tone} />
      <div className={TEXTE_BLOC}>{children}</div>
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
  tone,
  children,
}: {
  guets: Guet[];
  noteSlug: string;
  evidence: VeilleItem[];
  sources: NoteSource[];
  tone: string;
  children?: React.ReactNode;
}) {
  if (guets.length === 0) {
    return (
      <Block name="CeQueJeSurveille" evidence={evidence} sources={sources} tone={tone}>
        {children}
      </Block>
    );
  }

  return (
    <section id="CeQueJeSurveille" className="mt-7 first:mt-0">
      <BlockHeading name="CeQueJeSurveille" tone={tone} />
      {children && <div className={TEXTE_BLOC}>{children}</div>}
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
 * Le fil de la semaine, sous deux formes qui ne se mélangent jamais.
 *
 * **Rédigé** — `<LeFilDeLaSemaine>…</LeFilDeLaSemaine>` avec du contenu : c'est la forme des
 * notes écrites depuis la fiche macro hebdomadaire, où la chronologie est un travail éditorial
 * (une date, un fait, l'émetteur) et non une liste d'items de veille. Le contenu écrit gagne.
 *
 * **Auto-portée** — `<LeFilDeLaSemaine />`, sans contenu : la liste est résolue au rendu depuis
 * `Note.veilleItemRefs`. C'est la forme des notes antérieures au basculement vers la fiche ;
 * elle reste servie telle quelle plutôt que de les réécrire.
 *
 * Sans contenu rédigé **et** sans item résolu, le bloc disparaît : pas de section vide.
 */
function LeFilDeLaSemaineBlock({
  items,
  tone,
  children,
}: {
  items: VeilleItem[];
  tone: string;
  children?: React.ReactNode;
}) {
  const redige = children !== undefined && children !== null && children !== "";
  if (!redige && items.length === 0) return null;
  const chronological = sortChronologically(items);

  return (
    <section id="LeFilDeLaSemaine" className="mt-7 first:mt-0">
      <BlockHeading name="LeFilDeLaSemaine" tone={tone} />
      {redige ? (
        <div className={TEXTE_BLOC}>{children}</div>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {chronological.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-13 leading-snug text-doux">
              <span className="shrink-0 text-10-5 text-tenu">
                {formatDateShort(item.publishedAt.slice(0, 10))}
              </span>
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
      )}
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
  /** La classe de texte du canal dominant ; `text-tenu` pour une note sans canal. */
  tone = "text-tenu",
  /** Les chiffres clés vivants, que `<ChiffreCite i="n">` désigne par leur rang. */
  chiffres: ChiffreVivant[] = [],
  /** Fond et soulignement d'un chiffre cité, au canal dominant. */
  classeCite = "bg-repos border-trait-f",
) {
  const byBlock = groupEvidenceByBlock(veilleItems);
  const evidenceFor = (name: BlockName) => byBlock.get(name) ?? [];
  const sourcesFor = (name: BlockName) => sources[name] ?? [];
  const props = (name: BlockName) => ({
    evidence: evidenceFor(name),
    sources: sourcesFor(name),
    tone,
  });

  return {
    // Attribut en chaîne : l'évaluation d'expressions JS est coupée dans le MDX compilé.
    ChiffreCite: ({ i, children }: { i: string; children?: React.ReactNode }) =>
      chiffres[Number(i)] ? (
        <ChiffreCite chiffre={chiffres[Number(i)]} classe={classeCite}>
          {children}
        </ChiffreCite>
      ) : (
        <>{children}</>
      ),
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
    LeFilDeLaSemaine: (p: BlockProps) => (
      <LeFilDeLaSemaineBlock items={veilleItems} tone={tone} {...p} />
    ),
  };
}
