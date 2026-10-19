import Link from "next/link";
import { getOutlooks } from "@/lib/content";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDateLong } from "@/lib/format";
import { SectionHeader } from "@/components/notes/SectionHeader";
import { BankLogo } from "@/components/outlook/BankLogo";
import { Positionnements } from "@/components/outlook/Positionnements";
import { ThemePill } from "@/components/outlook/ThemePill";

/**
 * Les outlooks des banques (maquettes 2a et 3a) : la grille des positionnements comparés, puis
 * une carte par publication, de la plus récente à la plus ancienne. Aucune référence aux drivers
 * ni aux tendances de Marguerite : un outlook est prospectif, il se lit avec ses propres thèmes.
 */
export default function OutlookPage() {
  const outlooks = getOutlooks();
  const plusRecente = outlooks[0];

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Outlook</p>
      <h1 className="mt-1 text-27 font-semibold tracking-titre text-encre">Outlooks des banques</h1>
      {plusRecente && (
        <p className="mt-1.5 text-12-5 text-doux">
          {outlooks.length} publication{outlooks.length > 1 ? "s" : ""} · la plus récente le{" "}
          {formatDateLong(plusRecente.publishedAt)}
        </p>
      )}

      {outlooks.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun outlook renseigné"
            description="Les condensés sont rédigés hors de l'application, avec l'assistance d'un modèle, puis ajoutés à la main à mesure des publications réellement lues — jamais inventés au nom d'une banque."
          />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <Positionnements outlooks={outlooks} />
          </div>

          <div className="mt-7">
            <SectionHeader title="Publications" count={`${outlooks.length}`} />
            <ul aria-label="Outlooks" className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {outlooks.map((outlook) => (
                <li key={outlook.id}>
                  <Link
                    href={`/outlook/${outlook.id}`}
                    className="flex h-full flex-col gap-[9px] rounded-rc border border-trait bg-page px-3.5 py-[13px] transition-colors hover:border-trait-f"
                  >
                    <span className="flex items-center gap-2.5">
                      <BankLogo outlook={outlook} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-14-5 font-bold leading-tight text-encre">{outlook.bank}</span>
                        <span className="block text-10-5 text-tenu">
                          {outlook.periodCovered} · publié le {formatDateLong(outlook.publishedAt)}
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-17 text-tenu">
                        ›
                      </span>
                    </span>
                    <span className="text-13 font-semibold leading-snug text-doux">{outlook.title}</span>
                    {outlook.themes.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {outlook.themes.map((t) => (
                          <ThemePill key={t.id} theme={t} />
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
