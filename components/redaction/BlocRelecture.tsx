"use client";

import { useEffect, useRef, useState } from "react";
import type { Authorship } from "@/lib/types";
import type { PartieDeBloc, SegmentTexte } from "@/lib/redaction/relecture";
import type { Signalement } from "@/lib/redaction/style";
import { corrigerBloc, corrigerPhrase, garderChiffre } from "@/app/redaction/actions";
import { EnteteBloc } from "./EnteteBloc";
import { usePortail } from "./PortailContexte";

/** La mise en page de la note publiée (`mdx-blocks.tsx`) : même rythme, mêmes sous-titres. */
const TEXTE_BLOC = [
  "mt-2.5 text-14-5 leading-[1.6] text-encre",
  "[&_p]:mt-3 [&>p:first-child]:mt-0 [&_p]:text-justify [&_p]:hyphens-auto",
  "[&_h3]:mt-6 [&>h3:first-child]:mt-1 [&_h3]:text-15-5 [&_h3]:leading-[1.25] [&_h3]:font-bold [&_h3]:tracking-titre [&_h3]:text-encre",
  "[&_h3+p]:mt-1.5",
].join(" ");

/**
 * Relire un bloc **tel que la note le montrera** (maquette 4b) : filet de canal à gauche, emoji
 * tiré dans la marge, sous-titres en 700, gras d'attaque neutralisé comme à la lecture. Les chiffres
 * non conformes sont surlignés dans leur phrase ; les toucher ouvre le verdict sur place, avec les
 * deux gestes existants — garder tel quel, corriger la phrase —, un nombre à la fois.
 *
 * La barre basse porte le geste du bloc. « Valider le bloc » est grisé tant qu'un chiffre du bloc
 * n'est pas tranché, **et cela ne bloque que la validation** : on quitte le bloc et on y revient
 * librement. L'authorship se déduit toujours du geste (`corrigerBloc`), jamais d'une case.
 */
export function BlocRelecture({
  slug,
  bloc,
  titre,
  emoji,
  ton,
  texte,
  parties,
  restants,
  authorship,
  valide,
  signalements,
  humain = false,
}: {
  slug: string;
  bloc: string;
  titre: string;
  emoji: string;
  /** Classe de couleur du libellé : celle du canal dominant de la note. */
  ton: string;
  texte: string;
  parties: PartieDeBloc[];
  /** Chiffres non conformes pas encore tranchés dans ce bloc. */
  restants: number;
  authorship: Authorship | undefined;
  valide: boolean;
  signalements: Signalement[];
  /** Le bloc 4 : écrit de bout en bout, il s'ouvre en saisie, vide, sans texte à relire. */
  humain?: boolean;
}) {
  const { apercu } = usePortail();
  const [modif, setModif] = useState(humain);
  const [valeur, setValeur] = useState(texte);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [phrase, setPhrase] = useState<{ rang: number; texte: string } | null>(null);

  const total = parties.reduce(
    (n, p) => n + (p.type === "paragraphe" ? p.segments.filter((s) => s.verdict).length : 0),
    0,
  );
  const vide = humain && valeur.trim() === "";
  const raison =
    !modif && restants > 0
      ? `Tranchez ${restants === 1 ? "le chiffre restant" : `les ${restants} chiffres restants`} pour valider ce bloc.`
      : vide
        ? "Même vide, dites-le : « rien de notable cette semaine » est une réponse valide."
        : null;
  const bloque = modif ? vide : restants > 0;
  const placeholder = humain
    ? "Même vide, dites-le : « rien de notable cette semaine » est une réponse valide."
    : undefined;

  return (
    <section id={bloc} className="scroll-mt-28">
      <EnteteBloc titre={titre} emoji={emoji} ton={ton} authorship={authorship} />

      {!apercu && signalements.length > 0 && (
        <ul aria-label={`Signalements de style — ${titre}`} className="mt-2.5 flex flex-col gap-1">
          {signalements.map((sg) => (
            <li
              key={`${sg.code}-${sg.paragraphe}`}
              className="border-l-3 border-k-choc bg-k-choc/11 px-3 py-1.5 text-13 text-doux"
            >
              <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">Signalement</span>{" "}
              {sg.message}
            </li>
          ))}
        </ul>
      )}

      {/* Un formulaire vide, relié par `form=` : la bulle porte ses propres formulaires, et deux
          formulaires ne s'imbriquent pas. Le texte envoyé est toujours celui du champ : inchangé →
          ia-relue, retouché → ia-corrigee. */}
      <form id={`form-${bloc}`} action={corrigerBloc.bind(null, slug, bloc)} />
      <div>
        <textarea
          form={`form-${bloc}`}
          name="texte"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={placeholder}
          rows={humain ? 6 : 12}
          aria-label={`Texte du bloc « ${titre} »`}
          hidden={!modif}
          className="mt-2.5 min-h-24 w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
        />

        {!modif && (
          <div className={TEXTE_BLOC}>
            {parties.map((p, i) =>
              p.type === "titre" ? (
                <h3 key={i}>{p.texte}</h3>
              ) : (
                <div key={i}>
                  <p>
                    {p.segments.map((s, j) => (
                      <Segment
                        key={j}
                        segment={s}
                        apercu={apercu}
                        actif={s.rang !== undefined && s.rang === ouvert}
                        onToucher={() => {
                          setPhrase(null);
                          setOuvert((o) => (o === s.rang ? null : (s.rang ?? null)));
                        }}
                      />
                    ))}
                  </p>
                  {!apercu &&
                    p.segments.map((s) =>
                      s.verdict && s.rang === ouvert ? (
                        <Bulle
                          key={s.rang}
                          slug={slug}
                          segment={s}
                          total={total}
                          phrase={phrase?.rang === s.rang ? phrase.texte : null}
                          onCorriger={() => setPhrase({ rang: s.rang!, texte: s.verdict!.phrase })}
                          onPhrase={(t) => setPhrase({ rang: s.rang!, texte: t })}
                          onFermer={() => setOuvert(null)}
                        />
                      ) : null,
                    )}
                </div>
              ),
            )}
          </div>
        )}

        {/* Barre basse : le geste du bloc courant. Collante au-dessus de la barre d'onglets mobile. */}
        <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 -ml-3 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-rc border border-trait bg-page/95 px-3 py-2 backdrop-blur-[16px] md:bottom-3">
          <span className="basis-full text-12 text-doux">
            <span aria-hidden="true">{emoji} </span>
            <span className="font-semibold text-encre">{titre}</span>
            {!apercu && restants > 0 && (
              <span className="ml-1.5 font-semibold text-k-choc">
                · {restants} chiffre{restants > 1 ? "s" : ""} restant{restants > 1 ? "s" : ""}
              </span>
            )}
          </span>
          {!humain && (
            <button
              type="button"
              onClick={() => setModif((m) => !m)}
              aria-pressed={modif}
              className="min-h-11 flex-1 rounded-rb border border-trait bg-page px-3.5 text-13 font-medium text-encre hover:border-trait-f"
            >
              {modif ? "Revenir à la lecture" : "Modifier le texte"}
            </button>
          )}
          <button
            type="submit"
            form={`form-${bloc}`}
            disabled={bloque}
            className="min-h-11 flex-1 rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f disabled:cursor-not-allowed disabled:border-trait disabled:bg-repos disabled:text-tenu"
          >
            {modif && !humain ? "Enregistrer" : valide ? "Bloc validé · revalider" : "Valider le bloc"}
          </button>
          {raison && !apercu && <p className="basis-full text-12 text-k-choc">{raison}</p>}
        </div>
      </div>
    </section>
  );
}

