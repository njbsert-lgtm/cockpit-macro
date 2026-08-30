import { extractBlockText } from "@/lib/notes";
import { getDriver, getTrend } from "@/lib/content";
import { TREND_STATUS_LABEL } from "@/lib/trend-labels";
import { EmptyState } from "@/components/states/EmptyState";
import { chargerPortail } from "@/lib/redaction/portail";
import { etatPublication } from "@/lib/redaction/etat-publication";
import {
  authorshipBloc5,
  blocsAAuthorshipDirecte,
} from "@/lib/redaction/publication";
import { publierBrouillon, trancherRevision, trancherTendance } from "@/app/redaction/actions";
import { PortalCounter } from "@/components/redaction/PortalCounter";
import { FigureReport } from "@/components/redaction/FigureReport";
import { BlockPanel } from "@/components/redaction/BlockPanel";
import { GuetsPanel } from "@/components/redaction/GuetsPanel";
import { PropositionCard } from "@/components/redaction/PropositionCard";
import { PublishButton } from "@/components/redaction/PublishButton";
import { formatDateShort } from "@/lib/format";

export default async function RedactionSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const blocsForCounter = note.blocks.filter((b) => b !== "LeFilDeLaSemaine");
  const done = blocsForCounter.filter((b) => {
    if (b === "CeQueJeSurveille") return authorshipGuets !== "ia";
    const authorship = decisions.blocs[b]?.authorship;
    if (b === "CeQueJavaisMalLu") return Boolean(decisions.blocs[b]?.texte?.trim());
    return Boolean(authorship) && authorship !== "ia";
  }).length;

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-11 uppercase tracking-cap text-tenu">
            {note.meta.kind === "hebdo" ? "Hebdo" : "Spéciale"} · {note.meta.isoWeek} ·{" "}
            {formatDateShort(note.meta.date)}
          </p>
          <h1 className="mt-1 text-20 font-semibold leading-snug text-encre">
            {note.meta.regimeStatement}
          </h1>
        </div>
        <PortalCounter done={done} total={blocsForCounter.length} />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <FigureReport rapport={publication.rapportChiffres} />

        {blocsTexte.map((bloc) => {
          const decision = decisions.blocs[bloc];
          const texteInitial =
            decision?.texte ?? extractBlockText(note.body, bloc) ?? "";
          const authorship = decision?.authorship;
          const valide =
            bloc === "CeQueJavaisMalLu"
              ? Boolean(decision?.texte?.trim())
              : Boolean(authorship) && authorship !== "ia";
          return (
            <BlockPanel
              key={bloc}
              slug={slug}
              bloc={bloc}
              texte={texteInitial}
              authorship={
                bloc === "CeQueJavaisMalLu" ? (decision ? "humaine" : undefined) : authorship
              }
              valide={valide}
            />
          );
        })}

        {note.blocks.includes("CeQueJeSurveille") && authorshipGuets && (
          <GuetsPanel
            slug={slug}
            guets={note.meta.guets}
            decisions={decisions.guets}
            authorship={authorshipGuets}
            echeances={paquet.echeancesSemaine}
          />
        )}

        {(brouillonPropose.scenarioRevisions.length > 0 ||
          brouillonPropose.trendUpdates.length > 0) && (
          <div className="flex flex-col gap-3">
            <p className="text-9-5 font-semibold uppercase tracking-cap text-tenu">
              Propositions de révision
            </p>
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

        <PublishButton
          pret={publication.pret}
          manquantes={publication.manquantes}
          chiffresBloquants={publication.rapportChiffres.bloque}
          action={publication.pret ? publierBrouillon.bind(null, slug) : undefined}
        />
      </div>
    </div>
  );
}
