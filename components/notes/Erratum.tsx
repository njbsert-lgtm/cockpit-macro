import { dateErratum, type Erratum as ErratumType } from "@/lib/erratum";

/**
 * Un erratum (`lib/erratum.ts`) : discret, petit corps, couleur secondaire, sans encadré ni
 * teinte de canal — c'est une mention de lecteur, pas un bloc éditorial. L'intitulé porte la
 * date, le texte suit.
 */
export function Erratum({ erratum }: { erratum: ErratumType | null | undefined }) {
  if (!erratum) return null;
  return (
    <aside aria-label="Erratum" className="mt-6 text-11 leading-snug text-tenu">
      <p>
        <span className="font-semibold">Erratum du {dateErratum(erratum.date)}.</span> {erratum.texte}
      </p>
    </aside>
  );
}
