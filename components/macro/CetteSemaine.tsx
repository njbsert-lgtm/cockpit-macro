import { publicationsAVenir } from "@/config/calendrier-publications";
import { getMacroIndicator } from "@/lib/data";
import { formatJourMois } from "@/lib/format";
import { SectionHeader } from "@/components/notes/SectionHeader";

const JOUR = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });

/**
 * « Cette semaine » (maquette 1d) : les publications des sept prochains jours pour les
 * indicateurs de la zone, tirées de `config/calendrier-publications.ts`. Rien de prévu : la
 * section ne se dessine pas.
 */
export function CetteSemaine({ indicatorIds }: { indicatorIds: string[] }) {
  const publications = publicationsAVenir(indicatorIds);
  if (publications.length === 0) return null;

  return (
    <section aria-label="Publications de la semaine">
      <SectionHeader title="Cette semaine" count={`${publications.length} à venir`} />
      <ul className="-mx-4.5 mt-3 flex gap-2 overflow-x-auto px-4.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {publications.map((p) => {
          const jour = JOUR.format(new Date(`${p.date}T00:00:00Z`));
          const premier = getMacroIndicator(p.indicateurs[0]);
          return (
            <li
              key={`${p.date}-${p.source}`}
              className="flex w-[132px] shrink-0 flex-col gap-1.5 rounded-rc border border-trait px-3 py-[11px]"
              title={p.source}
            >
              <span className="text-10-5 text-tenu">
                {jour.charAt(0).toUpperCase() + jour.slice(1)} {formatJourMois(p.date)}
              </span>
              <span className="text-13 font-semibold leading-snug text-encre">{p.evenement}</span>
              {premier && (
                <span className="mt-auto self-start rounded-rp bg-repos px-2 py-0.5 text-11 text-doux">
                  {premier.label}
                  {p.indicateurs.length > 1 && ` +${p.indicateurs.length - 1}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
