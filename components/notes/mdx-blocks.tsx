import { BLOCK_TITLES, type BlockName } from "@/lib/notes";

/**
 * Chaque bloc analytique du MDX rend son propre titre de section : l'auteur écrit
 * `<CeQuiAChange>` et n'a jamais à répéter l'intitulé, donc il ne peut pas dériver d'une
 * note à l'autre.
 */
function Block({ name, children }: { name: BlockName; children?: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0">
      <h4 className="font-mono text-11 font-semibold uppercase tracking-wider text-mute">
        {BLOCK_TITLES[name]}
      </h4>
      <div className="mt-2 max-w-[70ch] text-15-5 leading-relaxed text-ink-2 [&>p]:mt-3 [&>p:first-child]:mt-0">
        {children}
      </div>
    </section>
  );
}

type BlockProps = { children?: React.ReactNode };

export const noteMdxComponents = {
  CeQuiAChange: (p: BlockProps) => <Block name="CeQuiAChange" {...p} />,
  CeQuiSestConfirme: (p: BlockProps) => <Block name="CeQuiSestConfirme" {...p} />,
  RevisionDesScenarios: (p: BlockProps) => <Block name="RevisionDesScenarios" {...p} />,
  CeQueJavaisMalLu: (p: BlockProps) => <Block name="CeQueJavaisMalLu" {...p} />,
  CeQueJeSurveille: (p: BlockProps) => <Block name="CeQueJeSurveille" {...p} />,
  RecapDesSpeciales: (p: BlockProps) => <Block name="RecapDesSpeciales" {...p} />,
};
