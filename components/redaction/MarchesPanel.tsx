import type { ReactNode } from "react";
import type { WeeklyResult } from "@/lib/performance";
import type { Authorship } from "@/lib/types";
import { CHANNEL_LABELS, CHANNEL_TEXT } from "@/lib/channels";
import { BLOCK_EMOJI, BLOCK_TITLES } from "@/lib/note-blocks";
import { trancherLigneMarche } from "@/app/redaction/actions";
import { cleLigne, type LigneMarche, type MarcheContexte, type MarcheDriver } from "@/lib/redaction/marches";
import {
  authorshipLigne,
  formaterVariation,
  ligneEffective,
  type DecisionLigne,
  type DecisionsLignes,
} from "@/lib/redaction/marches-rendu";
import { SANS_LIEN, type MouvementVue } from "@/components/notes/marches-vue";
import { DatesCloture, Variation } from "@/components/notes/TableauMarches";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { EnteteBloc } from "./EnteteBloc";
import { GestesLigne } from "./GestesLigne";

const jourMois = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Le mouvement tel que `weeklyChange` l'a mesuré, formaté par le code (`formaterVariation`). */
export function mouvementVue(mesure: WeeklyResult): MouvementVue {
  if (mesure.status !== "ok") return { etat: "indisponible", message: mesure.message };
  const texte = formaterVariation(mesure);
  const sens = texte.startsWith("+") ? "hausse" : texte.startsWith("−") ? "baisse" : "plat";
  return { etat: "ok", texte, sens, du: jourMois(mesure.fromDate), au: jourMois(mesure.toDate) };
}

type Entree = {
  cle: string;
  driverId: string;
  libelle: string;
  mouvement: MouvementVue;
  proposee: LigneMarche;
  decision: DecisionLigne | undefined;
};

/** Où en est le bloc : combien de lignes **proposées par le modèle** restent à trancher. */
export function etatMarches(marches: MarcheDriver[], decisions: DecisionsLignes): { total: number; restantes: number } {
  const proposees = marches.flatMap((m) => m.lignes.filter((l) => l.cause !== null).map((l) => cleLigne(m.driverId, l.instrumentId)));
  return { total: proposees.length, restantes: proposees.filter((c) => !decisions[c]).length };
}

function Chevron() {
  return (
    <span aria-hidden="true" className="text-15 text-tenu transition-transform group-open:rotate-90">
      ›
    </span>
  );
}

/**
 * « Les marchés par driver » dans le portail (DESIGN.md, « Ligne de proposition »).
 *
 * Seules les lignes où le modèle **propose une cause** se tranchent, une à une — jamais en bloc.
 * Les autres (« non suivi », « donnée absente », « Sans lien clair ») ne portent aucun texte du
 * modèle : elles restent repliées, ne bloquent rien, et on peut y ajouter une cause de sa main.
 * Le mouvement, lui, est écrit par le code : il n'est jamais éditable ici.
 */
