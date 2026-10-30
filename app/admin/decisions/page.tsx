import { exigerAdminPage } from "@/lib/auth/session";
import { lireDecisions, type Decision } from "@/lib/admin/decisions";
import { formatDateShort } from "@/lib/format";
import { EmptyState } from "@/components/states/EmptyState";
import { NonMesureBadge } from "@/components/states/NonMesureBadge";
import { abandonnerDecision, trancherDecision } from "./actions";

/** Jamais en cache : la file décrit l'instant où on l'ouvre. */
export const dynamic = "force-dynamic";

export const metadata = { title: "À trancher — Marguerite" };

const BOUTON =
  "min-h-11 rounded-rb border border-trait bg-page px-4 text-13 font-medium text-encre hover:border-trait-f";
const RESUME = `${BOUTON} inline-flex cursor-pointer items-center [&::-webkit-details-marker]:hidden`;
const CHAMP = "w-full rounded-rb border border-trait bg-page px-3 py-2.5 text-15 text-encre";
const PASTILLE = "rounded-rp border border-trait bg-page px-1.5 py-0.5 text-11 text-doux";

function Debloque({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <ul aria-label="Tâches débloquées" className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((t) => (
        <li key={t} className={PASTILLE}>
          {t}
        </li>
      ))}
    </ul>
  );
}

function Ouverte({ d }: { d: Decision }) {
  return (
    <li className="rounded-rc border border-trait bg-repos p-4">
      <p className="text-11 uppercase tracking-cap text-tenu">{d.id}</p>
      <h3 className="mt-1 text-15 font-semibold text-encre">{d.question}</h3>
      {d.recommandation && (
        <p className="mt-2 text-13 text-doux">
          <span className="font-semibold text-encre">Recommandation : </span>
          {d.recommandation}
        </p>
      )}
      <Debloque ids={d.bloque} />
      <div className="mt-3 flex flex-col gap-2">
        <details>
          <summary className={RESUME}>Trancher</summary>
          <form action={trancherDecision.bind(null, d.id)} className="mt-2 flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-11 uppercase tracking-cap text-tenu">Ma réponse</span>
              <textarea name="reponse" required rows={3} className={CHAMP} />
            </label>
            <button type="submit" className={`${BOUTON} self-start`}>
              Enregistrer la réponse
            </button>
          </form>
        </details>
        <details>
          <summary className={RESUME}>Abandonner</summary>
          <form action={abandonnerDecision.bind(null, d.id)} className="mt-2 flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-11 uppercase tracking-cap text-tenu">Motif (facultatif)</span>
              <textarea name="motif" rows={2} className={CHAMP} />
            </label>
            <button type="submit" className={`${BOUTON} self-start`}>
              Abandonner cette décision
            </button>
          </form>
        </details>
      </div>
    </li>
  );
}

function Close({ d }: { d: Decision }) {
  return (
    <li className="rounded-rc border border-trait bg-repos p-4">
      <p className="text-11 uppercase tracking-cap text-tenu">
        {d.id} · {d.statut === "tranchee" ? "Tranchée" : "Abandonnée"}
        {d.trancheeLe ? ` le ${formatDateShort(d.trancheeLe)}` : ""}
      </p>
      <h3 className="mt-1 text-14-5 font-semibold text-encre">{d.question}</h3>
      {d.reponse && <p className="mt-2 whitespace-pre-line text-13 text-doux">{d.reponse}</p>}
      <Debloque ids={d.bloque} />
    </li>
  );
}

export default async function DecisionsPage() {
  // Le layout ne suffit pas : Next rend page et layout en parallèle.
  await exigerAdminPage();
  const lecture = await lireDecisions();

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Exploitation</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">À trancher</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Les décisions qui attendent Nicolas, avec la recommandation et les tâches qu&rsquo;elles
        débloquent. Une décision se tranche à la fois ; il n&rsquo;y a pas de réponse en bloc.
      </p>

      {lecture.etat === "absente" && (
        <div className="mt-6">
          <EmptyState
            title="Table « decisions » absente"
            description="La migration n'est pas encore appliquée dans Supabase. Exécuter le bloc SQL « table decisions » d'ETAT.md dans le SQL Editor, puis recharger cette page."
          />
        </div>
      )}

      {lecture.etat === "illisible" && (
        <div className="mt-6 rounded-rc border border-trait bg-repos p-4">
          <NonMesureBadge />
          <p className="mt-2 text-13 text-doux">
            La file n&rsquo;a pas pu être lue ({lecture.cause}). Elle ne dit rien plutôt que zéro.
          </p>
        </div>
      )}

      {lecture.etat === "ok" && (
        <>
          <h2 className="mt-6 text-11 uppercase tracking-cap text-tenu">
            Ouvertes ({lecture.ouvertes.length})
          </h2>
          {lecture.ouvertes.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title={lecture.closes.length === 0 ? "Aucune décision enregistrée" : "Rien à trancher"}
                description={
                  lecture.closes.length === 0
                    ? "La table est vide. Ajouter les décisions ouvertes de ROADMAP.md (id, question, recommandation, tâches bloquées) dans la table decisions de Supabase."
                    : "Toutes les décisions enregistrées ont une réponse. L'historique est ci-dessous."
                }
              />
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {lecture.ouvertes.map((d) => (
                <Ouverte key={d.id} d={d} />
              ))}
            </ul>
          )}

          {lecture.closes.length > 0 && (
            <details className="mt-6">
              <summary className={RESUME}>Historique ({lecture.closes.length})</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {lecture.closes.map((d) => (
                  <Close key={d.id} d={d} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
