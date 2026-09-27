import { formatDateLong, formatDateShort } from "@/lib/format";
import { freshnessTier } from "@/lib/freshness";
import { SEED_SOURCE } from "@/lib/provenance";
import { FreshnessDot } from "./FreshnessDot";
import { NonCollecteBadge } from "./NonCollecteBadge";

type DataValueProps = {
  value: string | null; // null = non suivi pour ce point (pas la même chose qu'une source en panne)
  date: string | null;
  fetchedAt: string | null;
  source: string;
  now?: Date;
  size?: "sm" | "md";
  /** Nommer la source aussi quand la valeur est fraîche — sur les fiches, pas dans les listes. */
  showSource?: boolean;
};

/**
 * Le composant central des cinq états au niveau d'un chiffre : jamais de valeur sans date,
 * jamais de zéro pour une valeur absente, et une source nommée quand la donnée est en panne.
 */
export function DataValue({
  value,
  date,
  fetchedAt,
  source,
  now,
  size = "md",
  showSource = false,
}: DataValueProps) {
  const valueClass = size === "sm" ? "text-14-5" : "text-15-5";

  if (value === null || date === null) {
    return (
      <span className="text-13 italic text-tenu">non suivi</span>
    );
  }

  // Avant la fraîcheur : une valeur du seed n'est pas une collecte en retard, c'est une
  // collecte qui n'existe pas. Un point rouge « dernière valeur connue » la ferait passer
  // pour une vraie donnée dont seule la copie aurait vieilli.
  if (source === SEED_SOURCE) {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className={`font-semibold tabular-nums text-encre ${valueClass}`}>
          {value}
        </span>
        <span className="inline-flex items-center gap-1.5 text-11 text-doux">
          <NonCollecteBadge />
          saisie à la main · au {formatDateShort(date)}
        </span>
      </span>
    );
  }

  const tier = freshnessTier(fetchedAt, now);

  // Le chiffre lui-même reste en --encre dans tous les cas : c'est une valeur réelle, pas une
  // valeur fausse — seule notre copie est en retard. Ne le peindre en rouge ou en ambre donne
  // l'impression que la donnée est erronée, alors que c'est la fraîcheur de la collecte qui
  // est en cause.
  //
  // Le sous-texte reste neutre lui aussi : la règle chromatique de DESIGN.md réserve le rouge
  // aux chiffres, et une légende est du contenu. Le signal est porté par le point coloré et
  // par le libellé écrit — jamais par la couleur seule.
  if (tier === "erreur" || tier === "absente") {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className={`font-semibold tabular-nums text-encre ${valueClass}`}>
          {value}
        </span>
        <span className="inline-flex items-center gap-1.5 text-11 text-doux">
          <FreshnessDot tier={tier} />
          dernière valeur connue du {formatDateShort(date)} · source : {source}
        </span>
      </span>
    );
  }

  if (tier === "perime") {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className={`font-semibold tabular-nums text-encre ${valueClass}`}>
          {value}
        </span>
        <span className="inline-flex items-center gap-1.5 text-11 text-doux">
          <FreshnessDot tier={tier} />
          périmé · relevé du {formatDateShort(date)}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className={`font-semibold tabular-nums text-encre ${valueClass}`}>
        {value}
      </span>
      <span className="text-11 text-tenu" title={formatDateLong(date)}>
        au {formatDateShort(date)}
        {showSource && ` · source : ${source}`}
      </span>
    </span>
  );
}