export function MarchesPanel({
  slug,
  marches,
  contexte,
  decisions,
  sources,
  chiffresParLigne,
  ton,
  authorship,
}: {
  slug: string;
  marches: MarcheDriver[];
  contexte: MarcheContexte[];
  decisions: DecisionsLignes;
  /** Les émetteurs que la fiche cite (`paquet.ficheNotion.sources`). */
  sources: string[];
  /** Les lignes dont la cause porte un chiffre non conforme, pas encore tranché. */
  chiffresParLigne: Set<string>;
  ton: string;
  authorship: Authorship;
}) {
  const parDriver = new Map(contexte.map((c) => [c.driverId, c]));
  const entrees: Entree[] = marches.flatMap((m) => {
    const driver = parDriver.get(m.driverId);
    if (!driver) return [];
    const instruments = new Map(driver.instruments.map((i) => [i.instrumentId, i]));
    return m.lignes.flatMap((l) => {
      const instrument = instruments.get(l.instrumentId);
      if (!instrument) return [];
      const cle = cleLigne(m.driverId, l.instrumentId);
      return [{ cle, driverId: m.driverId, libelle: instrument.label, mouvement: mouvementVue(instrument.mesure), proposee: l, decision: decisions[cle] }];
    });
  });

  // Une ligne sans cause du modèle, à laquelle l'humain a ajouté la sienne, rejoint les lignes à trancher.
  const ajoutee = (e: Entree) => e.proposee.cause === null && e.decision?.action === "corriger";
  const aTrancher = entrees.filter((e) => e.proposee.cause !== null || ajoutee(e));
  const sansCause = entrees.filter((e) => !aTrancher.includes(e));
  const { total, restantes } = etatMarches(marches, decisions);
  const premiereOuverte = aTrancher.find((e) => e.proposee.cause !== null && !e.decision)?.cle ?? null;

  const titreDriver = (id: string) => parDriver.get(id)?.label ?? id;
  const ordreDrivers = [...new Set(entrees.map((e) => e.driverId))];

  return (
    <section id="LesMarchesParDriver" className="scroll-mt-28">
      <EnteteBloc titre={BLOCK_TITLES.LesMarchesParDriver} emoji={BLOCK_EMOJI.LesMarchesParDriver} ton={ton} authorship={authorship} />
      <p className="mt-1 text-12 text-tenu">
        {total === 0
          ? "Le modèle n'a proposé aucune cause : rien à trancher."
          : restantes === 0
            ? `Les ${total} causes proposées sont tranchées.`
            : `${total - restantes} sur ${total} causes proposées tranchées.`}{" "}
        Le chiffre est écrit par le code.
      </p>

      {ordreDrivers.map((driverId) => {
        const lignes = aTrancher.filter((e) => e.driverId === driverId);
        if (lignes.length === 0) return null;
        return (
          <div key={driverId} className="mt-5 first:mt-3">
            <h3 className="text-15-5 font-bold leading-tight tracking-titre text-encre">{titreDriver(driverId)}</h3>
            <ul className="mt-2 divide-y divide-trait rounded-rc border border-trait bg-page">
              {lignes.map((e) => (
                <LigneAcause
                  key={e.cle}
                  slug={slug}
                  entree={e}
                  sources={sources}
                  ouverte={e.cle === premiereOuverte}
                  chiffre={chiffresParLigne.has(e.cle)}
                  ajoutee={ajoutee(e)}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {sansCause.length > 0 && (
        <details className="group mt-5 rounded-rc border border-trait bg-repos">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2 [&::-webkit-details-marker]:hidden">
            <span className="text-13-5 font-semibold text-encre">Sans cause proposée ({sansCause.length})</span>
            <Chevron />
          </summary>
          <div className="border-t border-trait px-3.5 py-3">
            <p className="text-12 leading-snug text-doux">
              Le modèle n&rsquo;a rien écrit pour ces instruments : ils ne bloquent pas la publication. Vous pouvez y
              ajouter une cause de votre main.
            </p>
            <ul className="mt-2 divide-y divide-trait">
              {sansCause.map((e) => (
                <li key={e.cle} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-14-5 font-semibold leading-snug text-encre">
                      {e.libelle}
                      <span className="ml-1.5 text-11 font-normal text-tenu">{titreDriver(e.driverId)}</span>
                    </span>
                    <Variation mouvement={e.mouvement} />
                  </div>
                  <div className="mt-0.5 text-11 text-tenu">
                    {e.mouvement.etat === "ok" && (
                      <>
                        <DatesCloture mouvement={e.mouvement} /> ·{" "}
                      </>
                    )}
                    {SANS_LIEN}
                  </div>
                  {e.mouvement.etat === "ok" && (
                    <GestesLigne
                      mode="ajout"
                      libelle={e.libelle}
                      action={trancherLigneMarche.bind(null, slug, e.cle)}
                      cause=""
                      emetteur={null}
                      sources={sources}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </section>
  );
}

function LigneAcause({
  slug,
  entree,
  sources,
  ouverte,
  chiffre,
  ajoutee,
}: {
  slug: string;
  entree: Entree;
  sources: string[];
  ouverte: boolean;
  chiffre: boolean;
  ajoutee: boolean;
}) {
  const { cle, libelle, mouvement, proposee, decision } = entree;
  const effective = ligneEffective(proposee, decision);
  const badge: Authorship = ajoutee ? "humaine" : authorshipLigne(decision);
  // Ce qui sera publié si on s'arrêtait là : la cause acceptée ou corrigée, ou l'aveu après refus.
  const cause: ReactNode = effective.cause ?? SANS_LIEN;
  const aEcarte = decision?.action === "refuser";

  return (
    <li>
      <details open={ouverte} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-14-5 font-semibold leading-snug text-encre">{libelle}</span>
            <span className="mt-0.5 block text-11 text-tenu">
              <DatesCloture mouvement={mouvement} />
            </span>
            <span
              className={`mt-1 line-clamp-2 text-12-5 leading-snug group-open:hidden ${effective.cause ? "text-doux" : "text-tenu"}`}
            >
              {cause}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Variation mouvement={mouvement} />
            <span className="flex items-center gap-1.5">
              <AuthorshipBadge authorship={badge} />
              <Chevron />
            </span>
          </span>
        </summary>
        <div className="px-3.5 pb-3">
          <div className={`text-12-5 leading-snug ${effective.cause ? "text-doux" : "text-tenu"}`}>{cause}</div>
          {effective.emetteur && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-11 text-tenu">
              <span>Émetteur : {effective.emetteur}</span>
              {effective.canal && (
                <span
                  className={`rounded-rp border border-current px-2 py-px text-9-5 font-semibold uppercase tracking-cap ${CHANNEL_TEXT[effective.canal]}`}
                >
                  {CHANNEL_LABELS[effective.canal]}
                </span>
              )}
            </p>
          )}
          {aEcarte && proposee.cause && (
            <p className="mt-1 text-11 text-tenu">Cause proposée, écartée : {proposee.cause}</p>
          )}
          {chiffre && (
            <p className="mt-2 border-l-3 border-k-choc bg-k-choc/11 px-3 py-2 text-12-5 text-doux">
              <span className="text-10-5 font-semibold uppercase tracking-cap text-k-choc">Chiffre à trancher</span>{" "}
              — un nombre de cette cause n&rsquo;est pas conforme : corrigez la cause, ou refusez-la.
            </p>
          )}
          <GestesLigne
            mode={ajoutee ? "ajout" : "propose"}
            libelle={libelle}
            action={trancherLigneMarche.bind(null, slug, cle)}
            cause={effective.cause ?? proposee.cause ?? ""}
            emetteur={effective.emetteur ?? proposee.emetteur}
            sources={sources}
          />
        </div>
      </details>
    </li>
  );
}
