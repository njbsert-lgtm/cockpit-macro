import type { Axe } from "@/lib/types";

/**
 * Les axes des drivers — par quels chemins chaque incertitude peut atteindre les prix.
 *
 * **Posés à l'aveugle, le 03/10/2026, avant tout classement d'item de veille.** Ils ont été
 * dérivés de la question de chaque driver, de ses trois branches, de ses instruments et de ses
 * indicateurs macro — sans lire les items classés par la passe 2 ni le corps des notes. L'unique
 * reprise d'une observation est « Contournement », créé à la rédaction de S38 : il vient d'une
 * analyse, pas d'un ajustement sur les données.
 *
 * La raison est celle du compteur d'angles morts : construire les axes depuis les événements
 * observés garantirait mécaniquement zéro angle mort, et l'instrument serait ajusté sur ses
 * propres données. L'écart entre ces axes et ce qui remonte réellement est la mesure.
 *
 * **Ne s'édite pas pour absorber un événement qui n'entre dans aucun axe.** C'est précisément le
 * cas que le compteur doit compter. Un axe s'ajoute après une décision explicite dans `/redaction`
 * (bloc 3), jamais pour faire disparaître un angle mort du décompte.
 *
 * `lisibilite` dit si un instrument collecté peut révéler l'activation de l'axe : `directe`,
 * `indirecte` (un instrument réagit, sans distinguer cet axe d'un autre) ou `aucune`.
 */
