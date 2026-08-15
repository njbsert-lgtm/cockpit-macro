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
  frais: "text-mute",
  perime: "text-ochre",
  erreur: "text-rust",
  absente: "text-mute",
};

/**
 * La pastille de variation, lue d'un coup d'œil : vert pâle en hausse, rouge pâle en baisse.
 * Le fond porte le signe autant que le texte, mais le signe reste écrit — la couleur seule ne
 * suffit jamais, elle est invisible pour une partie des lecteurs.
 */
function ChangePill({ change, direction }: { change: string; direction: "up" | "down" | "flat" }) {
  const tone =
    direction === "up"
      ? "bg-teal-bg text-teal"
      : direction === "down"
        ? "bg-rust-bg text-rust"
        : "bg-line-2 text-ink-2";

  return (
    <span
      className={`inline-block rounded-xs px-1.5 py-0.5 font-mono text-11 font-semibold tabular-nums ${tone}`}
    >
      {change}
    </span>
  );
}

export function InstrumentList({ rows }: { rows: InstrumentRow[] }) {
  return (
    <ul className="border border-line bg-card" aria-label="Instruments de la classe sélectionnée">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-line-2 last:border-b-0">
          <Link
            href={row.href}
            className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-paper focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-deep"
          >
            <span className="min-w-0">
              <span className="block font-display text-14-5 font-bold text-ink">{row.label}</span>
              {row.zoneTag && (
                <span className="mt-0.5 block font-mono text-10-5 uppercase tracking-wide text-mute">
                  {row.zoneTag}
                </span>
              )}
            </span>

            <span className="shrink-0 text-right">
              {row.value === null || row.date === null ? (
                /* Aucun relevé du tout : on le dit, on n'affiche pas un zéro. */
                <span className="font-mono text-13 italic text-mute">non suivi</span>
              ) : (
                <>
                  <span className="block font-mono text-15 font-semibold tabular-nums text-ink">
                    {row.value}
                  </span>
                  <span className="mt-1 flex items-center justify-end gap-1.5">
                    {row.change !== null && row.direction !== null ? (
                      <>
                        <ChangePill change={row.change} direction={row.direction} />
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-10-5 ${DATE_TONE[row.tier]}`}
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
                        className={`inline-flex items-center gap-1.5 font-mono text-10-5 ${
                          row.tier === "frais" ? "text-ochre" : DATE_TONE[row.tier]
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