function Segment({
  segment,
  apercu,
  actif,
  onToucher,
}: {
  segment: SegmentTexte;
  apercu: boolean;
  actif: boolean;
  onToucher: () => void;
}) {
  // Le gras d'attaque se compose comme à la lecture : poids normal (`[&_strong]:font-normal`).
  if (!segment.verdict || apercu) return <>{segment.texte}</>;
  return (
    <button
      type="button"
      onClick={onToucher}
      aria-expanded={actif}
      aria-label={`${segment.texte} — chiffre à trancher, ${segment.reproche}`}
      className={`rounded-rb bg-k-choc/25 px-0.5 font-semibold text-encre ${actif ? "ring-1 ring-k-choc" : ""}`}
    >
      {segment.texte}
    </button>
  );
}

/** La bulle ancrée sous le paragraphe : le verdict, le régime, le rang, et les deux gestes. */
function Bulle({
  slug,
  segment,
  total,
  phrase,
  onCorriger,
  onPhrase,
  onFermer,
}: {
  slug: string;
  segment: SegmentTexte;
  total: number;
  phrase: string | null;
  onCorriger: () => void;
  onPhrase: (t: string) => void;
  onFermer: () => void;
}) {
  const v = segment.verdict!;
  const cle = segment.cle!;
  const ancre = useRef<HTMLDivElement>(null);
  // La bulle s'ouvre sous le paragraphe, souvent derrière la barre basse : on la ramène à l'écran.
  useEffect(() => {
    ancre.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return (
    <div ref={ancre} role="dialog" aria-label={`Chiffre ${v.ecrit}`} className="mt-2 rounded-rc border border-k-choc bg-page px-3.5 py-3 text-left">
      <p className="flex items-baseline justify-between gap-3 text-9-5 font-semibold uppercase tracking-cap text-k-choc">
        <span>Chiffre · régime {v.regime}</span>
        <span className="font-normal normal-case tracking-normal text-tenu">
          {segment.rang} sur {total} dans ce bloc
        </span>
      </p>
      <p className="mt-1 text-13 leading-snug text-encre">
        <span className="font-semibold">{v.ecrit}</span> — {segment.reproche}
      </p>

      {phrase === null ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <form action={garderChiffre.bind(null, slug, cle)}>
            <input type="hidden" name="action" value="garder" />
            <button
              type="submit"
              className="min-h-11 rounded-rb border border-trait bg-page px-3.5 text-13 font-medium text-encre hover:border-trait-f"
            >
              Garder tel quel
            </button>
          </form>
          <button
            type="button"
            onClick={onCorriger}
            className="min-h-11 rounded-rb border border-encre bg-encre px-3.5 text-13 font-medium text-white hover:border-trait-f"
          >
            Corriger la phrase
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="min-h-11 rounded-rb px-3 text-13 text-tenu hover:text-encre"
          >
            Fermer
          </button>
        </div>
      ) : (
        <form action={corrigerPhrase.bind(null, slug, cle)} className="mt-2.5 flex flex-col gap-2">
          <textarea
            name="phrase"
            value={phrase}
            onChange={(e) => onPhrase(e.target.value)}
            rows={3}
            aria-label="Phrase corrigée"
            className="w-full rounded-rb border border-trait bg-page px-3 py-2 text-13 leading-relaxed text-encre"
          />
          <button
            type="submit"
            className="min-h-11 self-start rounded-rb border border-encre bg-encre px-4 text-13 font-medium text-white hover:border-trait-f"
          >
            Corriger la phrase
          </button>
        </form>
      )}
    </div>
  );
}
