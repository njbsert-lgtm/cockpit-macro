import type { ScenarioVersion } from "@/lib/types";

/**
 * Scénarios versionnés — chaque révision crée une version datée liée à l'édition qui l'a
 * produite. On n'écrase jamais une version : on en ajoute une, ce qui rend la vue Trajectoire
 * possible et montre si la lecture a suivi les données ou couru derrière les prix.
 *
 * Règle du cahier des charges : une révision de vraisemblance sans justification écrite est
 * interdite — `likelihoodChangedFrom` non nul impose un `why` non vide.
 */
export const SCENARIO_VERSIONS: ScenarioVersion[] = [
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "rates",
      "branchId": "rates-statu-quo",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "central",
      "thesis": "Statu quo prolongé : la Fed reste en attente, ni hausse ni baisse, le temps de voir si le choc pétrolier se propage aux anticipations d'inflation.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse modérée",
          "text": "Les bénéfices portent le marché sans extension de multiples."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Le 10 ans reste ancré, le portage rémunère plus que la duration longue."
        },
        "fx": {
          "direction": "flat",
          "label": "Dollar ferme",
          "text": "Aucun choc de politique monétaire dans un sens ou l'autre."
        },
        "cm": {
          "direction": "flat",
          "label": "Volatiles, sans tendance",
          "text": "Le pétrole reste piloté par Ormuz, pas par la Fed."
        }
      },
      "watchSignals": "Le cœur d'inflation continue-t-il de décélérer pendant que l'inflation totale reste élevée ?"
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "rates",
      "branchId": "rates-statu-quo",
      "version": 2,
      "date": "2026-08-09",
      "editionSlug": "2026-S32",
      "likelihood": "central",
      "thesis": "Statu quo prolongé reste central, mais la marge s'est réduite des deux côtés : la branche hausse et la branche baisse ont toutes deux bougé cette semaine, resserrant l'intervalle autour du statu quo sans le remettre en cause.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse modérée",
          "text": "Inchangé : les bénéfices portent toujours le marché."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Le 10 ans reste entre 4,4 et 4,9 %, comme anticipé."
        },
        "fx": {
          "direction": "flat",
          "label": "Dollar ferme",
          "text": "DXY toujours proche de 100, cohérent avec la thèse initiale."
        },
        "cm": {
          "direction": "flat",
          "label": "Volatiles, sans tendance",
          "text": "Toujours piloté par Ormuz plutôt que par la Fed."
        }
      },
      "watchSignals": "Le rapport d'emploi d'août — un ralentissement net ferait basculer la lecture vers la branche baisse."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "rates",
      "branchId": "rates-hausse",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "faible",
      "thesis": "Une hausse nécessiterait que le choc pétrolier commence à désancrer les anticipations d'inflation — pas observé à ce stade.",
      "impacts": {
        "eq": {
          "direction": "down",
          "label": "Compression des multiples",
          "text": "Un taux réel plus élevé pénalise mécaniquement les flux lointains."
        },
        "fi": {
          "direction": "down",
          "label": "Baisse",
          "text": "Toute la courbe se tend, la partie longue souffre le plus."
        },
        "fx": {
          "direction": "up",
          "label": "Dollar plus fort",
          "text": "Un resserrement inattendu attire les flux de rendement."
        },
        "cm": {
          "direction": "flat",
          "label": "Ambigu",
          "text": "L'or est tiraillé entre taux réels en hausse et crédibilité anti-inflation renforcée."
        }
      },
      "watchSignals": "Une inflation totale qui repasse au-dessus de 4 % sans justification énergétique évidente."
    },
    {
      "likelihoodChangedFrom": "faible",
      "why": "La Fed de Kevin Warsh affiche trois dissidences pour une hausse dès la réunion de juillet, et J.P. Morgan a révisé son scénario central vers une première hausse en décembre. Le changement n'est pas dans les chiffres d'inflation mais dans la fonction de réaction de la Fed elle-même.",
      "driverId": "rates",
      "branchId": "rates-hausse",
      "version": 2,
      "date": "2026-08-09",
      "editionSlug": "2026-S32",
      "likelihood": "moderee",
      "thesis": "Une Fed prête à monter dans une économie molle pour défendre sa crédibilité est désormais documentée par le vote de juillet, pas seulement une hypothèse. Le scénario central reste le statu quo, mais l'écart s'est réduit.",
      "impacts": {
        "eq": {
          "direction": "down",
          "label": "Compression des multiples",
          "text": "Plafonne les multiples, pentifie la courbe — inchangé sur le fond."
        },
        "fi": {
          "direction": "down",
          "label": "Baisse",
          "text": "La prime de terme se reconstitue déjà sur la partie longue."
        },
        "fx": {
          "direction": "up",
          "label": "Dollar plus fort",
          "text": "Le marché commence à price une partie du scénario décembre."
        },
        "cm": {
          "direction": "flat",
          "label": "Ambigu",
          "text": "Inchangé : taux réels contre crédibilité anti-inflation."
        }
      },
      "watchSignals": "Jackson Hole fin août — un ton explicitement plus dur de Kevin Warsh confirmerait la trajectoire vers décembre."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "rates",
      "branchId": "rates-baisses",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "moderee",
      "thesis": "Un retour aux baisses suppose soit un accord vérifié sur Ormuz qui fait refluer l'inflation totale, soit une détérioration nette du marché du travail.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse forte",
          "text": "Rotation vers les valeurs sensibles à la duration et à la consommation."
        },
        "fi": {
          "direction": "up",
          "label": "Hausse",
          "text": "Meilleur scénario pour la duration longue."
        },
        "fx": {
          "direction": "down",
          "label": "Dollar plus faible",
          "text": "Fin de la prime de rendement relative."
        },
        "cm": {
          "direction": "down",
          "label": "Baisse pour l'énergie",
          "text": "Sauf choc de demande, où l'or profiterait des taux réels plus bas."
        }
      },
      "watchSignals": "Un accord vérifié sur Ormuz ou un rapport d'emploi américain nettement négatif."
    },
    {
      "likelihoodChangedFrom": "moderee",
      "why": "Le CPI de juillet confirme une inflation totale à 3,4 %, sans recul, malgré un cœur qui décélère. Tant que le Brent reste au-dessus de 85 $, la Fed n'a structurellement aucune marge pour baisser, quelle que soit l'évolution de l'emploi.",
      "driverId": "rates",
      "branchId": "rates-baisses",
      "version": 2,
      "date": "2026-08-09",
      "editionSlug": "2026-S32",
      "likelihood": "faible",
      "thesis": "Le canal qui aurait pu déclencher cette branche (un accord sur Ormuz) ne s'est pas matérialisé ; le second canal (choc de demande via l'emploi) reste ambigu après le rapport de juillet. La branche recule au profit du statu quo.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse forte",
          "text": "Inchangé si le scénario se matérialisait, mais probabilité réduite."
        },
        "fi": {
          "direction": "up",
          "label": "Hausse",
          "text": "Inchangé sur le fond."
        },
        "fx": {
          "direction": "down",
          "label": "Dollar plus faible",
          "text": "Inchangé sur le fond."
        },
        "cm": {
          "direction": "down",
          "label": "Baisse pour l'énergie",
          "text": "Inchangé sur le fond."
        }
      },
      "watchSignals": "Le rapport d'emploi d'août reste le signal le plus susceptible de faire remonter cette branche."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "iran",
      "branchId": "iran-enlisement",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "central",
      "thesis": "Statu quo prolongé : ni accord, ni escalade majeure. Le Brent oscille entre 80 et 95 $ au rythme des rumeurs. C'est le scénario le plus probable et, paradoxalement, le plus confortable pour les actions.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse modérée",
          "text": "Les bénéfices portent le marché, les multiples ne s'étendent pas."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Le 10 ans reste ancré entre 4,4 et 4,9 %."
        },
        "fx": {
          "direction": "flat",
          "label": "Dollar ferme",
          "text": "DXY autour de 99-102."
        },
        "cm": {
          "direction": "flat",
          "label": "Volatiles, sans tendance",
          "text": "Brent 80-95 $, allers-retours sur les titres de presse."
        }
      },
      "watchSignals": "Nouveaux cycles rumeur-démenti sans changement des transits effectifs par le détroit."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "Quatrième cycle rumeur-démenti recensé depuis juin, sans changement des transits effectifs. Le scénario central se confirme plutôt qu'il n'évolue.",
      "driverId": "iran",
      "branchId": "iran-enlisement",
      "version": 2,
      "date": "2026-08-02",
      "editionSlug": "2026-S31",
      "likelihood": "central",
      "thesis": "Inchangé sur le fond ; le nombre de cycles rumeur-démenti sans conséquence physique renforce la confiance dans ce scénario central plutôt que de la remettre en cause.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse modérée",
          "text": "Inchangé."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Inchangé."
        },
        "fx": {
          "direction": "flat",
          "label": "Dollar ferme",
          "text": "Inchangé."
        },
        "cm": {
          "direction": "flat",
          "label": "Volatiles, sans tendance",
          "text": "Inchangé."
        }
      },
      "watchSignals": "Le cœur d'inflation qui continue de décélérer pendant que l'inflation totale stagne resterait le signal de confirmation le plus solide."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "iran",
      "branchId": "iran-fin",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "faible",
      "thesis": "Accord vérifié sur Ormuz, transits normalisés. Le Brent revient vers 65-70 $ en quelques semaines — le scénario le plus favorable aux actifs financiers.",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse forte",
          "text": "Rotation brutale hors de l'énergie et de la défense."
        },
        "fi": {
          "direction": "up",
          "label": "Hausse",
          "text": "Baisse des taux sur toute la courbe."
        },
        "fx": {
          "direction": "flat",
          "label": "Dollar plus faible",
          "text": "Fin de la prime de refuge."
        },
        "cm": {
          "direction": "down",
          "label": "Baisse marquée",
          "text": "Brent vers 65-70 $."
        }
      },
      "watchSignals": "Transits quotidiens effectifs, primes d'assurance de guerre en baisse, retrait effectif du blocus naval."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "iran",
      "branchId": "iran-durcissement",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "faible",
      "thesis": "Escalade : frappes élargies, sortie de production du Golfe. Le Brent viserait 120 $ et au-delà — la stagflation véritable.",
      "impacts": {
        "eq": {
          "direction": "down",
          "label": "Baisse forte",
          "text": "Compression simultanée des multiples et des marges."
        },
        "fi": {
          "direction": "down",
          "label": "Baisse",
          "text": "Le piège du choc d'offre : taux et actions baissent ensemble."
        },
        "fx": {
          "direction": "up",
          "label": "Dollar plus fort",
          "text": "Refuge et rendement se combinent."
        },
        "cm": {
          "direction": "up",
          "label": "Hausse forte",
          "text": "Brent au-delà de 120 $."
        }
      },
      "watchSignals": "Frappes sur des terminaux d'exportation, sorties d'assureurs maritimes, arrêts de production annoncés."
    },
    {
      "likelihoodChangedFrom": "faible",
      "why": "Le blocage physique de 48 h à l'entrée du détroit, même bref et sans frappe directe, change la distribution des risques par rapport à une simple rumeur non matérialisée.",
      "driverId": "iran",
      "branchId": "iran-durcissement",
      "version": 2,
      "date": "2026-07-09",
      "editionSlug": "2026-S28-E1",
      "likelihood": "moderee",
      "thesis": "Un premier épisode de blocage physique avéré rend le scénario de durcissement moins hypothétique — sans en faire le scénario central, qui reste l'enlisement.",
      "impacts": {
        "eq": {
          "direction": "down",
          "label": "Baisse forte",
          "text": "Inchangé sur le fond."
        },
        "fi": {
          "direction": "down",
          "label": "Baisse",
          "text": "Inchangé sur le fond."
        },
        "fx": {
          "direction": "up",
          "label": "Dollar plus fort",
          "text": "Inchangé sur le fond."
        },
        "cm": {
          "direction": "up",
          "label": "Hausse forte",
          "text": "Inchangé sur le fond."
        }
      },
      "watchSignals": "Une deuxième suspension des transits confirmerait la trajectoire ; une reprise durable sans nouvel épisode l'infirmerait."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "ai",
      "branchId": "ai-plafonne",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "central",
      "thesis": "Les fournisseurs d'infrastructure continuent de délivrer, mais les dépenses cessent d'accélérer. La croissance des bénéfices reste forte sans plus surprendre à la hausse.",
      "impacts": {
        "eq": {
          "direction": "flat",
          "label": "Hausse faible, dispersée",
          "text": "Le marché avance au rythme des bénéfices, sans extension de multiples."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Les taux restent pilotés par le pétrole et la Fed."
        },
        "fx": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Aucun flux dominant lié à l'IA."
        },
        "cm": {
          "direction": "flat",
          "label": "Soutien maintenu",
          "text": "Le capex déjà engagé continue de tirer cuivre et électricité."
        }
      },
      "watchSignals": "La décélération du taux de croissance du carnet de commandes, pas son niveau absolu."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "La saison de résultats confirme des surprises de BPA record sans signe net d'accélération du capex — exactement la signature attendue de cette branche.",
      "driverId": "ai",
      "branchId": "ai-plafonne",
      "version": 2,
      "date": "2026-08-09",
      "editionSlug": "2026-S32",
      "likelihood": "central",
      "thesis": "Inchangé : 86 % de surprises positives de BPA valident la partie « profits tiennent » ; aucune annonce de révision à la hausse des budgets de compute ne vient déplacer le curseur vers la branche accélération.",
      "impacts": {
        "eq": {
          "direction": "flat",
          "label": "Hausse faible, dispersée",
          "text": "Inchangé."
        },
        "fi": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Inchangé."
        },
        "fx": {
          "direction": "flat",
          "label": "Sans direction",
          "text": "Inchangé."
        },
        "cm": {
          "direction": "flat",
          "label": "Soutien maintenu",
          "text": "Inchangé."
        }
      },
      "watchSignals": "L'écart entre capex annoncé et capex décaissé sur les prochains trimestres."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "ai",
      "branchId": "ai-accelere",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "moderee",
      "thesis": "L'adoption se diffuse au-delà des fournisseurs d'infrastructure, les entreprises utilisatrices montrent des gains de marge mesurables — le cycle passerait de « dépense spéculative » à « investissement à retour prouvé ».",
      "impacts": {
        "eq": {
          "direction": "up",
          "label": "Hausse forte, élargie",
          "text": "Le leadership s'étend au-delà des semi-conducteurs."
        },
        "fi": {
          "direction": "down",
          "label": "Sous pression",
          "text": "Taux neutre plus élevé, émission massive pour financer le capex."
        },
        "fx": {
          "direction": "up",
          "label": "Dollar plus fort",
          "text": "Les capitaux se concentrent sur le marché américain."
        },
        "cm": {
          "direction": "up",
          "label": "Cuivre et électricité",
          "text": "Le goulet d'étranglement n'est plus la puce mais le mégawatt."
        }
      },
      "watchSignals": "Revenus cloud et carnets de commandes contractés, marges opérationnelles hors tech, enquêtes de productivité du BLS."
    },
    {
      "likelihoodChangedFrom": null,
      "why": "",
      "driverId": "ai",
      "branchId": "ai-decoit",
      "version": 1,
      "date": "2026-07-05",
      "editionSlug": "2026-S27",
      "likelihood": "faible",
      "thesis": "Les entreprises utilisatrices ne parviennent pas à démontrer un retour sur investissement, les grands acheteurs de compute révisent leurs dépenses à la baisse. Sans coussin de valorisation, la correction serait portée intégralement par les multiples.",
      "impacts": {
        "eq": {
          "direction": "down",
          "label": "Baisse forte",
          "text": "Correction concentrée sur semi-conducteurs et infrastructure."
        },
        "fi": {
          "direction": "up",
          "label": "Hausse",
          "text": "Enfin une couverture qui fonctionne — choc de demande, pas d'offre."
        },
        "fx": {
          "direction": "flat",
          "label": "Yen plus fort",
          "text": "Aversion au risque classique."
        },
        "cm": {
          "direction": "down",
          "label": "Cuivre en baisse",
          "text": "Le cuivre perd sa prime IA."
        }
      },
      "watchSignals": "Révision de capex d'un grand acheteur de compute, annulations dans les carnets de commandes plutôt que reports."
    }
  ];
