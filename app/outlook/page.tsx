import Link from "next/link";
import { getOutlooks } from "@/lib/content";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDateLong } from "@/lib/format";

export default function OutlookPage() {
  const outlooks = getOutlooks();

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <p className="font-mono text-11 uppercase tracking-wider text-mute">Outlook</p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">Outlooks des banques</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-mute">
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
                className="flex h-full flex-col gap-2.5 border border-line bg-card px-4 py-3.5 hover:border-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-deep"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-paper font-mono text-11 font-bold text-ink"
                  >
                    {outlook.bankMonogram}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-14-5 font-bold leading-tight text-ink">
                      {outlook.bank}
                    </span>
                    <span className="block font-mono text-10-5 text-mute">{outlook.periodCovered}</span>
                  </span>
                </div>
                <p className="font-display text-13-5 font-bold leading-snug text-ink-2">{outlook.title}</p>
                <p className="mt-auto font-mono text-10-5 text-mute">
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
