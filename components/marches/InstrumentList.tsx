import Link from "next/link";
import { FreshnessDot } from "@/components/states/FreshnessDot";
import { formatDateLong, formatDateShort } from "@/lib/format";
import type { FreshnessTier } from "@/lib/freshness";

export type InstrumentRow = {
  id: string;
  label: string;
  href: string;
  /** Déjà formatée dans l'unité de l'instrument, ou `null` si l'instrument n'a aucun relevé. */
  value: string | null;
  date: string | null;
  tier: FreshnessTier;
  /** Variation de séance déjà formatée — en % ou en bps selon l'unité. */
  change: string | null;
  direction: "up" | "down" | "flat" | null;
  /** Ce que la pastille remplace quand la variation manque : pourquoi elle n'existe pas. */
  changeUnavailableReason: string | null;
  zoneTag: string | null;
};

const DATE_TONE: Record<FreshnessTier, string> = {
  frais: "text-tenu",
  perime: "text-k-choc",
  erreur: "text-doux",
  absente: "text-tenu",
};

/**
 * La pastille de variation, lue d'un coup d'œil : vert pâle en hausse, rouge pâle en baisse.
 * Le fond porte le signe autant que le texte, mais le signe reste écrit — la couleur seule ne
 * suffit jamais, elle est invisible pour une partie des lecteurs.
 */
function ChangePill({ change, direction }: { change: string; direction: "up" | "down" | "flat" }) {
  const tone =
    direction === "up"
      ? "bg-hausse/11 text-hausse"
      : direction === "down"
        ? "bg-baisse/11 text-baisse"
        : "bg-trait text-doux";

  return (
    <span
      className={`inline-block rounded-rp px-1.5 py-0.5 text-11 font-semibold tabular-nums ${tone}`}
    >
      {change}
    </span>
  );
}

export function InstrumentList({ rows }: { rows: InstrumentRow[] }) {
  return (
    <ul className="rounded-rc border border-trait bg-page" aria-label="Instruments de la classe sélectionnée">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-trait last:border-b-0">
          <Link
            href={row.href}
            className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-repos"
          >
            <span className="min-w-0">
              <span className="block text-14-5 font-bold text-encre">{row.label}</span>
              {row.zoneTag && (
                <span className="mt-0.5 block text-10-5 uppercase tracking-wide text-tenu">
                  {row.zoneTag}
                </span>
              )}
            </span>

            <span className="shrink-0 text-right">
              {row.value === null || row.date === null ? (
                /* Aucun relevé du tout : on le dit, on n'affiche pas un zéro. */
                <span className="text-13 italic text-tenu">non suivi</span>
              ) : (
                <>
                  <span className="block text-15 font-semibold tabular-nums text-encre">
                    {row.value}
                  </span>
                  <span className="mt-1 flex items-center justify-end gap-1.5">
                    {row.change !== null && row.direction !== null ? (
                      <>
                        <ChangePill change={row.change} direction={row.direction} />
                        <span
                          className={`inline-flex items-center gap-1.5 text-10-5 ${DATE_TONE[row.tier]}`}
                          title={formatDateLong(row.date)}
                        >
                          {row.tier !== "frais" && <FreshnessDot tier={row.tier} />}
                          au {formatDateShort(row.date)}
                        </span>
                      </>
                    ) : (
                      /* Pas de variation calculable : jamais un tiret. On affiche la dernière
                         valeur connue — déjà au-dessus — en la datant explicitement, et on dit
                         pourquoi la variation manque. */
                      <span
                        className={`inline-flex items-center gap-1.5 text-10-5 ${
                          row.tier === "frais" ? "text-k-choc" : DATE_TONE[row.tier]
                        }`}
                        title={row.changeUnavailableReason ?? undefined}
                      >
                        {/* Le point et le texte disent la même chose : une variation absente est
                            déjà un état dégradé, elle ne se peint jamais en gris neutre. */}
                        <FreshnessDot tier={row.tier === "frais" ? "perime" : row.tier} />
                        dernière valeur connue du {formatDateShort(row.date)}
                      </span>
                    )}
                  </span>
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
