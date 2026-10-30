import { SANS_LIEN, type GroupeMarcheVue, type LigneMarcheVue, type MouvementVue } from "./marches-vue";

/**
 * « Les marchés par driver » (DESIGN.md, « Tableau de marché d'un driver ») : une carte par
 * driver, une ligne par instrument. Même composant pour la note publiée et pour le portail — le
 * portail ajoute ses gestes autour, jamais à l'intérieur.
 *
 * Le chiffre est écrit par le code (`weeklyChange`) ; ce composant ne le calcule ni ne l'arrondit.
 * Aucune moyenne, aucun agrégat par classe : une ligne par instrument, rien d'autre.
 */

const COULEUR_SENS = { hausse: "text-hausse", baisse: "text-baisse", plat: "text-encre" } as const;

/** La variation : signe écrit, couleur sur le chiffre seulement, 15px poids 600 (contraste de `--hausse`). */
export function Variation({ mouvement }: { mouvement: MouvementVue }) {
  if (mouvement.etat === "indisponible") {
    return <span className="shrink-0 text-12 text-doux">{mouvement.message}</span>;
  }
  return (
    <span className={`shrink-0 text-15 font-semibold tabular-nums ${COULEUR_SENS[mouvement.sens]}`}>
      {mouvement.texte}
    </span>
  );
}

/** « du 23/10 au 30/10 » : les deux clôtures, car tout chiffre affiche sa date. */
export function DatesCloture({ mouvement }: { mouvement: MouvementVue }) {
  return mouvement.etat === "ok" ? (
    <>
      du {mouvement.du} au {mouvement.au}
    </>
  ) : null;
}

export function LigneMarche({ ligne }: { ligne: LigneMarcheVue }) {
  const { mouvement } = ligne;
  return (
    <li className="px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-14-5 font-semibold leading-snug text-encre">{ligne.libelle}</span>
        <Variation mouvement={mouvement} />
      </div>
      {ligne.cause !== null ? (
        <>
          {mouvement.etat === "ok" && (
            <div className="mt-0.5 text-11 text-tenu">
              <DatesCloture mouvement={mouvement} />
            </div>
          )}
          <div className="mt-1.5 text-12-5 leading-snug text-doux">
            {ligne.cause}
            {ligne.emetteur && <span className="whitespace-nowrap text-11 text-tenu"> — {ligne.emetteur}</span>}
          </div>
        </>
      ) : (
        <div className="mt-0.5 text-11 text-tenu">
          {mouvement.etat === "ok" && (
            <>
              <DatesCloture mouvement={mouvement} /> ·{" "}
            </>
          )}
          {SANS_LIEN}
        </div>
      )}
    </li>
  );
}

export function TableauMarches({ groupes }: { groupes: GroupeMarcheVue[] }) {
  return (
    <>
      {groupes.map((g) => (
        <section key={g.driverId} aria-label={`Marchés — ${g.titre}`} className="first:[&_h3]:mt-1">
          <h3>{g.titre}</h3>
          <ul className="mt-2 divide-y divide-trait rounded-rc border border-trait bg-page">
            {g.lignes.map((l) => (
              <LigneMarche key={l.cle} ligne={l} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