export const AXES: Axe[] = [
  // --- Taux directeurs ------------------------------------------------------------------------
  {
    id: "inflation-sous-jacente",
    driverId: "rates",
    libelle: "Inflation sous-jacente",
    mecanisme:
      "Une surprise sur les prix hors énergie relève l'anticipation de hausse : la partie courte de la courbe monte, et le dollar avec elle.",
    instruments: ["us6m", "us1y", "dxy"],
    macros: ["us-cpi-core"],
    lisibilite: "directe",
    limite: "",
  },
  {
    id: "marche-du-travail",
    driverId: "rates",
    libelle: "Marché du travail",
    mecanisme:
      "Un chômage bas et des salaires dynamiques entretiennent la boucle prix-salaires, donc le biais restrictif de la Fed.",
    instruments: ["us1y", "us3y"],
    macros: ["us-unemployment", "us-wages"],
    lisibilite: "directe",
    limite: "",
  },
  {
    id: "fonction-de-reaction",
    driverId: "rates",
    libelle: "Fonction de réaction",
    mecanisme:
      "Communication du FOMC, projections, composition et indépendance du comité : le marché révise la trajectoire sans donnée nouvelle.",
    instruments: ["us6m", "us1y"],
    macros: [],
    lisibilite: "indirecte",
    limite:
      "Les contrats à terme sur Fed funds, qui la liraient directement, ne sont pas collectés ; la partie courte réagit aussi à l'inflation et au travail.",
  },
  {
    id: "prime-de-terme",
    driverId: "rates",
    libelle: "Prime de terme et offre de dette",
    mecanisme:
      "Le déficit et le volume d'émissions font monter les taux longs sans la Fed ; les conditions financières se durcissent et le calcul du comité change.",
    instruments: ["us10y", "us20y"],
    macros: ["us-budget-balance", "us-debt-gdp"],
    lisibilite: "directe",
    limite: "",
  },
  {
    id: "divergence-transatlantique",
    driverId: "rates",
    libelle: "Divergence transatlantique",
    mecanisme:
      "Une Fed qui monte seule creuse l'écart avec la BCE : le dollar se renforce et les capitaux se déplacent vers les États-Unis.",
    instruments: ["eurusd", "dxy", "spread-us10y-bund10y"],
    macros: ["ez-policy-rate"],
    lisibilite: "directe",
    limite: "",
  },

  // --- Conflit iranien ------------------------------------------------------------------------
  {
    id: "transit-ormuz",
    driverId: "iran",
    libelle: "Transit d'Ormuz",
    mecanisme:
      "Les volumes physiques de brut et de GNL qui franchissent le détroit fixent l'offre retirée du marché.",
    instruments: ["brent", "wti"],
    macros: [],
    lisibilite: "directe",
    limite:
      "Directe sur le prix, mais les flux de pétroliers, le fret et l'assurance ne sont pas collectés : la cause n'est pas observable.",
  },
  {
    // Repris de la note S38 : créé à la rédaction, depuis une analyse.
    id: "contournement",
    driverId: "iran",
    libelle: "Contournement",
    mecanisme:
      "La capacité réelle des routes de dérivation (oléoducs du Golfe, mer Rouge) détermine quelle part d'une fermeture atteint les prix.",
    instruments: ["brent"],
    macros: [],
    lisibilite: "aucune",
    limite:
      "Un contournement qui cède et un transit qui se ferme font bouger le Brent de la même façon : rien de collecté ne les distingue.",
  },
  {
    id: "voie-diplomatique",
    driverId: "iran",
    libelle: "Voie diplomatique",
    mecanisme:
      "Cessez-le-feu, sanctions, accord : l'anticipation d'une réouverture comprime la prime de risque avant tout changement physique.",
    instruments: ["brent", "gold"],
    macros: [],
    lisibilite: "indirecte",
    limite: "Le reflux de la prime se voit, pas sa cause.",
  },
  {
    id: "offre-hors-golfe",
    driverId: "iran",
    libelle: "Offre de compensation hors Golfe",
    mecanisme:
      "Réserve de l'OPEP+, schiste américain, stocks stratégiques : ce qui peut remplacer les barils manquants borne la hausse du prix.",
    instruments: ["wti", "brent"],
    macros: [],
    lisibilite: "indirecte",
    limite: "Les stocks et la production de l'EIA ne sont pas collectés.",
  },
  {
    id: "transmission-importateurs",
    driverId: "iran",
    libelle: "Transmission aux importateurs",
    mecanisme:
      "Un choc pétrolier dégrade les termes de l'échange du Japon, de l'Inde et de l'Europe : leurs devises et leurs actions réagissent, indépendamment du prix du brut.",
    instruments: ["usdjpy", "nky", "nifty50", "eurusd"],
    macros: [],
    lisibilite: "directe",
    limite: "Mêlée à tout autre déterminant de ces actifs.",
  },

  // --- Cycle IA -------------------------------------------------------------------------------
  {
    id: "monetisation",
    driverId: "ai",
    libelle: "Monétisation",
    mecanisme:
      "Revenus et marges réellement tirés de l'IA, y compris l'efficience des modèles qui baisse le coût du calcul : ils décident si les profits rattrapent l'investissement.",
    instruments: ["ndx", "spx"],
    macros: [],
    lisibilite: "indirecte",
    limite: "Ce sont les indices entiers : aucun résultat d'émetteur n'est collecté.",
  },
  {
    id: "intensite-capex",
    driverId: "ai",
    libelle: "Intensité du capex",
    mecanisme:
      "Les guidances d'investissement des hyperscalers et les commandes de puces donnent la trajectoire de la dépense ; le marché récompense ou sanctionne cette trajectoire.",
    instruments: ["ndx"],
    macros: [],
    lisibilite: "aucune",
    limite:
      "Aucun indice de semi-conducteurs ni titre d'hyperscaler n'est collecté ; `ndx` mélange tout le reste.",
  },
  {
    id: "contrainte-physique",
    driverId: "ai",
    libelle: "Contrainte physique",
    mecanisme:
      "L'électricité, le réseau et le cuivre limitent le rythme de déploiement des centres de données ; les retards pèsent sur les profits attendus.",
    instruments: ["copper", "wti", "brent"],
    macros: [],
    lisibilite: "directe",
    limite: "Directe pour `copper`, mais mensuel seulement.",
  },
  {
    id: "financement-capex",
    driverId: "ai",
    libelle: "Financement du capex",
    mecanisme:
      "Les conditions de crédit et le coût du capital déterminent si l'investissement peut continuer à ce rythme.",
    instruments: ["us10y", "us20y"],
    macros: [],
    lisibilite: "indirecte",
    limite: "Les écarts de crédit ne sont pas collectés.",
  },
  {
    id: "puces-geopolitique",
    driverId: "ai",
    libelle: "Offre de puces et géopolitique",
    mecanisme:
      "Restrictions d'export et tensions autour de Taïwan et de la Chine modifient l'approvisionnement en calcul.",
    instruments: ["nky", "csi300", "ndx"],
    macros: [],
    lisibilite: "indirecte",
    limite: "Aucun instrument ne porte spécifiquement la chaîne des semi-conducteurs.",
  },
];

export function getAxesForDriver(driverId: string): Axe[] {
  return AXES.filter((a) => a.driverId === driverId);
}
