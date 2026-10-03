import { ANGLES_MORTS } from "@/config/angles-morts";
import type { AlerteAngles, VueAccueil } from "@/lib/angles-morts";
import { NonMesureBadge } from "@/components/states/NonMesureBadge";
import { SectionHeader } from "./SectionHeader";

/**
 * Les deux compteurs d'angles morts sur l'accueil (DESIGN.md) : la grille des indicateurs clés de
 * l'en-tête, deux cellules. Jamais fondus en un — « il manque une dimension à un driver » et « le
 * marché suit une force absente de la grille » ne se lisent pas de la même façon.
 *
 * Les décomptes ne sont ni une performance ni un contenu : pas de vert ni de rouge, la valeur
 * reste en encre. La couleur de canal ne sert qu'à la pastille de seuil, et le libellé la porte.
 */
function Cellule({
  libelle,
  total,
  seuil,
  alerte,
  premiere,
}: {
  libelle: string;
  total: number;
  seuil: string;
  alerte: AlerteAngles | null;
  premiere: boolean;
}) {
  return (
    <div className={`px-3.5 py-3 ${premiere ? "" : "border-l border-trait"}`}>
      <dt className="text-9-5 font-semibold uppercase tracking-cap text-tenu">{libelle}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className="text-13 font-semibold tabular-nums leading-tight text-encre">{total}</span>
        {alerte && (
          <span className="rounded-rp bg-k-choc/11 px-2 py-0.5 text-11 font-semibold text-k-choc">
            Seuil atteint
          </span>
        )}
      </dd>
      <p className="mt-1 text-11 text-tenu">
        {alerte ? `${alerte.n} sur ${alerte.libelle}` : `seuil : ${seuil}`}
      </p>
    </div>
  );
}

export function AnglesMortsAccueil({ vue }: { vue: VueAccueil }) {
  return (
    <div className="mt-7">
      <SectionHeader
        title="Angles morts"
        count={`${ANGLES_MORTS.fenetreJours} jours`}
        note="Événements de matérialité haute que la grille n'a pas su accueillir — il manque un axe à un driver, ou un driver à la grille."
      />

      {vue.etat === "illisible" && (
        <div className="mt-3 rounded-rb bg-repos px-3.5 py-3">
          <NonMesureBadge />
          <p className="mt-2 text-12 text-doux">
            La table des angles morts n&rsquo;est pas lisible — migration non appliquée ou base
            injoignable. Le compteur ne dit rien plutôt que zéro.
          </p>
        </div>
      )}

      {vue.etat === "vide" && (
        <p className="mt-3 rounded-rb bg-repos px-3.5 py-3 text-12 text-doux">
          Aucun angle mort sur les {ANGLES_MORTS.fenetreJours} derniers jours — tout ce qui a été
          jugé de matérialité haute s&rsquo;est rattaché à un axe.
        </p>
      )}

      {vue.etat === "normal" && (
        <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-rc border border-trait">
          <Cellule
            libelle="Avec driver, sans axe"
            total={vue.avecDriverSansAxe.total}
            seuil={`${ANGLES_MORTS.seuilAvecDriver} sur un même driver`}
            alerte={vue.avecDriverSansAxe.alerte}
            premiere
          />
          <Cellule
            libelle="Sans driver"
            total={vue.sansDriver.total}
            seuil={`${ANGLES_MORTS.seuilSansDriver} sur un même sujet`}
            alerte={vue.sansDriver.alerte}
            premiere={false}
          />
        </dl>
      )}
    </div>
  );
}
