import type { Outlook } from "@/lib/types";

/**
 * Contenu analytique versionné, comme les notes et les tendances — mais rédigé hors de
 * l'application : le condensé est produit avec l'assistance d'un LLM en dehors du site à partir
 * du document original, puis collé ici à la main. Pas d'appel API en direct depuis l'app pour
 * le générer, pas de scraping des sites des banques.
 *
 * Vide par défaut sinon : aucun condensé n'est inventé au nom d'une banque. `/outlook` affiche
 * un état vide tant que rien n'est renseigné — à remplir au fil des publications réellement lues.
 */
export const OUTLOOKS: Outlook[] = [
  {
    id: "jpmorgan-mid-2026",
    bank: "J.P. Morgan Private Bank",
    bankMonogram: "JPM",
    title: "2026 Mid-Year Outlook: Promise and Pressure",
    periodCovered: "Mid-year 2026",
    // La donnée la plus récente citée dans le document ("Data as of April 20, 2026", répétée
    // sur plusieurs graphiques) — le document ne porte pas de date de publication explicite.
    publishedAt: "2026-04-20",
    summary:
      "J.P. Morgan Private Bank actualise sa lecture de 2026 autour de trois forces " +
      "interconnectées identifiées en début d'année — fragmentation géopolitique, inflation " +
      "et intelligence artificielle — désormais jugées encore plus lourdes de conséquences. " +
      "La banque se dit sélective mais constructive : son objectif n'est pas de prévoir le " +
      "prochain choc, mais de construire des portefeuilles capables d'y résister et d'en " +
      "tirer parti.\n\n" +
      "Sur la fragmentation, le point de départ est la fermeture du détroit d'Ormuz après une " +
      "frappe conjointe américano-israélienne contre l'Iran — le plus important choc d'offre " +
      "pétrolière depuis la Seconde Guerre mondiale, qui a fait plonger les marchés actions " +
      "d'environ 10 % avant un rebond partiel. Les risques identifiés : un blocage simultané " +
      "des goulets d'étranglement pétroliers et semi-conducteurs (Ormuz, Taïwan), " +
      "l'aggravation de la dépendance énergétique européenne, et l'approfondissement de la " +
      "rivalité stratégique américano-chinoise. À l'inverse, la banque voit un potentiel " +
      "haussier dans des marchés émergents mieux capitalisés, une « fragmentation sélective » " +
      "qui renforcerait les blocs occidentaux sans démondialiser, et un possible marché " +
      "haussier séculaire sur les actions chinoises, décotées et exposées à l'IA.\n\n" +
      "Sur l'inflation, le choc énergétique de mars aggrave une dynamique déjà installée : le " +
      "cœur d'inflation américain tournait près de 3 % avant même le choc, et la banque " +
      "redoute une répétition du schéma des années 1970 — des chocs présentés comme " +
      "temporaires qui finissent par s'incruster dans les anticipations. Le contrepoids : un " +
      "marché du travail qui reste mou, une désinflation du logement jugée durable, et une " +
      "pression désinflationniste venue de la concurrence mondiale, en particulier chinoise.\n\n" +
      "Sur l'intelligence artificielle, J.P. Morgan juge le narratif de marché devenu trop " +
      "pessimiste. Les scénarios extrêmes — destruction massive d'emplois de cols blancs, " +
      "disruption accélérée des modèles économiques existants, sommet de cycle marqué par une " +
      "vague d'IPO — dominent le débat, mais la banque juge les preuves actuelles de dégâts " +
      "sur l'emploi très limitées, et met en avant le potentiel de l'IA à élargir durablement " +
      "les marges et, via les gains de productivité, à alléger la trajectoire de la dette " +
      "publique.\n\n" +
      "La conclusion résume la thèse : les chocs et les dislocations créent des points " +
      "d'entrée pour les investisseurs patients, à condition de rester alignés sur leur plan " +
      "plutôt que de chercher à prévoir le prochain choc.",
    highlights: [
      "Trois thèmes structurent 2026 : fragmentation géopolitique, inflation persistante et cycle de l'IA — plus déterminants qu'en début d'année.",
      "La fermeture du détroit d'Ormuz après la frappe américano-israélienne contre l'Iran a déclenché le plus important choc pétrolier depuis la Seconde Guerre mondiale.",
      "Les chocs géopolitiques ont historiquement infligé des dégâts limités aux portefeuilles diversifiés : la banque y voit un point d'entrée, pas un signal de sortie.",
      "Diversifier au-delà des actions et obligations classiques : 3 % à 6 % du portefeuille en or, jusqu'à 5 % en actifs réels, face à une inflation plus volatile.",
      "Le narratif sur l'IA est jugé trop pessimiste : preuves de dégâts sur l'emploi encore limitées, marges et productivité sous-estimées par le marché.",
      "Le logiciel hérité (SaaS) reste le secteur le plus exposé à la disruption par l'IA ; les bénéficiaires du data center (semi-conducteurs, réseau, énergie) restent privilégiés.",
    ],
    driverRefs: ["iran", "rates", "ai"],
    trendRefs: ["prime-risque-permanente", "desinflation-terminee", "capex-ia-benefices"],
    sourceUrl:
      "https://privatebank.jpmorgan.com/content/dam/jpm-pb-aem/global/en/documents/2026-mid-year-outlook/2026-mid-year-outlook.pdf",
  },
];
