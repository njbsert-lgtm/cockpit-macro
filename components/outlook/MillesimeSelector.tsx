"use client";

import { useRouter } from "next/navigation";

/**
 * Sélecteur de millésime de `/outlook`. Même motif que les filtres du fil : étiquette, boutons
 * 44 px, `aria-pressed`, défilement horizontal sans barre, rayon `--rp`. L'état vit dans l'URL ;
 * le millésime par défaut (le plus récent) n'y est pas écrit.
 */
export function MillesimeSelector({ millesimes, actif }: { millesimes: number[]; actif: number }) {
  const router = useRouter();
  return (
    <div
      role="group"
      aria-label="Millésime"
      className="sans-barre -mx-4.5 mt-5 flex items-center gap-2 overflow-x-auto px-4.5 md:-mx-6 md:px-6"
    >
      <span className="shrink-0 text-9-5 font-semibold uppercase tracking-cap text-tenu">Millésime</span>
      {millesimes.map((m, i) => {
        const on = m === actif;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => router.push(i === 0 ? "/outlook" : `/outlook?millesime=${m}`, { scroll: false })}
            className={`min-h-11 shrink-0 rounded-rp border px-3 text-13 font-medium tabular-nums transition-colors ${
              on
                ? "border-encre bg-encre text-white"
                : "border-trait bg-page text-doux hover:border-trait-f hover:text-encre"
            }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
