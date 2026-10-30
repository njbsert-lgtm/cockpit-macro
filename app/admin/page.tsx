import { exigerAdminPage } from "@/lib/auth/session";
import { getFreshnessSummary } from "@/lib/freshness-summary";
import { compterBrouillons, compterItemsATrier, type Compte } from "@/lib/admin/files";
import { formatDateTime } from "@/lib/format";
import { FreshnessDot } from "@/components/states/FreshnessDot";
import { NonMesureBadge } from "@/components/states/NonMesureBadge";
import { NavLink } from "@/components/notes/NavLink";

/** Jamais en cache : l'accueil décrit l'instant où on l'ouvre. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Administration — Marguerite" };

function File({ titre, compte, href, lien }: { titre: string; compte: Compte; href: string; lien: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-rc border border-trait bg-repos p-4">
      <div>
        <h3 className="text-15 font-semibold text-encre">{titre}</h3>
        <p className="mt-1 text-13 text-doux">
          {compte === null ? <NonMesureBadge /> : `${compte} en attente`}
        </p>
      </div>
      <NavLink href={href}>{lien}</NavLink>
    </li>
  );
}

export default async function AdminPage() {
  // Le layout ne suffit pas : Next rend page et layout en parallèle.
  await exigerAdminPage();
  const [sources, aTrier] = await Promise.all([getFreshnessSummary(), compterItemsATrier()]);
  const brouillons = compterBrouillons();
  // Un relevé de santé illisible se reconnaît à ce que toutes les lignes portent la cause de la
  // lecture et aucune date : on n'affiche alors pas des sources « jamais collectées ».
  const santeIllisible = sources.length > 0 && sources.every((s) => s.fetchedAt === null && s.error);

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Exploitation</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Administration</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        La santé de la collecte et ce qui attend un jugement. Lecture seule.
      </p>

      <h2 className="mt-6 text-11 uppercase tracking-cap text-tenu">Santé des sources</h2>
      {santeIllisible ? (
        <div className="mt-2 rounded-rc border border-trait bg-repos p-4">
          <NonMesureBadge />
          <p className="mt-2 text-13 text-doux">{sources[0].error}</p>
        </div>
      ) : sources.length === 0 ? (
        <p className="mt-2 rounded-rc border border-trait bg-repos p-4 text-13 text-doux">
          Aucune source configurée : rien à surveiller.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {sources.map((s) => (
            <li key={s.source} className="rounded-rc border border-trait bg-repos p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-15 font-semibold text-encre">{s.source}</h3>
                <FreshnessDot tier={s.tier} withLabel />
              </div>
              <p className="mt-1 text-13 text-doux">
                {s.fetchedAt ? `Dernier relevé : ${formatDateTime(s.fetchedAt)}` : "Jamais collectée"}
              </p>
              {s.error && <p className="mt-1 text-13 text-doux">{s.error}</p>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-11 uppercase tracking-cap text-tenu">Files d&rsquo;attente</h2>
      <ul className="mt-2 flex flex-col gap-2">
        <File titre="Veille à trier" compte={aTrier} href="/admin/veille" lien="Veille" />
        <File titre="Brouillons à relire" compte={brouillons} href="/redaction" lien="Rédaction" />
      </ul>
    </div>
  );
}
