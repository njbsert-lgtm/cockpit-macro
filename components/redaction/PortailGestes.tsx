"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Authorship } from "@/lib/types";
import {
  etatSegment,
  libelleSegment,
  premierAFaire,
  voisin,
  type Geste,
} from "@/lib/redaction/gestes";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { PortalCounter } from "./PortalCounter";
import { PortailContexte } from "./PortailContexte";
import { ValidationPill } from "./ValidationPill";

export type GesteVue = Geste & {
  type: "regime" | "texte" | "marches" | "guets";
  /** Nombre de sujets (sous-titres) du bloc, quand il en a. */
  sujets: number | null;
  authorship: Authorship | null;
  /** Rendu côté serveur : le geste lui-même. Toujours monté, pour que la saisie survive. */
  panel: ReactNode;
};

type Vue = "tableau" | "note" | "chiffres";

const FOND_SEGMENT = {
  fait: "bg-hausse",
  "en-cours": "bg-encre",
  "a-faire": "bg-trait",
} as const;

/**
 * La coque du portail à gestes (4a/4b/4c). **Aucune navigation n'y est conditionnée** : chaque
 * segment de la frise, chaque ligne de la liste et chaque puce ouvre son geste dans n'importe quel
 * ordre, « Suivant » mène au segment suivant même s'il reste du travail dans le courant. L'état
 * informe (fait, en cours, à faire, chiffres à trancher), il ne verrouille rien. Seule la
 * publication est conditionnée — et ailleurs.
 *
 * Tous les gestes restent montés, seuls les inactifs sont masqués : une saisie en cours survit à un
 * changement de segment, sans brouillon à confirmer.
 */
