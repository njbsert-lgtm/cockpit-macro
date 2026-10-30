"use client";

import { useId, useState } from "react";

const BOUTON = "min-h-11 rounded-rb px-3 text-13 font-medium";
const SECONDAIRE = `${BOUTON} border border-trait bg-page text-doux hover:border-trait-f hover:text-encre`;
const CHAMP = "w-full rounded-rb border border-trait bg-page px-3 text-13 text-encre";

/**
 * Les gestes d'une ligne du bloc « Les marchés par driver » (DESIGN.md, « Ligne de proposition »).
 *
 * `propose` — le modèle a écrit une cause : Refuser (secondaire), Corriger (ouvre la cause et
 * l'émetteur en place), Accepter (primaire), à 44px. Aucun n'est coché par défaut, et aucun geste
 * ne vaut pour plusieurs lignes : l'action serveur reçue est liée à cette seule ligne.
 *
 * `ajout` — le modèle n'a rien proposé : un seul geste secondaire, « Ajouter une cause », qui
 * ouvre le même formulaire, vide. L'émetteur se choisit parmi ceux que la fiche cite.
 */
export function GestesLigne({
  action,
  mode,
  cause,
  emetteur,
  sources,
  libelle,
}: {
  action: (formData: FormData) => Promise<void>;
  mode: "propose" | "ajout";
  cause: string;
  emetteur: string | null;
  /** Les émetteurs que la fiche cite : les seuls qu'une cause peut nommer. */
  sources: string[];
  libelle: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const emetteurs = emetteur && !sources.includes(emetteur) ? [emetteur, ...sources] : sources;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "propose" && (
          <form action={action}>
            <input type="hidden" name="action" value="refuser" />
            <button type="submit" className={SECONDAIRE} aria-label={`Refuser la cause — ${libelle}`}>
              Refuser
            </button>
          </form>
        )}
        <button
          type="button"
          className={SECONDAIRE}
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((o) => !o)}
        >
          {mode === "propose" ? "Corriger" : cause ? "Modifier ma cause" : "Ajouter une cause"}
        </button>
        {mode === "propose" && (
          <form action={action}>
            <input type="hidden" name="action" value="accepter" />
            <button
              type="submit"
              className={`${BOUTON} border border-encre bg-encre text-white hover:border-trait-f`}
              aria-label={`Accepter la cause — ${libelle}`}
            >
              Accepter
            </button>
          </form>
        )}
      </div>

      <form
        id={id}
        action={action}
        hidden={!ouvert}
        className="mt-2 flex flex-col gap-2 rounded-rc border border-trait bg-repos p-3"
      >
        <input type="hidden" name="action" value="corriger" />
        <label className="flex flex-col gap-1">
          <span className="text-10-5 uppercase tracking-cap text-tenu">Cause</span>
          <textarea
            name="cause"
            required
            rows={3}
            defaultValue={cause}
            className={`${CHAMP} min-h-[88px] py-2 leading-snug`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-10-5 uppercase tracking-cap text-tenu">Émetteur cité par la fiche</span>
          <select name="emetteur" required defaultValue={emetteur ?? ""} className={`${CHAMP} min-h-11`}>
            <option value="" disabled>
              {emetteurs.length === 0 ? "La fiche ne cite aucun émetteur" : "Choisir un émetteur"}
            </option>
            {emetteurs.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={emetteurs.length === 0}
          className={`${SECONDAIRE} self-start disabled:opacity-40`}
        >
          Enregistrer la {mode === "propose" ? "correction" : "cause"}
        </button>
      </form>
    </div>
  );
}
