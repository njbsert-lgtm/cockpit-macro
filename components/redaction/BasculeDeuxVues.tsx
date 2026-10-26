"use client";

import { useState, type ReactNode } from "react";

/** Un segment à deux boutons (`aria-pressed`), 44px de haut : « Par valeur » | « Par bloc ». */
export function BasculeDeuxVues({
  premier,
  second,
}: {
  premier: { libelle: string; compte: number; contenu: ReactNode };
  second: { libelle: string; compte: number; contenu: ReactNode };
}) {
  const [vue, setVue] = useState<"premier" | "second">("premier");
  const bouton = (cle: "premier" | "second", v: typeof premier) => (
    <button
      type="button"
      aria-pressed={vue === cle}
      onClick={() => setVue(cle)}
      className={`min-h-11 flex-1 rounded-rb border px-3 text-13 transition-colors ${
        vue === cle ? "border-encre bg-encre text-page" : "border-trait bg-page text-encre hover:border-trait-f"
      }`}
    >
      {v.libelle} <span className={vue === cle ? "text-page/70" : "text-tenu"}>· {v.compte}</span>
    </button>
  );
  return (
    <>
      <div className="mt-4 flex gap-2">
        {bouton("premier", premier)}
        {bouton("second", second)}
      </div>
      <div className="mt-4">{vue === "premier" ? premier.contenu : second.contenu}</div>
    </>
  );
}
