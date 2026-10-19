"use client";

import { useEffect, useRef, useState } from "react";

export type Ancre = { id: string; emoji: string; libelle: string; sujets: number };

/**
 * La barre d'ancres de la page de lecture, collante sous la barre du haut : une puce par bloc,
 * qui suit la lecture d'elle-même. On défile librement ; la puce active change quand un bloc
 * atteint le haut de l'écran (même marge d'observation que les chips d'ancre de la charte), et la
 * barre glisse pour la garder visible — par `scrollLeft`, jamais `scrollIntoView`, qui ferait
 * aussi défiler la page. Toucher une puce reste un raccourci. Sous la barre, un filet de 2px au
 * canal de la note mesure la progression de lecture.
 */
export function BarreAncres({ ancres, filet }: { ancres: Ancre[]; filet: string }) {
  const [active, setActive] = useState(ancres[0]?.id ?? null);
  const [progression, setProgression] = useState(0);
  const barre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = ancres
      .map((a) => document.getElementById(a.id))
      .filter((s): s is HTMLElement => s !== null);
    const observateur = new IntersectionObserver(
      (entrees) => {
        const visible = entrees.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px" },
    );
    sections.forEach((s) => observateur.observe(s));

    const mesurer = () => {
      const article = sections[0]?.closest("article");
      if (!article) return;
      const r = article.getBoundingClientRect();
      const parcours = r.height - window.innerHeight;
      setProgression(parcours <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / parcours)));
    };
    mesurer();
    window.addEventListener("scroll", mesurer, { passive: true });
    return () => {
      observateur.disconnect();
      window.removeEventListener("scroll", mesurer);
    };
  }, [ancres]);

  useEffect(() => {
    const conteneur = barre.current;
    const puce = conteneur?.querySelector<HTMLElement>(`[data-ancre="${active}"]`);
    if (!conteneur || !puce) return;
    const gauche = puce.offsetLeft - 18;
    const droite = puce.offsetLeft + puce.offsetWidth + 18 - conteneur.clientWidth;
    if (gauche < conteneur.scrollLeft) conteneur.scrollLeft = gauche;
    else if (droite > conteneur.scrollLeft) conteneur.scrollLeft = droite;
  }, [active]);

  if (ancres.length === 0) return null;

  return (
    <nav
      aria-label="Blocs de la note"
      className="sticky top-[47px] z-20 -mx-4.5 border-b border-trait bg-page md:-mx-6"
    >
      <div ref={barre} className="flex gap-2 overflow-x-auto px-4.5 py-2.5 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
        {ancres.map((a) => {
          const estActive = a.id === active;
          return (
            <a
              key={a.id}
              href={`#${a.id}`}
              data-ancre={a.id}
              aria-current={estActive ? "location" : undefined}
              onClick={() => setActive(a.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-rp border px-[11px] py-1.5 text-13 transition-colors ${
                estActive ? "border-encre bg-encre text-page" : "border-trait bg-page text-encre hover:border-trait-f"
              }`}
            >
              <span aria-hidden="true">{a.emoji}</span>
              {a.libelle}
              {a.sujets > 0 && (
                <span className={`text-11 ${estActive ? "text-page/70" : "text-tenu"}`}>{a.sujets}</span>
              )}
            </a>
          );
        })}
      </div>
      <div className="h-0.5 w-full" aria-hidden="true">
        <div className={`h-full ${filet}`} style={{ width: `${progression * 100}%` }} />
      </div>
    </nav>
  );
}
