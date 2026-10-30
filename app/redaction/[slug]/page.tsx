import { exigerAdminPage } from "@/lib/auth/session";
import { extractBlockSource } from "@/lib/notes";
import { getDriver, getTrend } from "@/lib/content";
import { TREND_STATUS_LABEL } from "@/lib/trend-labels";
import { EmptyState } from "@/components/states/EmptyState";
import { chargerPortail } from "@/lib/redaction/portail";
import { etatPublication } from "@/lib/redaction/etat-publication";
import {
  attendUnRegime,
  authorshipBloc5,
  blocsAAuthorshipDirecte,
  resoudreRegime,
} from "@/lib/redaction/publication";
import { signalementsDuBloc } from "@/lib/redaction/style";
import {
  controlerChiffres,
  elementsDeDecision,
  grouperParValeur,
  PREFIXE_PROPOSITION_REGIME,
} from "@/lib/redaction/figures";
import { chiffresParGeste } from "@/lib/redaction/gestes";
import { decouperBloc } from "@/lib/redaction/relecture";
import { BLOCK_EMOJI, BLOCK_TITLES } from "@/lib/note-blocks";
import { sujetsDuBloc } from "@/lib/chiffres-cites";
import { CHANNEL_BORDER, CHANNEL_TEXT, dominantChannel } from "@/lib/channels";
import {
  publierBrouillon,
  retenirRegime,
  trancherRevision,
  trancherTendance,
  trancherTheme,
} from "@/app/redaction/actions";
import { FigureReport } from "@/components/redaction/FigureReport";
import { ChiffresATrancher } from "@/components/redaction/ChiffresATrancher";
import { BlocRelecture } from "@/components/redaction/BlocRelecture";
import { EnteteBloc } from "@/components/redaction/EnteteBloc";
import { PortailGestes, type GesteVue } from "@/components/redaction/PortailGestes";
import { BasculeDeuxVues } from "@/components/redaction/BasculeDeuxVues";
import { ChiffresParValeur } from "@/components/redaction/ChiffresParValeur";
import { GuetsPanel } from "@/components/redaction/GuetsPanel";
import { etatMarches, MarchesPanel } from "@/components/redaction/MarchesPanel";
import { authorshipBlocMarches, lignesDuBloc, ligneEffective } from "@/lib/redaction/marches-rendu";
import { RegimePanel } from "@/components/redaction/RegimePanel";
import { PropositionCard } from "@/components/redaction/PropositionCard";
import { PublishButton } from "@/components/redaction/PublishButton";
import { formatDateShort } from "@/lib/format";
import { idTheme } from "@/lib/themes";

