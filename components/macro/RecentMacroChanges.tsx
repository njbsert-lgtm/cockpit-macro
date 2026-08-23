import { getMacroIndicators } from "@/lib/data";
import { loadMacroObservations } from "@/lib/observations";
import { formatIndicatorValue, recentMacroChanges } from "@/lib/macro";
import { ZONE_LABELS } from "@/lib/zones";
import { formatDateShort } from "@/lib/format";

/**
 * Toutes zones confondues, indépendamment du sélecteur de zone de l'onglet — c'est un résumé
 * de ce qui a bougé cette semaine dans l'ensemble de la couverture macro.
 */
export async function RecentMacroChanges() {
  const indicators = getMacroIndicators();
  const bySeries = await loadMacroObservations(indicators.map((i) => i.id));
  const changes = recentMacroChanges(indicators, bySeries, new Date());

  return (
    <section
      aria-label="Données macro publiées cette semaine"
      className="rounded-rc border border-trait bg-page p-4"
    >
      <h2 className="text-11 uppercase tracking-cap text-tenu">Cette semaine</h2>

      {changes.length === 0 ? (
        <p className="mt-2 text-13 italic text-tenu">
          Aucun indicateur macro suivi n&rsquo;a été mis à jour depuis 7 jours.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5" aria-label="Indicateurs macro publiés cette semaine">
          {changes.map((c) => (
            <li key={c.indicator.id} className="text-13-5 text-encre">
              <span className="font-semibold">{ZONE_LABELS[c.indicator.zone]}</span>
              {" · "}
              {c.indicator.label}
              {" : "}
              <span className="font-semibold tabular-nums">
                {formatIndicatorValue(c.indicator, c.value)}
              </span>
              {c.variation !== null && (
                <span
                  className={`ml-1.5 tabular-nums ${
                    c.variation > 0 ? "text-hausse" : c.variation < 0 ? "text-baisse" : "text-tenu"
                  }`}
                >
                  ({c.variation > 0 ? "+" : ""}
                  {c.variation.toFixed(1).replace(".", ",")} pt vs {formatDateShort(c.previous!.date)})
                </span>
              )}
              <span className="ml-1.5 text-tenu">— relevé du {formatDateShort(c.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