export function PortailGestes({
  surtitre,
  titreRegime,
  gestes,
  bloquant,
  filet,
  vueChiffres,
  pied,
}: {
  surtitre: string;
  /** La phrase de régime retenue, ou `null` tant qu'aucune ne l'est. */
  titreRegime: string | null;
  gestes: GesteVue[];
  bloquant: { restants: number; controles: number; valeurs: number } | null;
  /** Classe de bordure du canal dominant de la note — le filet de la mise en page de lecture. */
  filet: string;
  /** L'écran 4c, rendu côté serveur. */
  vueChiffres: ReactNode;
  /** Propositions, thèmes, publication : sous la liste, au motif actuel. */
  pied: ReactNode;
}) {
  const [vue, setVue] = useState<Vue>("tableau");
  const [apercu, setApercu] = useState(false);
  const [actif, setActif] = useState<string | null>(premierAFaire(gestes)?.id ?? gestes[0]?.id ?? null);
  const ancre = useRef<HTMLDivElement>(null);

  const faits = gestes.filter((g) => g.fait).length;
  const restants = gestes.length - faits;
  const premier = premierAFaire(gestes);
  const geste = gestes.find((g) => g.id === actif) ?? null;
  const rang = geste ? gestes.indexOf(geste) + 1 : 0;

  const ouvrir = useCallback(
    (id: string) => {
      setActif(id);
      requestAnimationFrame(() => {
        if (vue === "note") document.getElementById(id === "regime" ? "regime-titre" : id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        else ancre.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [vue],
  );

  const contexte = useMemo(() => ({ apercu, actif, ouvrir }), [apercu, actif, ouvrir]);

  // En lecture continue, la puce active suit le défilement — même marge d'observation que la barre
  // d'ancres de la page de lecture. Elle n'enferme rien : toucher une puce reste un raccourci.
  useEffect(() => {
    if (vue !== "note") return;
    const sections = ["regime-titre", ...gestes.filter((g) => g.type !== "regime").map((g) => g.id)]
      .map((id) => document.getElementById(id))
      .filter((s): s is HTMLElement => s !== null);
    // Les entrées ne rapportent que les changements : on garde l'ensemble des sections qui
    // traversent la bande, et la puce active est la première d'entre elles dans l'ordre du texte.
    const dedans = new Set<string>();
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) dedans.add(e.target.id);
          else dedans.delete(e.target.id);
        }
        const premier = sections.find((s) => dedans.has(s.id));
        if (premier) setActif(premier.id === "regime-titre" ? "regime" : premier.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => observateur.observe(s));
    return () => observateur.disconnect();
  }, [vue, gestes]);

  const aller = (v: Vue) => {
    setVue(v);
    window.scrollTo({ top: 0 });
  };

  if (vue === "chiffres") {
    return (
      <PortailContexte.Provider value={contexte}>
        <button
          type="button"
          onClick={() => aller("tableau")}
          className="inline-flex min-h-11 items-center text-13 text-doux hover:text-encre"
        >
          ← {surtitre.split(" · ")[1] ?? "Portail"}
        </button>
        <div>{vueChiffres}</div>
      </PortailContexte.Provider>
    );
  }

  const enNote = vue === "note";

  return (
    <PortailContexte.Provider value={contexte}>
      {enNote ? (
        <div className="sticky top-[47px] z-20 -mx-4.5 border-b border-trait bg-page md:-mx-6">
          <div className="flex items-center justify-between gap-3 px-4.5 pt-1 md:px-6">
            <button
              type="button"
              onClick={() => aller("tableau")}
              className="min-h-11 text-13 text-doux hover:text-encre"
            >
              ← {surtitre.split(" · ")[1]} · {rang}/{gestes.length}
            </button>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-12 text-doux">
              <input
                type="checkbox"
                role="switch"
                checked={apercu}
                onChange={(e) => setApercu(e.target.checked)}
                className="h-4 w-4 accent-encre"
              />
              Aperçu publié
            </label>
          </div>
          <div
            role="tablist"
            aria-label="Gestes à valider"
            className="flex gap-2 overflow-x-auto px-4.5 pb-2.5 pt-0.5 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {gestes.map((g) => (
              <Puce key={g.id} geste={g} actifId={actif} apercu={apercu} onOuvrir={() => ouvrir(g.id)} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-11 uppercase tracking-cap text-tenu">{surtitre}</p>
            <PortalCounter done={faits} total={gestes.length} />
          </div>
          <h1 className="mt-1 text-22 font-bold leading-snug text-encre">
            {restants === 0
              ? "Tous les gestes sont faits"
              : `${restants} geste${restants > 1 ? "s" : ""} avant publication`}
          </h1>

          <div role="tablist" aria-label="Gestes à valider" className="mt-4 flex gap-1.5">
            {gestes.map((g) => {
              const etat = etatSegment(g, actif);
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={g.id === actif}
                  aria-label={libelleSegment(g, actif)}
                  onClick={() => ouvrir(g.id)}
                  className="relative flex min-h-11 flex-1 flex-col items-center justify-end gap-1 pb-1"
                >
                  <span aria-hidden="true" className="text-14-5 leading-none">
                    {g.emoji ?? <span className="text-11 text-doux">Régime</span>}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-1 w-full rounded-rp ${FOND_SEGMENT[etat]} ${g.id === actif && etat === "fait" ? "ring-2 ring-encre ring-offset-1" : ""}`}
                  />
                  {g.chiffres > 0 && (
                    <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-2 w-2 rounded-rp bg-k-choc" />
                  )}
                </button>
              );
            })}
          </div>

          {bloquant && (
            <button
              type="button"
              onClick={() => aller("chiffres")}
              className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-rc border border-k-choc bg-page px-4 py-3 text-left"
            >
              <span>
                <span className="block text-9-5 font-semibold uppercase tracking-cap text-k-choc">
                  Bloque la publication
                </span>
                <span className="mt-0.5 block text-14-5 font-semibold text-encre">
                  {bloquant.restants} chiffre{bloquant.restants > 1 ? "s" : ""} à trancher
                </span>
                <span className="block text-12 text-tenu">
                  sur {bloquant.controles} contrôlés · {bloquant.valeurs} valeur
                  {bloquant.valeurs > 1 ? "s" : ""} distincte{bloquant.valeurs > 1 ? "s" : ""}
                </span>
              </span>
              <span aria-hidden="true" className="text-15 text-tenu">
                ›
              </span>
            </button>
          )}

          <div ref={ancre} className="mt-6 scroll-mt-16">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
                {geste && geste.id === premier?.id ? "À faire maintenant" : (geste?.titre ?? "")}
              </p>
              <span className="text-11 text-tenu">
                {rang} sur {gestes.length}
              </span>
            </div>
          </div>
        </>
      )}

      {enNote && (
        <div id="regime-titre" className="mt-5 scroll-mt-28">
          {titreRegime ? (
            <>
              <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Régime retenu</p>
              <h1 className="mt-1 text-22 font-bold leading-[1.2] tracking-note text-encre">{titreRegime}</h1>
            </>
          ) : (
            <div className="rounded-rc bg-repos px-4 py-3">
              <p className="text-13 text-doux">Aucune phrase de régime n&rsquo;est retenue.</p>
              <button
                type="button"
                onClick={() => {
                  aller("tableau");
                  setActif("regime");
                }}
                className="mt-2 min-h-11 rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white"
              >
                Choisir la phrase
              </button>
            </div>
          )}
        </div>
      )}

      <div className={enNote ? `ml-3 mt-7 border-l-3 pl-[18px] md:ml-0 ${filet}` : `mt-2 ${geste?.type !== "regime" ? `ml-3 border-l-3 pl-[18px] md:ml-0 ${filet}` : ""}`}>
        {gestes.map((g) => {
          // En lecture continue, la phrase de régime est le titre : son formulaire reste au tableau.
          const visible = enNote ? g.type !== "regime" : g.id === actif;
          return (
            <div key={g.id} hidden={!visible} className={enNote ? "mt-7 first:mt-0" : undefined}>
              {g.panel}
            </div>
          );
        })}
      </div>

      {!enNote && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!geste || !voisin(gestes, geste.id, -1)}
              onClick={() => geste && ouvrir(voisin(gestes, geste.id, -1)!.id)}
              className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f disabled:opacity-40"
            >
              ‹ Précédent
            </button>
            <button
              type="button"
              onClick={() => aller("note")}
              className="min-h-11 px-2 text-13 text-doux underline decoration-trait underline-offset-4 hover:text-encre"
            >
              Relire toute la note
            </button>
            <button
              type="button"
              disabled={!geste || !voisin(gestes, geste.id, 1)}
              onClick={() => geste && ouvrir(voisin(gestes, geste.id, 1)!.id)}
              className="min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f disabled:opacity-40"
            >
              Suivant ›
            </button>
          </div>

          <section aria-label="Ensuite" className="mt-6">
            <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Ensuite</p>
            <ul className="mt-2 flex flex-col divide-y divide-trait rounded-rc border border-trait bg-page">
              {gestes
                .filter((g) => g.id !== actif)
                .map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => ouvrir(g.id)}
                      aria-label={libelleSegment(g, actif)}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-3 text-left"
                    >
                      <ValidationPill ok={g.fait} />
                      {g.emoji && (
                        <span aria-hidden="true" className="text-14-5">
                          {g.emoji}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-14-5 font-semibold text-encre">{g.titre}</span>
                        {g.sujets !== null && g.sujets > 0 && (
                          <span className="block text-11 text-tenu">
                            {g.sujets} sujet{g.sujets > 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
                      {g.authorship && <AuthorshipBadge authorship={g.authorship} />}
                      {g.chiffres > 0 && (
                        <span className="rounded-rp bg-k-choc/11 px-1.5 py-0.5 text-11 font-semibold text-k-choc">
                          {g.chiffres}
                        </span>
                      )}
                      <span aria-hidden="true" className="text-15 text-tenu">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-col gap-3">{pied}</div>
        </>
      )}
      {enNote && <div className="mt-8 flex flex-col gap-3">{pied}</div>}
    </PortailContexte.Provider>
  );
}

/** Une puce de la barre collante de la lecture continue : emoji, libellé, pastille de validation. */
function Puce({
  geste,
  actifId,
  apercu,
  onOuvrir,
}: {
  geste: GesteVue;
  actifId: string | null;
  apercu: boolean;
  onOuvrir: () => void;
}) {
  const estActif = geste.id === actifId;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={estActif}
      aria-label={libelleSegment(geste, actifId)}
      onClick={onOuvrir}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-rp border px-[11px] py-1.5 text-13 transition-colors ${
        estActif ? "border-encre bg-encre text-page" : "border-trait bg-page text-encre hover:border-trait-f"
      }`}
    >
      {geste.emoji && <span aria-hidden="true">{geste.emoji}</span>}
      {geste.id === "regime" ? "Régime" : (COURT[geste.id] ?? geste.titre)}
      {!apercu && (
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-rp ${geste.fait ? "bg-hausse" : "border border-dashed border-k-choc"}`}
        />
      )}
    </button>
  );
}

const COURT: Record<string, string> = {
  CeQuiAChange: "Changé",
  CeQuiSestConfirme: "Confirmé",
  RevisionDesScenarios: "Scénarios",
  CeQueJavaisMalLu: "Mal lu",
  LesMarchesParDriver: "Marchés",
  CeQueJeSurveille: "Surveille",
  RecapDesSpeciales: "Récap",
};
