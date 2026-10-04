import Link from "next/link";
import { getThemes } from "@/lib/themes-content";
import { etatTheme, grouperThemes, type EstCollecte } from "@/lib/themes";
import { fournisseurInstrument } from "@/config/providers";
import { getInstrument } from "@/lib/data";
import { formatDateLong } from "@/lib/format";
import { SectionHeader } from "@/components/notes/SectionHeader";
import { EmptyState } from "@/components/states/EmptyState";
import type { ThemeObserve } from "@/lib/types";

const estCollecte: EstCollecte = (id) => fournisseurInstrument(id) !== null;

function libelleTemoin(id: string): string {
  return getInstrument(id)?.label ?? id;
}

function CarteTheme({ theme, aujourdhui }: { theme: ThemeObserve; aujourdhui: string }) {
  const etat = etatTheme(theme, estCollecte, aujourdhui);
  return (
    <li className="rounded-rc border border-trait bg-page px-4 py-3.5">
      <p className="text-14-5 font-semibold leading-[1.25] tracking-titre text-encre">{theme.libelle}</p>
      <p className="mt-1 text-12 text-tenu">
        {theme.emetteur} · {formatDateLong(theme.dateOrigine)}
      </p>
      <p className="mt-2 text-13 text-encre">{theme.these}</p>
      <dl className="mt-2 grid gap-1 text-12 text-tenu">
        <div>
          <dt className="inline font-semibold">Confirmé si </dt>
          <dd className="inline">{theme.confirmeSi}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Infirmé si </dt>
          <dd className="inline">{theme.infirmeSi}</dd>
        </div>
      </dl>
      {etat.statut === "observe-sans-temoin" && (
        <p className="mt-2 text-12 font-medium text-doux">
          En attente depuis {etat.attenteJours} jour{(etat.attenteJours ?? 0) > 1 ? "s" : ""} — débloqué
          par : {etat.temoinsManquants.map(libelleTemoin).join(", ")}
        </p>
      )}
      {etat.statut === "observe" && (
        <p className="mt-2 text-12 text-tenu">
          {etat.verdictATrancher
            ? "Échéance atteinte — verdict à trancher"
            : etat.aDater
              ? "Témoins collectés — début d'observation à dater"
              : `Verdict le ${formatDateLong(etat.echeance as string)}`}
        </p>
      )}
      {theme.verdictLe && (
        <p className="mt-2 text-12 text-tenu">
          {theme.statut} le {formatDateLong(theme.verdictLe)}
          {theme.verdictPar ? ` · ${theme.verdictPar}` : ""}
        </p>
      )}
    </li>
  );
}

function Groupe({
  titre,
  note,
  themes,
  aujourdhui,
}: {
  titre: string;
  note: string;
  themes: ThemeObserve[];
  aujourdhui: string;
}) {
  if (themes.length === 0) return null;
  return (
    <section className="mt-7">
      <SectionHeader title={titre} count={String(themes.length)} note={note} />
      <ul className="mt-3 flex flex-col gap-2.5">
        {themes.map((t) => (
          <CarteTheme key={t.id} theme={t} aujourdhui={aujourdhui} />
        ))}
      </ul>
    </section>
  );
}

/** Les thèmes sous observation. Les « en attente de données » sont la feuille de route de collecte. */
export default function ThemesPage() {
  const themes = getThemes();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const g = grouperThemes(themes, estCollecte, aujourdhui);

  return (
    <div className="mx-auto max-w-colonne px-4.5 py-7 md:max-w-content md:px-6">
      <Link
        href="/notes"
        className="mb-4 inline-block text-12 text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
      >
        ← Retour aux notes
      </Link>
      <p className="text-11 uppercase tracking-cap text-tenu">Notes</p>
      <h1 className="mt-1 text-27 font-semibold text-encre">Thèmes sous observation</h1>
      <p className="mt-2 max-w-[64ch] text-15 text-tenu">
        Des thèses avancées par d&rsquo;autres, mises à l&rsquo;épreuve des prix avant d&rsquo;être
        retenues. Ce qu&rsquo;on ne mesure pas, on ne peut pas le promouvoir — mais on peut dire
        ce qui manque.
      </p>

      {themes.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun thème sous observation"
            description="Un thème naît d'une proposition du modèle dans le portail /redaction, acceptée à la main : une thèse, un instrument témoin, un seuil chiffré et un délai."
          />
        </div>
      ) : (
        <>
          <Groupe
            titre="En attente de données"
            note="Triés du plus ancien au plus récent : plus un thème attend, plus l'instrument qui le débloque est prioritaire. L'échéance est suspendue."
            themes={g.enAttente}
            aujourdhui={aujourdhui}
          />
          <Groupe
            titre="Sous observation"
            note="Tous les témoins sont collectés ; l'échéance court."
            themes={g.observes}
            aujourdhui={aujourdhui}
          />
          <Groupe titre="Tranchés" note="Confirmés, infirmés ou expirés." themes={g.tranches} aujourdhui={aujourdhui} />
        </>
      )}
    </div>
  );
}
