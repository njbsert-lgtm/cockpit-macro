import type { Trend } from "@/lib/types";

/**
 * Tendances de fond — de l'analyse, donc versionnée dans le repo et non dans la base.
 * Une tendance est un objet persistant qui traverse les éditions, pas un paragraphe :
 * son `statusHistory` est ce qui permet de voir, en un écran, si la lecture de long terme
 * tient depuis six mois ou si elle s'est érodée sans qu'on le remarque.
 *
 * Le typage `Trend[]` fait la validation : un statut hors énumération, une entrée
 * d'historique sans justification ou sans édition de rattachement ne compile pas.
 */
export const TRENDS: Trend[] = [
    {
      "id": "prime-risque-permanente",
      "title": "La prime de risque géopolitique devient permanente",
      "thesis": "Ormuz acheminait environ un cinquième de l'offre pétrolière mondiale. L'EIA anticipe des perturbations résiduelles d'environ 0,6 million de barils/jour jusqu'à fin 2027, même après un accord. Le marché n'efface pas cette prime, il l'intègre — dans l'énergie, l'assurance maritime, le fret et la défense. Le coût du capital des importateurs d'énergie monte durablement.",
      "zones": [
        "global",
        "ez",
        "fr",
        "jp",
        "in"
      ],
      "assetClasses": [
        "commodity",
        "fx",
        "equity"
      ],
      "status": "maintient",
      "statusHistory": [
        {
          "date": "2026-07-05",
          "status": "renforce",
          "editionSlug": "2026-S27",
          "why": "Premier constat du déficit de 1,8 Mb/j chiffré par l'AIE, aucun signe de désescalade."
        },
        {
          "date": "2026-07-12",
          "status": "renforce",
          "editionSlug": "2026-S28",
          "why": "Ormuz reste fermé après l'épisode de blocage du 9 juillet ; les primes d'assurance de guerre grimpent encore."
        },
        {
          "date": "2026-08-09",
          "status": "maintient",
          "editionSlug": "2026-S32",
          "why": "Le Brent oscille désormais entre 85 et 90 $ sans nouvelle jambe haussière — la prime s'est installée plutôt qu'elle ne continue de monter."
        }
      ],
      "driverRefs": [
        "iran"
      ],
      "invalidatedBy": "Une réouverture vérifiée d'Ormuz avec normalisation des transits et recul durable des primes d'assurance maritime."
    },
    {
      "id": "desinflation-terminee",
      "title": "La désinflation est terminée, le resserrement recommence partout",
      "thesis": "La Fed est passée d'un biais baissier à un biais haussier. La BCE a relevé ses taux en juin malgré une croissance quasi nulle. La BoJ normalise. Trois grandes banques centrales resserrent simultanément dans une économie faible. Le filet de sécurité des banques centrales n'existe plus tant que le pétrole est haut.",
      "zones": [
        "global",
        "us",
        "ez",
        "jp"
      ],
      "assetClasses": [
        "rates",
        "equity",
        "fx"
      ],
      "status": "renforce",
      "statusHistory": [
        {
          "date": "2026-07-05",
          "status": "maintient",
          "editionSlug": "2026-S27",
          "why": "La BCE vient de relever ses taux en juin, la Fed est en pause avec un biais haussier depuis juillet."
        },
        {
          "date": "2026-08-02",
          "status": "renforce",
          "editionSlug": "2026-S31",
          "why": "La BoJ relève à 1,00 % le 31 juillet et plusieurs membres appellent à accélérer ; trois banques centrales resserrent désormais de façon synchronisée."
        }
      ],
      "driverRefs": [
        "rates",
        "iran"
      ],
      "invalidatedBy": "Un retournement net de l'emploi américain qui forcerait la Fed à rouvrir la porte à une baisse."
    },
    {
      "id": "capex-ia-benefices",
      "title": "Le capex IA est un vrai moteur de bénéfices, mais concentré",
      "thesis": "Les surprises de BPA au T2 sont les plus fortes depuis que FactSet mesure la donnée. C'est ce qui permet aux actions de monter avec des taux qui remontent. Mais le S&P se paie environ 20× les bénéfices attendus, contre ~16× de moyenne longue. Marché porté par les bénéfices, pas par les multiples — donc binaire.",
      "zones": [
        "global",
        "us"
      ],
      "assetClasses": [
        "equity"
      ],
      "status": "maintient",
      "statusHistory": [
        {
          "date": "2026-07-19",
          "status": "renforce",
          "editionSlug": "2026-S29",
          "why": "86 % de surprises positives de BPA au T2, un record sur la période suivie par FactSet."
        },
        {
          "date": "2026-08-09",
          "status": "maintient",
          "editionSlug": "2026-S32",
          "why": "Les carnets de commandes progressent encore mais le rythme de progression ralentit — la thèse tient sans nouvelle confirmation forte."
        }
      ],
      "driverRefs": [
        "ai"
      ],
      "invalidatedBy": "Un premier trimestre où un grand acheteur de compute révise son capex à la baisse."
    },
    {
      "id": "japon-anomalie",
      "title": "Le Japon sort de trente ans d'anomalie",
      "thesis": "Un JGB 10 ans au-dessus de 2,80 %, en nette hausse sur un an, dans le pays le plus endetté du monde développé, avec un yen proche de ses plus bas de 40 ans. Le Japon est le premier créancier net de la planète : un rapatriement de l'épargne japonaise ferait monter les taux longs partout.",
      "zones": [
        "global",
        "jp",
        "us",
        "ez"
      ],
      "assetClasses": [
        "rates",
        "fx"
      ],
      "status": "renforce",
      "statusHistory": [
        {
          "date": "2026-07-12",
          "status": "maintient",
          "editionSlug": "2026-S28",
          "why": "Le yen s'approche de 158, sans franchir de seuil qui justifierait un changement de statut."
        },
        {
          "date": "2026-08-02",
          "status": "renforce",
          "editionSlug": "2026-S31",
          "why": "USD/JPY dépasse 159 après le rapport d'emploi américain, intervention conjointe évoquée, hausse de la BoJ actée."
        }
      ],
      "driverRefs": [
        "rates"
      ],
      "invalidatedBy": "Une stabilisation durable du yen sous 150 sans intervention, qui retirerait la pression sur la BoJ."
    },
    {
      "id": "recomposition-flux-hors-chine",
      "title": "Recomposition des flux hors de Chine, sans gagnant évident",
      "thesis": "Les capitaux quittent la Chine, mais l'Inde recule cette année : un importateur net de pétrole ne peut pas être le refuge d'un choc pétrolier. Le vrai bénéficiaire est la chaîne semi-conducteurs, pas la démographie. « Émergents » n'est plus une classe d'actifs cohérente.",
      "zones": [
        "global",
        "cn",
        "in",
        "em"
      ],
      "assetClasses": [
        "equity",
        "fx"
      ],
      "status": "maintient",
      "statusHistory": [
        {
          "date": "2026-07-05",
          "status": "maintient",
          "editionSlug": "2026-S27",
          "why": "Le CSI 300 reste plat sur l'année, le Nifty 50 recule sur fond de sorties de capitaux et de facture pétrolière."
        }
      ],
      "driverRefs": [],
      "invalidatedBy": "Un retour net des flux vers la Chine onshore ou une stabilisation claire de la roupie indienne."
    }
  ];
