import type { ThemeObserve } from "@/lib/types";

/**
 * Réécrit intégralement à chaque publication depuis /redaction — ne pas éditer à la
 * main, voir content/generated/README.md.
 */
export const GENERATED_THEMES: ThemeObserve[] = [
  {
    "id": "risque-souverain-francais-circonscrit-sans-contagion-bancaire",
    "libelle": "Risque souverain français circonscrit, sans contagion bancaire",
    "origine": "notion",
    "emetteur": "Apollo (Torsten Sløk)",
    "these": "Le spread OAT-Bund est à son plus large niveau depuis la crise de l'euro de 2011 sous l'effet de la pression budgétaire avant le débat du 13 octobre, mais le système bancaire européen reste solide et la BCE dispose de plusieurs options en cas de menace à la stabilité financière.",
    "dateOrigine": "2026-10-10",
    "instrumentsTemoins": [
      "spread-oat10y-bund10y"
    ],
    "temoinsHorsCatalogue": [],
    "confirmeSi": "Le spread OAT-Bund repasse sous 100 points de base en clôture dans les deux mois suivant le 13 octobre.",
    "infirmeSi": "Le spread OAT-Bund dépasse 150 points de base en clôture.",
    "delaiJours": 60,
    "debutObservation": null,
    "statut": "observe",
    "mentions": [
      {
        "date": "2026-10-10",
        "source": "2026-S41",
        "emetteur": "Apollo (Torsten Sløk)"
      }
    ],
    "verdictLe": null,
    "verdictPar": null
  }
];
