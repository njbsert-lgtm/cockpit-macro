import Link from "next/link";
import { ASSET_CLASS_LABELS, formatInstrumentValue } from "@/lib/marches";
import { formatDateLong, formatJourMois } from "@/lib/format";
import type { GroupeYtd, LigneYtd, RaisonNonSuivi } from "@/lib/performance-ytd";

const RAISON: Record<RaisonNonSuivi, string> = {
  "aucune-source": "Aucune source ne collecte cet instrument.",
  "valeur-saisie": "Seule une valeur saisie à la main existe : aucun écart n'est calculé dessus.",
  "base-absente": "La clôture du 31 décembre n'est pas saisie.",
};

function Ligne({ ligne, href }: { ligne: LigneYtd; href: string }) {
  const { instrument } = ligne;
  return (
    <li className="border-b border-trait last:border-b-0">
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-repos"
      >
        <span className="min-w-0 text-14-5 font-bold text-encre">{instrument.label}</span>
        <span className="shrink-0 text-right">
          {ligne.statut === "suivi" ? (
            <>
              <span
                className={`block text-15 font-semibold tabular-nums ${
                  ligne.direction === "up"
                    ? "text-hausse"
                    : ligne.direction === "down"
                      ? "text-baisse"
                      : "text-tenu"
                }`}
              >
                {ligne.ecart}
              </span>
              {/* Les deux bornes, datées : la base du 31 décembre est saisie à la main, le
                  dernier relevé est collecté. */}
              <span
                className="mt-0.5 block text-10-5 text-tenu"
                title={`Base du ${formatDateLong(ligne.dateBase)} ; dernier relevé du ${formatDateLong(ligne.dateReleve)}`}
              >
                {formatInstrumentValue(instrument, ligne.valeurBase)} au{" "}
                {formatJourMois(ligne.dateBase)} →{" "}
                {formatInstrumentValue(instrument, ligne.valeurReleve)} au{" "}
                {formatJourMois(ligne.dateReleve)}
              </span>
            </>
          ) : (
            <>
              <span className="block text-13 italic text-tenu" title={RAISON[ligne.raison]}>
                non suivi
              </span>
              <span className="mt-0.5 block text-10-5 text-tenu">
                {ligne.derniereValeur
                  ? `${formatInstrumentValue(instrument, ligne.derniereValeur.value)} au ${formatJourMois(ligne.derniereValeur.date)} · base du 31/12 non saisie`
                  : ligne.raison === "valeur-saisie"
                    ? "valeur non collectée"
                    : "aucune source"}
              </span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * La vue YTD multi-actifs : les quatre classes à la suite, une ligne par instrument. Aucune
 * moyenne, aucun total par classe — la performance se lit instrument par instrument. Un
 * instrument sans écart calculable dit « non suivi » sur sa propre ligne, avec la dernière
 * valeur datée quand elle existe : jamais un tiret ni un zéro.
 */
export function YtdVue({
  groupes,
  hrefDe,
}: {
  groupes: GroupeYtd[];
  hrefDe: (ligne: LigneYtd) => string;
}) {
  return (
    <>
      {groupes.map((g) => {
        const nonSuivis = g.lignes.filter((l) => l.statut === "non-suivi").length;
        return (
          <section key={g.assetClass} className="mt-6" aria-label={ASSET_CLASS_LABELS[g.assetClass]}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-15-5 font-semibold text-encre">
                {ASSET_CLASS_LABELS[g.assetClass]}
              </h2>
              {nonSuivis > 0 && (
                <span className="text-11 text-tenu">
                  {nonSuivis} sur {g.lignes.length} non suivi{nonSuivis > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <ul
              className="mt-2 rounded-rc border border-trait bg-page"
              aria-label={`Écart depuis le 1er janvier — ${ASSET_CLASS_LABELS[g.assetClass]}`}
            >
              {g.lignes.map((l) => (
                <Ligne key={l.instrument.id} ligne={l} href={hrefDe(l)} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
