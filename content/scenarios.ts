import type { ScenarioVersion } from "@/lib/types";

/**
 * Scénarios versionnés — chaque révision crée une version datée liée à la note qui l'a
 * produite. On n'écrase jamais une version : on en ajoute une, ce qui rend la vue Trajectoire
 * possible et montre si la lecture a suivi les données ou couru derrière les prix.
 *
 * Règle du cahier des charges : une révision de vraisemblance sans justification écrite est
 * interdite — `likelihoodChangedFrom` non nul impose un `why` non vide.
 */
export const SCENARIO_VERSIONS: ScenarioVersion[] = [
  {
    likelihoodChangedFrom: "moderee",
    why: "La branche « statu quo prolongé » est factuellement démentie. Trois éléments concordants : la hausse du 16 septembre est actée, elle est unanime, et le dot plot signale une hausse supplémentaire d'ici la fin de l'année. Le marché va plus loin encore, avec trois hausses supplémentaires anticipées d'ici fin 2027. Ce n'est pas une inflexion de probabilité, c'est un fait accompli avec une trajectoire annoncée par l'émetteur lui-même.",
    driverId: "rates",
    branchId: "rates-hausse",
    version: 4,
    date: "2026-09-19",
    noteSlug: "2026-S38",
    likelihood: "central",
    thesis:
      "Le cycle de hausse a repris. Trois grandes banques centrales ont resserré dans le même mois — Fed, BCE, BoJ — et l'inflation qu'elles combattent vient d'un choc d'offre qu'elles ne contrôlent pas. La question n'est plus « la Fed monte-t-elle » mais « jusqu'où ».",
    impacts: {
      eq: {
        direction: "down",
        label: "Compression des multiples",
        text: "Un resserrement acté n'est pas mécaniquement baissier pour les actions : historiquement le S&P progresse de 9 % dans les douze mois suivant le début d'un cycle, mais recule de 2 % dans les trois premiers. C'est d'abord un problème de duration, pas de bénéfices.",
      },
      fi: {
        direction: "down",
        label: "Baisse",
        text: "La duration est le point de rupture. La décision a stoppé la montée des rendements longs à court terme, mais la prime de terme reste le canal par lequel la suite du cycle se paiera.",
      },
      fx: {
        direction: "up",
        label: "Dollar plus fort",
        text: "Le différentiel se rouvre malgré des resserrements simultanés en zone euro et au Japon : c'est l'ampleur annoncée du cycle qui compte, pas son déclenchement.",
      },
      cm: {
        direction: "flat",
        label: "Ambigu",
        text: "Inchangé : taux réels en hausse contre crédibilité anti-inflation renforcée. L'énergie reste pilotée par la géopolitique, pas par la Fed.",
      },
    },
    watchSignals:
      "La réunion de décembre et le dot plot qui l'accompagne : ils diront si la trajectoire annoncée tient ou si la hausse de septembre reste isolée.",
  },
  {
    likelihoodChangedFrom: "central",
    why: "La Fed a relevé son taux directeur de 25 points de base le 16 septembre, à l'unanimité, et le dot plot annonce une hausse de plus d'ici la fin de l'année. Un statu quo prolongé n'est plus une lecture possible du présent : la branche ne redeviendrait vraisemblable qu'en cas d'arrêt net du cycle après une seule hausse, ce que rien n'indique aujourd'hui.",
    driverId: "rates",
    branchId: "rates-statu-quo",
    version: 4,
    date: "2026-09-19",
    noteSlug: "2026-S38",
    likelihood: "faible",
    thesis:
      "Un arrêt du cycle après une seule hausse supposerait que la Fed juge le choc d'offre transitoire — exactement la lecture qu'elle vient d'abandonner en votant à l'unanimité.",
    impacts: {
      eq: {
        direction: "up",
        label: "Hausse modérée",
        text: "Inchangé si le scénario se matérialisait, mais la probabilité s'est effondrée.",
      },
      fi: {
        direction: "flat",
        label: "Sans direction",
        text: "Une stabilisation de la courbe supposerait que le marché cesse d'anticiper la suite du cycle.",
      },
      fx: {
        direction: "flat",
        label: "Dollar ferme",
        text: "Inchangé sur le fond.",
      },
      cm: {
        direction: "flat",
        label: "Volatiles, sans tendance",
        text: "Toujours piloté par les détroits plutôt que par la Fed.",
      },
    },
    watchSignals:
      "Un discours de Kevin Warsh présentant la hausse de septembre comme un ajustement ponctuel plutôt que comme le début d'un cycle.",
  },
  {
    likelihoodChangedFrom: null,
    why: "",
    driverId: "rates",
    branchId: "rates-baisses",
    version: 4,
    date: "2026-09-19",
    noteSlug: "2026-S38",
    likelihood: "faible",
    thesis:
      "Inchangée, et pour la même raison qu'en août : le canal qui déclencherait cette branche est un choc de demande, pas une détente de l'inflation. Un cycle de hausse qui commence l'éloigne mécaniquement sans rien changer à sa mécanique.",
    impacts: {
      eq: {
        direction: "up",
        label: "Hausse forte",
        text: "Inchangé si le scénario se matérialisait.",
      },
      fi: {
        direction: "up",
        label: "Hausse",
        text: "Inchangé sur le fond.",
      },
      fx: {
        direction: "down",
        label: "Dollar plus faible",
        text: "Inchangé sur le fond.",
      },
      cm: {
        direction: "down",
        label: "Baisse pour l'énergie",
        text: "Inchangé sur le fond.",
      },
    },
    watchSignals:
      "Une dégradation nette du marché du travail américain — c'est le seul canal qui ramènerait cette branche, et il n'a pas bougé.",
  },
];
