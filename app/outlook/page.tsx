import Link from "next/link";
import { getOutlooks } from "@/lib/content";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDateLong } from "@/lib/format";

export default function OutlookPage() {
  const outlooks = getOutlooks();

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Outlook</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Outlooks des banques</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Les dernières publications stratégiques des grandes banques privées, condensées et
        reliées aux drivers et tendances de fond suivis ici.
      </p>

      {outlooks.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun outlook renseigné"
            description="Les condensés sont rédigés hors de l'application, avec l'assistance d'un modèle, puis ajoutés à la main à mesure des publications réellement lues — jamais inventés au nom d'une banque."
          />
        </div>
      ) : (
        <ul aria-label="Outlooks" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {outlooks.map((outlook) => (
            <li key={outlook.id}>
              <Link
                href={`/outlook/${outlook.id}`}
                className="flex h-full flex-col gap-2.5 rounded-rc border border-trait bg-page px-4 py-3.5 hover:border-trait-f"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rc border border-trait bg-repos text-11 font-bold text-encre"
                  >
                    {outlook.bankMonogram}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-14-5 font-bold leading-tight text-encre">
                      {outlook.bank}
                    </span>
                    <span className="block text-10-5 text-tenu">{outlook.periodCovered}</span>
                  </span>
                </div>
                <p className="text-13 font-bold leading-snug text-doux">{outlook.title}</p>
                <p className="mt-auto text-10-5 text-tenu">
                  Publié le {formatDateLong(outlook.publishedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
