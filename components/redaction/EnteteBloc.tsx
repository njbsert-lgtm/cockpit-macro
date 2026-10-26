"use client";

import type { Authorship } from "@/lib/types";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { usePortail } from "./PortailContexte";

/**
 * L'intitulé d'un bloc sur la page de lecture : l'emoji tiré dans la marge par-dessus le filet de
 * canal, puis le libellé à la couleur du canal. Le badge d'authorship disparaît en « aperçu
 * publié » : on relit alors comme le lecteur, sans rien de ce que l'atelier ajoute.
 */
export function EnteteBloc({
  titre,
  emoji,
  ton,
  authorship,
}: {
  titre: string;
  emoji: string;
  ton: string;
  authorship?: Authorship;
}) {
  const { apercu } = usePortail();
  return (
    <h2 className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="-ml-[39px] flex h-[38px] w-[30px] shrink-0 items-center justify-center bg-page text-14-5"
      >
        {emoji}
      </span>
      <span className={`text-15-5 font-semibold leading-[1.25] tracking-titre ${ton}`}>{titre}</span>
      {!apercu && authorship && (
        <span className="ml-auto">
          <AuthorshipBadge authorship={authorship} />
        </span>
      )}
    </h2>
  );
}
