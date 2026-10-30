"use client";

import { useState } from "react";
import type { ChiffreVivant } from "@/lib/chiffres-vivants";
import { ChiffreSheet } from "@/components/states/ChiffreSheet";

/**
 * Un chiffre cité dans le texte d'une note, touchable : fond du canal à 11 %, soulignement au
 * canal, poids 600. Le toucher ouvre la feuille de chiffre — la valeur de la note confrontée à
 * celle du jour, sans quitter la lecture.
 */
export function ChiffreCite({
  chiffre,
  classe,
  children,
}: {
  chiffre: ChiffreVivant;
  classe: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        className={`inline rounded-rb border-b-[1.5px] px-0.5 font-semibold text-encre ${classe}`}
      >
        {children}
      </button>
      <ChiffreSheet chiffre={ouvert ? chiffre : null} onClose={() => setOuvert(false)} />
    </>
  );
}
