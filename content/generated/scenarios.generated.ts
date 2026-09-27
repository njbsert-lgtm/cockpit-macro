import type { ScenarioVersion } from "@/lib/types";

/**
 * Réécrit intégralement à chaque publication depuis /redaction — ne pas éditer à la
 * main, voir content/generated/README.md.
 */
export const GENERATED_SCENARIO_VERSIONS: ScenarioVersion[] = [
  {
    "driverId": "rates",
    "branchId": "rates-hausse",
    "version": 5,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "central",
    "likelihoodChangedFrom": null,
    "why": "PMI manufacturier au plus haut depuis juillet 2021, adjudication à deux ans exigeant des taux plus élevés, pétrole repassé au-dessus de 100 dollars : le régime de hausse se confirme et s'approfondit.",
    "thesis": "Le cycle de hausse se poursuit ; la question n'est plus si mais jusqu'où, et l'ampleur commence elle-même à être contestée par certains artisans du resserrement.",
    "impacts": {
      "eq": {
        "direction": "down",
        "label": "Actions",
        "text": "Les valorisations sensibles à la duration restent sous pression ; la résistance vient presque entièrement du trade IA, pas d'un soutien large du marché."
      },
      "fi": {
        "direction": "up",
        "label": "Taux",
        "text": "Les rendements longs poursuivent leur ascension, au-delà du seuil déjà franchi mi-septembre."
      },
      "fx": {
        "direction": "up",
        "label": "Change",
        "text": "Le dollar reste soutenu par l'écart de rythme entre resserrement américain et prudence affichée sur l'ampleur des futures hausses de la BCE."
      },
      "cm": {
        "direction": "flat",
        "label": "Matières premières",
        "text": "Le pétrole entretient la boucle inflationniste, mais le gaz européen et le WTI évoluent en sens contraires — aucun signal net d'ensemble."
      }
    },
    "watchSignals": "Un reflux durable du 10 ans, ou au contraire un franchissement supplémentaire confirmé sur plusieurs séances."
  },
  {
    "driverId": "rates",
    "branchId": "rates-statu-quo",
    "version": 5,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "moderee",
    "likelihoodChangedFrom": "faible",
    "why": "Première contestation chiffrée de l'ampleur du resserrement : Goldman Sachs (Stehn sur la BCE, Kaplan sur la Fed) juge le marché plus restrictif que ne le seront les banques centrales elles-mêmes.",
    "thesis": "Un plafond existe, mais il est plus bas que celui pricé par le marché — pas une pause, un plafond différent.",
    "impacts": {
      "eq": {
        "direction": "up",
        "label": "Actions",
        "text": "Un plafonnement du cycle validerait la thèse de résilience des actions sans le concours exclusif de l'IA."
      },
      "fi": {
        "direction": "down",
        "label": "Taux",
        "text": "Une confirmation de ce plafond ferait refluer les rendements longs depuis leurs plus hauts récents."
      },
      "fx": {
        "direction": "down",
        "label": "Change",
        "text": "Un dollar moins soutenu par l'écart de taux si la BCE et la Fed confirment un plafond commun inférieur au pricing de marché."
      },
      "cm": {
        "direction": "flat",
        "label": "Matières premières",
        "text": "Sans choc de demande ni choc d'offre nouveau, les matières premières resteraient pilotées par l'Iran plus que par les banques centrales."
      }
    },
    "watchSignals": "La décision effective de la BCE en décembre, comparée aux 2,75 % avancés par Goldman Sachs Research."
  },
  {
    "driverId": "rates",
    "branchId": "rates-baisses",
    "version": 5,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "faible",
    "likelihoodChangedFrom": null,
    "why": "Inchangée : le canal de déclenchement — choc de demande via l'emploi, ou accord vérifié sur Ormuz faisant refluer l'inflation — reste absent des données de la semaine.",
    "thesis": "Un retour aux baisses resterait le scénario le plus favorable aux actifs financiers, mais aucun signal ne l'appelle actuellement.",
    "impacts": {
      "eq": {
        "direction": "up",
        "label": "Actions",
        "text": "Le scénario le plus favorable aux actions, mais rien ne l'indique cette semaine."
      },
      "fi": {
        "direction": "down",
        "label": "Taux",
        "text": "Non matérialisé : aucun signe de détérioration du marché du travail ni d'accord vérifié sur Ormuz."
      },
      "fx": {
        "direction": "down",
        "label": "Change",
        "text": "Un dollar affaibli supposerait un pivot accommodant qu'aucune des deux banques centrales ne signale."
      },
      "cm": {
        "direction": "flat",
        "label": "Matières premières",
        "text": "Scénario inchangé : le canal de déclenchement reste absent des données de la semaine."
      }
    },
    "watchSignals": "Une dégradation nette et confirmée du marché de l'emploi américain."
  },
  {
    "driverId": "iran",
    "branchId": "iran-enlisement",
    "version": 3,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "central",
    "likelihoodChangedFrom": null,
    "why": "Aucun accord politique acquis à New York malgré les tractations ; le statu quo reste le régime de fait, même si sa description physique évolue.",
    "thesis": "Ni accord, ni escalade majeure ; les négociations progressent en surface sans franchir le seuil politique.",
    "impacts": {
      "eq": {
        "direction": "flat",
        "label": "Actions",
        "text": "Le statu quo reste le scénario le plus confortable pour les actions, tant que le pétrole n'intègre pas de prime de rupture."
      },
      "fi": {
        "direction": "flat",
        "label": "Taux",
        "text": "Pas d'effet direct sur les taux tant que le canal reste l'énergie et non la croissance."
      },
      "fx": {
        "direction": "flat",
        "label": "Change",
        "text": "Aucun effet distinct sur le change hors de la trajectoire déjà pricée par les banques centrales."
      },
      "cm": {
        "direction": "up",
        "label": "Matières premières",
        "text": "Le pétrole reste volatile au gré des cycles de rumeur, sans validation ni infirmation nette par le marché physique."
      }
    },
    "watchSignals": "Un accord politique effectif à New York, ou au contraire son abandon explicite."
  },
  {
    "driverId": "iran",
    "branchId": "iran-fin",
    "version": 2,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "moderee",
    "likelihoodChangedFrom": "faible",
    "why": "Première négociation concrète rapportée cette semaine : sortie par étapes discutée à New York, avec un début de normalisation physique du transit antérieur à tout accord politique.",
    "thesis": "La normalisation physique précède la normalisation diplomatique ; ce n'est pas encore un accord, mais ce n'est plus une pure hypothèse.",
    "impacts": {
      "eq": {
        "direction": "up",
        "label": "Actions",
        "text": "Un accord vérifié soulagerait la prime de risque énergétique et soutiendrait les actions au-delà du seul trade IA."
      },
      "fi": {
        "direction": "down",
        "label": "Taux",
        "text": "Une désescalade confirmée retirerait une partie de la pression inflationniste qui alimente la hausse des rendements longs."
      },
      "fx": {
        "direction": "down",
        "label": "Change",
        "text": "Un choc de soulagement pétrolier limiterait le soutien apporté au dollar par la prime de risque géopolitique."
      },
      "cm": {
        "direction": "down",
        "label": "Matières premières",
        "text": "Le pétrole reviendrait vers des niveaux nettement inférieurs si la normalisation observée à New York se traduit par un accord politique."
      }
    },
    "watchSignals": "Une annonce politique formelle sur la réouverture du détroit et la levée du blocus."
  },
  {
    "driverId": "iran",
    "branchId": "iran-durcissement",
    "version": 4,
    "date": "2026-09-27",
    "noteSlug": "2026-S39",
    "likelihood": "moderee",
    "likelihoodChangedFrom": null,
    "why": "Inchangée : les attaques Houthis sur Yanbu et les drones sur les raffineries russes maintiennent le théâtre élargi actif, sans en faire le scénario central.",
    "thesis": "Le risque d'escalade périphérique reste vif, sur des fronts distincts du cœur de la négociation.",
    "impacts": {
      "eq": {
        "direction": "down",
        "label": "Actions",
        "text": "Une escalade confirmée sur Yanbu ou les raffineries russes referait grimper la prime de risque énergétique et pèserait sur les actions hors trade IA."
      },
      "fi": {
        "direction": "up",
        "label": "Taux",
        "text": "Un choc pétrolier avéré relancerait les craintes inflationnistes et la pression sur les rendements longs."
      },
      "fx": {
        "direction": "up",
        "label": "Change",
        "text": "Le dollar profiterait d'un regain d'aversion au risque en cas d'escalade confirmée."
      },
      "cm": {
        "direction": "up",
        "label": "Matières premières",
        "text": "Le pétrole viserait de nouveaux sommets si les attaques périphériques débordaient sur le cœur de la négociation."
      }
    },
    "watchSignals": "Une frappe confirmée sur une infrastructure d'exportation saoudienne, ou une riposte américaine documentée."
  }
];
