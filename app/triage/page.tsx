import Link from "next/link";
import { getPendingVeilleItems } from "@/lib/veille/queries";
import { groupByDay, isCollapsedByDefault } from "@/lib/veille/grouping";
import { EmptyState } from "@/components/states/EmptyState";
import { TriageDayGroup } from "@/components/triage/TriageDayGroup";

export default async function TriagePage() {
  const items = await getPendingVeilleItems();
  const now = new Date();
  const groups = groupByDay(items);

  return (
    <div className="mx-auto max-w-colonne md:max-w-content px-4.5 py-7 md:px-6">
      <p className="text-11 uppercase tracking-cap text-tenu">Notes</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Triage</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Les items qui ont survécu à la passe 1 — un driver ou un canal de transmission reconnu —,
        groupés par jour, en attente d&rsquo;un jugement humain. Verser rattache un item à l&rsquo;un
        des cinq blocs analytiques de la note en préparation ; archiver ou ignorer le retire de la
        file. Purge automatique au-delà de quinze jours.
      </p>

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun item en attente"
            description="La collecte quotidienne alimente cette file après FRED, dans le même passage de cron. Rien à trier pour l'instant."
            action={
              <Link
                href="/"
                className="inline-block rounded-rc border border-trait bg-repos px-3 py-1.5 text-12-5 text-doux hover:border-trait-f hover:text-encre"
              >
                Revenir aux Notes
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {groups.map((group) => (
            <TriageDayGroup
              key={group.date}
              group={group}
              collapsedByDefault={isCollapsedByDefault(group.date, now)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