export default async function RedactionSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Le layout ne suffit pas : Next rend page et layout en parallèle.
  await exigerAdminPage();
  const { slug } = await params;
  const etat = await chargerPortail(slug);

  if (!etat) {
    return (
      <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
        <EmptyState
          title="Rien à réviser"
          description="Ce brouillon n'existe pas, ou son état n'a pas été persisté au moment de la rédaction — impossible de présenter une page fiable pour lui."
        />
      </div>
    );
  }

  const { note, brouillonPropose, paquet, decisions } = etat;
  const publication = etatPublication(note, brouillonPropose, decisions, paquet);

  const blocsTexte = blocsAAuthorshipDirecte(note.blocks);
  const authorshipGuets = note.blocks.includes("CeQueJeSurveille")
    ? authorshipBloc5(note.meta.guets, decisions.guets)
    : null;

  // La phrase de régime est un geste à part entière : elle compte dans la validation, comme un
  // bloc. Le titre de la page montre celle qui a été retenue, jamais une proposition par défaut.
  const regimeAttendu = attendUnRegime(note);
  const regimeRetenu = resoudreRegime(decisions.regime, note.meta.regimeStatementPropositions);

  const verdicts = publication.rapportChiffres.verdicts;
  const fautifs = verdicts.filter((v) => v.verdict !== "conforme");
  const nonTranches = fautifs.filter((v) => !v.garde);

  // Les propositions de régime portent leurs propres verdicts, calculés à la rédaction : ils ne
  // bloquent rien, mais une proposition qui contient un chiffre non conforme le dit sur sa carte.
  const chiffresParAngle: Partial<Record<"fait" | "mecanisme" | "contradiction", number>> = {};
  for (const v of controlerChiffres(brouillonPropose, paquet).verdicts) {
    if (v.verdict === "conforme" || !v.bloc.startsWith(PREFIXE_PROPOSITION_REGIME)) continue;
    const angle = v.bloc.slice(PREFIXE_PROPOSITION_REGIME.length) as "fait" | "mecanisme" | "contradiction";
    chiffresParAngle[angle] = (chiffresParAngle[angle] ?? 0) + 1;
  }

  const avecMarches = note.blocks.includes("LesMarchesParDriver");
  const lignesMarches = brouillonPropose.marchesParDriver ?? [];

  const ids = [
    ...(regimeAttendu ? ["regime"] : []),
    ...blocsTexte,
    ...(avecMarches ? ["LesMarchesParDriver"] : []),
    ...(note.blocks.includes("CeQueJeSurveille") && authorshipGuets ? ["CeQueJeSurveille"] : []),
  ];
  const chiffres = chiffresParGeste(verdicts, ids);
  const canal = dominantChannel(note.meta.channels);
  const ton = canal ? CHANNEL_TEXT[canal] : "text-tenu";
  const filet = canal ? CHANNEL_BORDER[canal] : "border-trait";

  const gestes: GesteVue[] = [];

  if (regimeAttendu && note.meta.regimeStatementPropositions) {
    gestes.push({
      id: "regime",
      titre: "Phrase de régime",
      emoji: null,
      fait: Boolean(regimeRetenu),
      chiffres: chiffres.regime ?? 0,
      type: "regime",
      sujets: null,
      authorship: null,
      panel: (
        <RegimePanel
          ouvert
          propositions={note.meta.regimeStatementPropositions}
          decision={decisions.regime}
          action={retenirRegime.bind(null, slug)}
          chiffresParAngle={chiffresParAngle}
        />
      ),
    });
  }

  for (const bloc of blocsTexte) {
    const decision = decisions.blocs[bloc];
    const texteInitial = decision?.texte ?? extractBlockSource(note.body, bloc) ?? "";
    const authorship = bloc === "CeQueJavaisMalLu" ? (decision ? "humaine" : undefined) : decision?.authorship;
    const valide =
      bloc === "CeQueJavaisMalLu" ? Boolean(decision?.texte?.trim()) : Boolean(authorship) && authorship !== "ia";
    const aSurligner = nonTranches.filter((v) => v.bloc === bloc);
    gestes.push({
      id: bloc,
      titre: BLOCK_TITLES[bloc],
      emoji: BLOCK_EMOJI[bloc],
      fait: valide,
      chiffres: chiffres[bloc] ?? 0,
      type: "texte",
      sujets: sujetsDuBloc(note.body, bloc),
      authorship: authorship ?? "ia",
      panel: (
        <BlocRelecture
          slug={slug}
          bloc={bloc}
          titre={BLOCK_TITLES[bloc]}
          emoji={BLOCK_EMOJI[bloc]}
          ton={ton}
          texte={texteInitial}
          parties={decouperBloc(texteInitial, aSurligner).parties}
          restants={aSurligner.length}
          authorship={authorship ?? "ia"}
          valide={valide}
          signalements={signalementsDuBloc(bloc, texteInitial)}
          humain={bloc === "CeQueJavaisMalLu"}
        />
      ),
    });
  }

  if (avecMarches) {
    // Le bloc est écrit par le code ; seules les causes que le modèle a proposées se tranchent, une
    // à une. Une ligne dont la cause porte un chiffre à trancher le dit sur elle-même.
    const sansPoint = (t: string) => t.trim().replace(/[.;:\s]+$/, "");
    const chiffresParLigne = new Set<string>();
    for (const { cle, ligne } of lignesDuBloc(lignesMarches)) {
      const cause = ligneEffective(ligne, decisions.lignes[cle]).cause;
      if (cause && nonTranches.some((v) => v.bloc === "LesMarchesParDriver" && v.phrase.startsWith(sansPoint(cause)))) {
        chiffresParLigne.add(cle);
      }
    }
    const authorshipMarches = authorshipBlocMarches(lignesMarches, decisions.lignes);
    gestes.push({
      id: "LesMarchesParDriver",
      titre: BLOCK_TITLES.LesMarchesParDriver,
      emoji: BLOCK_EMOJI.LesMarchesParDriver,
      fait: etatMarches(lignesMarches, decisions.lignes).restantes === 0,
      chiffres: chiffres.LesMarchesParDriver ?? 0,
      type: "marches",
      sujets: lignesMarches.filter((m) => m.lignes.length > 0).length,
      authorship: authorshipMarches,
      panel: (
        <MarchesPanel
          slug={slug}
          marches={lignesMarches}
          contexte={paquet.marchesParDriver ?? []}
          decisions={decisions.lignes}
          sources={paquet.ficheNotion?.sources ?? []}
          chiffresParLigne={chiffresParLigne}
          ton={ton}
          authorship={authorshipMarches}
        />
      ),
    });
  }

  if (note.blocks.includes("CeQueJeSurveille") && authorshipGuets) {
    gestes.push({
      id: "CeQueJeSurveille",
      titre: BLOCK_TITLES.CeQueJeSurveille,
      emoji: BLOCK_EMOJI.CeQueJeSurveille,
      fait: authorshipGuets !== "ia",
      chiffres: 0,
      type: "guets",
      sujets: null,
      authorship: authorshipGuets,
      panel: (
        <section id="CeQueJeSurveille" className="scroll-mt-28">
          <EnteteBloc
            titre={BLOCK_TITLES.CeQueJeSurveille}
            emoji={BLOCK_EMOJI.CeQueJeSurveille}
            ton={ton}
            authorship={authorshipGuets}
          />
          <div className="mt-2.5">
            <GuetsPanel
              plat
              slug={slug}
              guets={note.meta.guets}
              decisions={decisions.guets}
              authorship={authorshipGuets}
              echeances={paquet.echeancesSemaine}
            />
          </div>
        </section>
      ),
    });
  }

  const groupes = grouperParValeur(verdicts).map((groupe) => ({
    groupe,
    elements: elementsDeDecision(groupe, verdicts, paquet.notePrecedente),
  }));
  const rapport = publication.rapportChiffres;
  const conformes = verdicts.length - fautifs.length;
  const regimeA = verdicts.filter((v) => v.regime === "A").length;
  const regimeB = verdicts.filter((v) => v.regime === "B").length;

  const vueChiffres = (
    <div className="mt-2">
      <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Contrôle des chiffres</p>
      <h1 className="mt-1 text-22 font-bold leading-snug text-encre">
        {nonTranches.length} chiffre{nonTranches.length > 1 ? "s" : ""} à trancher
      </h1>
      {verdicts.length > 0 && (
        <>
          <div
            role="img"
            aria-label={`${conformes} conformes, ${fautifs.length} non conformes, sur ${verdicts.length} contrôlés`}
            className="mt-3 flex h-2 w-full overflow-hidden rounded-rp bg-trait"
          >
            <span className="h-full bg-hausse" style={{ width: `${(conformes / verdicts.length) * 100}%` }} />
            <span className="h-full bg-k-choc" style={{ width: `${(fautifs.length / verdicts.length) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-12 text-doux">
            {conformes} conformes sur {verdicts.length} · régime A : {regimeA} · régime B : {regimeB}
          </p>
        </>
      )}
      <BasculeDeuxVues
        premier={{
          libelle: "Par valeur",
          compte: groupes.length,
          contenu: <ChiffresParValeur slug={slug} groupes={groupes} />,
        }}
        second={{
          libelle: "Par bloc",
          compte: fautifs.length,
          contenu: <ChiffresATrancher slug={slug} verdicts={verdicts} />,
        }}
      />
      <details className="mt-6">
        <summary className="min-h-11 cursor-pointer text-13 text-doux">Tous les chiffres contrôlés</summary>
        <div className="mt-2">
          <FigureReport rapport={rapport} />
        </div>
      </details>
    </div>
  );

  const pied = (
    <>
      {(brouillonPropose.scenarioRevisions.length > 0 || brouillonPropose.trendUpdates.length > 0) && (
        <div className="flex flex-col gap-3">
          <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">Propositions de révision</p>
          {brouillonPropose.scenarioRevisions.map((revision) => (
            <PropositionCard
              key={`revision-${revision.driverId}`}
              titre={`Driver « ${getDriver(revision.driverId)?.label ?? revision.driverId} »`}
              sousTitre={`${revision.branches.length} branches proposées`}
              decision={decisions.revisions[revision.driverId]}
              action={trancherRevision.bind(null, slug, revision.driverId)}
            >
              <ul className="flex flex-col gap-1.5">
                {revision.branches.map((b) => (
                  <li key={b.branchId}>
                    <span className="font-semibold text-encre">{b.branchId}</span>
                    {" — "}
                    {b.likelihood} — {b.why}
                  </li>
                ))}
              </ul>
            </PropositionCard>
          ))}
          {brouillonPropose.trendUpdates.map((update) => (
            <PropositionCard
              key={`tendance-${update.trendId}`}
              titre={getTrend(update.trendId)?.title ?? update.trendId}
              sousTitre={TREND_STATUS_LABEL[update.status]}
              decision={decisions.tendances[update.trendId]}
              action={trancherTendance.bind(null, slug, update.trendId)}
            >
              {update.why}
            </PropositionCard>
          ))}
        </div>
      )}

      {brouillonPropose.themesProposes.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
            Thèmes proposés à l&rsquo;observation
          </p>
          {brouillonPropose.themesProposes.map((theme) => {
            const id = idTheme(theme.libelle);
            const sansTemoin = theme.temoinsHorsCatalogue.length > 0;
            return (
              <PropositionCard
                key={`theme-${id}`}
                titre={theme.libelle}
                sousTitre={`${theme.emetteur} · ${theme.delaiJours} jours${sansTemoin ? " · témoin hors catalogue" : ""}`}
                decision={decisions.themes[id]}
                action={trancherTheme.bind(null, slug, id)}
              >
                <p>{theme.these}</p>
                <p className="mt-1.5">
                  <span className="font-semibold text-encre">Témoins : </span>
                  {[...theme.instrumentsTemoins, ...theme.temoinsHorsCatalogue].join(", ")}
                </p>
                <p className="mt-1.5">
                  <span className="font-semibold text-encre">Confirmé si </span>
                  {theme.confirmeSi}
                </p>
                <p className="mt-1.5">
                  <span className="font-semibold text-encre">Infirmé si </span>
                  {theme.infirmeSi}
                </p>
              </PropositionCard>
            );
          })}
        </div>
      )}

      <PublishButton
        pret={publication.pret}
        manquantes={publication.manquantes}
        chiffresBloquants={publication.rapportChiffres.bloque}
        verdictsBloquants={publication.rapportChiffres.bloquants}
        action={publication.pret ? publierBrouillon.bind(null, slug) : undefined}
      />
    </>
  );

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <PortailGestes
        surtitre={`${note.meta.kind === "hebdo" ? "Hebdo" : "Spéciale"} · ${note.meta.isoWeek} · ${formatDateShort(note.meta.date)}`}
        titreRegime={regimeRetenu?.texte ?? null}
        gestes={gestes}
        bloquant={
          rapport.bloque
            ? {
                restants: nonTranches.length,
                controles: verdicts.length,
                valeurs: groupes.filter((g) => g.groupe.restantes > 0).length,
              }
            : null
        }
        filet={filet}
        vueChiffres={vueChiffres}
        pied={pied}
      />
    </div>
  );
}
