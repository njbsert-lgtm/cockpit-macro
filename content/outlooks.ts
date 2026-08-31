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
  {
    id: "hsbc-mid-2026",
    bank: "HSBC Asset Management",
    bankMonogram: "HSBC",
    title: "2026 Mid-Year Global Investment Outlook: Different Worlds",
    periodCovered: "Mid-year 2026",
    // Aucune date de publication explicite dans le document ; « Source: HSBC AM, June 2026 »
    // est répété en pied de chaque page. Le fichier porte "Content ID: D073083_v1.0".
    publishedAt: "2026-06-01",
    summary:
      "HSBC Asset Management publie son outlook de mi-année sous le titre « Different Worlds » : " +
      "les signaux macro et de marché ne racontent plus une histoire unique. Les indices actions " +
      "atteignent de nouveaux records, les spreads de crédit restent serrés et la volatilité est " +
      "contenue, alors même que les prix du pétrole ont grimpé, que l'offre de matières premières " +
      "est moins sûre et que les banques centrales sont de nouveau tiraillées entre inflation et " +
      "croissance.\n\n" +
      "La lecture centrale tient en une formule : « deux chocs et un boom ». Le choc pétrolier " +
      "pèse sur la croissance et alimente l'inflation, en particulier pour les économies " +
      "importatrices d'énergie ; la compétitivité exportatrice chinoise dans les technologies " +
      "avancées désinflate les prix des biens mondiaux tout en pressant les marges des " +
      "concurrents ; le boom de l'investissement en IA fait contrepoids en soutenant la " +
      "croissance, les profits et le leadership de marché. Il en résulte une dynamique « en K » : " +
      "la force est concentrée — largement dans l'investissement lié à l'IA aux États-Unis — " +
      "pendant que la demande des ménages et l'investissement hors technologie restent plus " +
      "fragiles.\n\n" +
      "Le scénario central, « Broadening out », suppose que le choc pétrolier reflue " +
      "progressivement en ligne avec les prix à terme, que les banques centrales restent " +
      "prudentes (le taux directeur américain s'approchant de 2,5 % avec un assouplissement " +
      "modeste), et que le leadership boursier s'élargit — mais de façon ciblée, vers les " +
      "semi-conducteurs, les infrastructures et certains émergents liés à la chaîne IA, plutôt " +
      "que par une rotation généralisée hors des États-Unis. Le scénario pessimiste, " +
      "« Shockwave », se matérialiserait si la perturbation de l'offre s'installait durablement ; " +
      "l'optimiste, « Boom boom », verrait le capex IA se transformer en expansion tirée par " +
      "l'investissement au sens large, portant la croissance américaine vers 3 %.\n\n" +
      "Trois analyses thématiques complètent l'outlook. Sur l'Inde, la sensibilité pétrolière " +
      "ravive les inquiétudes après une année de sorties de capitaux étrangers (32 milliards de " +
      "dollars de pic à creux) ; mais l'intensité pétrolière de l'économie a structurellement " +
      "baissé et les valorisations se sont normalisées — la vue est « constructive et neutre ». " +
      "Sur les émergents, la performance n'est plus une simple fonction de la faiblesse du " +
      "dollar : l'Asie du Nord est au cœur de la chaîne IA et des semi-conducteurs, les métaux " +
      "profitent de la transition énergétique, et la discipline de politique monétaire post-Covid " +
      "a réduit la vulnérabilité aux chocs externes. Sur l'or, HSBC nuance son rôle de " +
      "couverture : sur 28 années d'inflation supérieure à 3 % depuis 1900, son rendement a été " +
      "négatif 13 fois ; sa valeur tient davantage à l'assurance géopolitique et à la " +
      "diversification des réserves face au dollar qu'à une protection anti-inflationniste " +
      "systématique.\n\n" +
      "Les analyses approfondies détaillent la transmission du choc. En crédit, la fermeture du " +
      "détroit d'Ormuz a retiré environ 10 millions de barils/jour du marché — cinq fois la " +
      "perte d'approvisionnement russe — et le Qatar, qui fournit environ 20 % du GNL mondial et " +
      "un tiers de l'hélium mondial (critique pour les semi-conducteurs), rend la normalisation " +
      "du gaz plus lente que celle du pétrole (trois ans contre quelques mois). En actions, le " +
      "S&P 500 a vu 82 % des entreprises battre le consensus avec une croissance des bénéfices " +
      "d'environ 23 % sur un an, portée par dix valeurs qui concentrent plus de la moitié des " +
      "révisions de bénéfices récentes ; le capex des hyperscalers américains est désormais " +
      "attendu à 1 116 milliards de dollars pour 2027, et 2026 s'annonce comme l'une des plus " +
      "grosses années d'introductions en bourse jamais enregistrées, portée par l'IA.",
    highlights: [
      "« Deux chocs et un boom » : le choc pétrolier et la concurrence chinoise pèsent sur la croissance et l'inflation, le boom de l'IA fait contrepoids — une dynamique de marché « en K ».",
      "Scénario central « Broadening out » : le choc pétrolier reflue progressivement, la Fed s'approche de 2,5 %, le leadership boursier s'élargit mais reste ciblé sur la chaîne IA.",
      "La fermeture du détroit d'Ormuz a retiré environ 10 Mb/j du marché pétrolier — cinq fois la perte de l'offre russe ; le Qatar fournit un tiers de l'hélium mondial, critique pour les semi-conducteurs.",
      "Sur l'Inde : 32 milliards de dollars de sorties de capitaux étrangers de pic à creux, mais intensité pétrolière structurellement plus basse et valorisations normalisées — vue constructive et neutre.",
      "Les hyperscalers américains portent leur capex attendu pour 2027 à 1 116 milliards de dollars, et 2026 s'annonce comme l'une des plus grosses années d'IPO jamais enregistrées, portée par l'IA.",
      "L'or reste une couverture davantage géopolitique et de réserve qu'anti-inflationniste : sur 28 années d'inflation élevée depuis 1900, son rendement a été négatif 13 fois.",
    ],
    driverRefs: ["iran", "rates", "ai"],
    trendRefs: ["prime-risque-permanente", "desinflation-terminee", "capex-ia-benefices", "recomposition-flux-hors-chine"],
    sourceUrl:
      "https://www.assetmanagement.hsbc.co.uk/en/institutional-investor/-/media/files/attachments/common/2026-mid-year-investment-outlook",
  },
  {
    id: "bnpparibas-mid-2026",
    bank: "BNP Paribas Wealth Management",
    bankMonogram: "BNPP",
    title: "Our Investment Themes: 2026 Mid-Year Update",
    periodCovered: "Mid-year 2026",
    // Aucune date de publication explicite dans le document ; l'URL source porte le chemin
    // "june-2026" et le copyright interne indique "© BNP Paribas (2026)".
    publishedAt: "2026-06-01",
    summary:
      "BNP Paribas Wealth Management publie une mise à jour de mi-année de ses quatre thèmes " +
      "d'investissement 2026, sous un message central : aucun répit sur le plan géopolitique. " +
      "La guerre en Ukraine avait déjà rappelé l'urgence de la sécurité énergétique ; le conflit " +
      "iranien et la fermeture du détroit d'Ormuz l'ont depuis aggravée. Certains pays étaient " +
      "mieux préparés — la Chine a massivement investi dans le nucléaire, les renouvelables et " +
      "le stockage par batteries depuis 2022 et porté ses réserves stratégiques de pétrole à " +
      "200 jours de consommation domestique ; l'Europe a diversifié ses sources via le solaire, " +
      "l'éolien et de nouveaux terminaux GNL. Mais aucune région n'est à l'abri de la volatilité " +
      "des prix de l'énergie, pas même les États-Unis, dont le déséquilibre entre production de " +
      "brut léger et besoin d'importer des bruts plus lourds expose le pays malgré son statut " +
      "d'exportateur net.\n\n" +
      "Premier thème, « Ride the bull, but guard the gains » : le marché haussier actions entame " +
      "sa quatrième année et atteint de nouveaux records malgré le conflit iranien et les " +
      "perturbations record de l'offre énergétique — une résilience que la banque juge fragile. " +
      "Risques identifiés : des bénéfices qui pourraient décevoir par rapport à ce que les " +
      "marchés anticipent, et une récession américaine plus profonde que prévu qui mettrait fin " +
      "au cycle haussier. Recommandations : solutions structurées à protection du capital, fonds " +
      "actions américaines couverts en devises, rééquilibrage hors des méga-capitalisations " +
      "américaines vers d'autres régions et le style value/mid-small caps, positionnement sur " +
      "les régions et secteurs délaissés, fonds défensifs à faible volatilité, hedge funds " +
      "actions et fonds alternatifs UCITS, matières premières et autres actifs réels.\n\n" +
      "Deuxième thème, « Beyond algorithms, the new AI frontiers » : la dispersion entre " +
      "gagnants et perdants de la disruption par l'IA s'est fortement creusée depuis janvier — " +
      "fabricants de puces mémoire, robots humanoïdes et infrastructure électrique ont progressé " +
      "de 26 % à 184 %, tandis que les éditeurs de logiciels SaaS, menacés par les nouveaux " +
      "outils de codage IA (Claude Code, d'Anthropic, est cité nommément), ont perdu 24 % depuis " +
      "novembre 2025. Conclusion : un indice technologique large comme le Nasdaq 100 devient un " +
      "véhicule de plus en plus inefficace pour capter le thème IA, qui exige une exposition " +
      "ciblée. Risques : adoption et monétisation plus lentes que prévu, retours décevants sur " +
      "l'investissement massif des hyperscalers, réduction des budgets IA en cas de récession, " +
      "sécurité devenant un enjeu croissant de tout l'écosystème. Recommandations : production, " +
      "transport et stockage d'électricité, nucléaire, puces haut de gamme, métaux et matériaux " +
      "spéciaux (cuivre, lithium, aluminium, titane, terres rares), refroidissement et " +
      "technologies liées à l'eau, cybersécurité, robotique et IA agentique en santé et finance.\n\n" +
      "Troisième thème, « Welcome to the new age of scarcity » : les restrictions du trafic " +
      "maritime dans le détroit d'Ormuz ont provoqué pénuries et hausses de prix sur l'énergie, " +
      "les engrais, le soufre, l'hélium et les métaux industriels stratégiques — et même une " +
      "réouverture rapide laisserait des tensions d'approvisionnement pendant plusieurs mois. " +
      "Malgré la forte performance des matières premières depuis 2022 (l'indice pondéré à parts " +
      "égales Bloomberg a gagné 74 % en dollars, contre des obligations mondiales globalement " +
      "négatives même coupons compris), la banque juge la plupart des investisseurs encore " +
      "sous-exposés à cette classe d'actifs sensible à la géopolitique.\n\n" +
      "Quatrième thème, « Infrastructure is the backbone of the modern economy » : quatre " +
      "mégatendances soutiennent l'investissement en infrastructure — sécurité énergétique en " +
      "Europe et en Asie, électrification progressive de l'économie mondiale, besoins croissants " +
      "de la digitalisation, croissance structurelle du transport aérien et ferroviaire —, " +
      "auxquelles s'ajoute le besoin urgent de reconstruction en Ukraine et au Moyen-Orient. " +
      "Risques : le niveau d'endettement des États pourrait limiter les dépenses, et la classe " +
      "d'actifs reste sensible à l'inflation et aux hausses de taux.",
    highlights: [
      "Le marché haussier actions entre dans sa quatrième année malgré le conflit iranien et les perturbations record de l'offre énergétique — résilient, mais jugé fragile.",
      "Dispersion IA : puces mémoire, robots humanoïdes et infrastructure électrique ont gagné 26 % à 184 % depuis janvier, contre -24 % pour les éditeurs SaaS menacés par les outils de codage IA.",
      "La fermeture du détroit d'Ormuz a provoqué pénuries et hausses de prix sur l'énergie, les engrais, le soufre, l'hélium et les métaux stratégiques — des tensions qui persisteront plusieurs mois même après une réouverture rapide.",
      "L'indice de matières premières pondéré à parts égales de Bloomberg a gagné 74 % en dollars depuis les points bas post-Covid, contre des obligations mondiales globalement négatives même coupons compris.",
      "Quatre mégatendances soutiennent l'infrastructure : sécurité énergétique, électrification, digitalisation, croissance du transport aérien et ferroviaire — plus la reconstruction de l'Ukraine et du Moyen-Orient.",
      "Un indice technologique large comme le Nasdaq 100 devient un véhicule de plus en plus inefficace pour capter le thème IA, qui exige une exposition ciblée sur les sous-thèmes gagnants.",
    ],
    driverRefs: ["iran", "ai"],
    trendRefs: ["prime-risque-permanente", "capex-ia-benefices"],
    sourceUrl:
      "https://wealthmanagement.bnpparibas/content/dam/wmpublicsite/global/pdfs/en/june-2026/BNPP_INVEST_THEMES_2026_brochureEN_version%20courte.pdf",
  },
  {
    id: "citi-q3-2026",
    bank: "Citi Wealth",
    bankMonogram: "Citi",
    title: "The Short and Long: 2026 Q3 Macro Investment View",
    // Un rendez-vous trimestriel, pas mi-annuel : le libellé suit le document plutôt que de
    // forcer le format des autres outlooks.
    periodCovered: "Q3 2026",
    // Aucune date de publication explicite ; « as of July 7, 2026 » revient sur plusieurs
    // graphiques, la donnée la plus récente citée dans le document.
    publishedAt: "2026-07-07",
    summary:
      "Citi Wealth publie « The Short and Long », sa lecture macro du troisième trimestre 2026, " +
      "sous la plume de sa Chief Investment Officer Kate Moore. Le message d'ouverture pose le " +
      "cadre : un horizon à dix ans n'est en pratique qu'une succession de régimes de marché de " +
      "court terme, et de nombreux cadres d'allocation stratégique restent calibrés pour un monde " +
      "d'inflation contenue et de corrélations stables qui n'existe plus. D'où la philosophie des " +
      "« 3 D » — Discipline, Diversification, Dynamisme — qui gouverne l'allocation tactique de " +
      "la banque.\n\n" +
      "Trois constats structurent la vue pour le second semestre. D'abord, la croissance mondiale " +
      "reste résiliente : malgré la fermeture temporaire du détroit d'Ormuz et le conflit au " +
      "Moyen-Orient, l'industrie manufacturière mondiale a progressé plus vite en juin qu'en " +
      "février, avant le début du conflit. Ensuite, le cycle d'investissement continue de se " +
      "renforcer, porté par la technologie liée à l'IA, les chaînes d'approvisionnement associées " +
      "et les infrastructures critiques — ce qui conduit Citi à ajouter la cybersécurité comme " +
      "nouveau thème d'investissement ce trimestre. Enfin, malgré un repricing marqué de la " +
      "politique monétaire, la hausse des taux n'a pas déstabilisé les actifs risqués : les " +
      "marchés ont choisi à plusieurs reprises de regarder au-delà des inquiétudes liées aux " +
      "taux, à la géopolitique et à la croissance.\n\n" +
      "Sur le front macro, l'inflation cœur des économies avancées est restée globalement " +
      "contenue malgré la flambée des prix du pétrole, sans signe de propagation au-delà de " +
      "l'énergie. La Fed, sous la présidence de son nouveau président Kevin Warsh, a réaffirmé " +
      "sans ambiguïté son engagement envers la stabilité des prix ; Citi juge sa prochaine " +
      "décision plus probablement une hausse qu'une baisse, sans l'anticiper à court terme, et " +
      "maintient une vue de taux « plus élevés plus longtemps ». Aux États-Unis, les marges " +
      "bénéficiaires des entreprises non financières sont à leur plus haut niveau en 60 ans, " +
      "l'emploi salarié a progressé de 92 000 postes par mois au premier semestre et les " +
      "commandes de biens d'équipement de base ont bondi de 15 %. Les entreprises américaines " +
      "financent l'essentiel de leur capex sur leurs flux de trésorerie internes — un surplus " +
      "annualisé de 635 milliards de dollars au premier trimestre, contre un déficit de " +
      "financement représentant 6,4 % de la production du secteur lors de la bulle internet de " +
      "2000. En zone euro, le resserrement des conditions de crédit bancaire pèse davantage, " +
      "faute d'un accès aux marchés de capitaux aussi développé. En Asie émergente, la croissance " +
      "sud-coréenne et taïwanaise a nettement accéléré, portée par les exportations liées à " +
      "l'IA, avec des révisions de croissance 2026 nettement positives pour Taïwan, Hong Kong et " +
      "la Corée du Sud, à l'inverse des révisions négatives pour les économies avancées.\n\n" +
      "Le thème mis en avant ce trimestre est la cybersécurité, prolongement de la thèse de " +
      "résilience de la banque vers la défense numérique. L'IA augmente simultanément la valeur " +
      "de ce qui doit être protégé et abaisse le coût des attaques : selon CrowdStrike, les " +
      "attaques assistées par IA ont bondi de 89 % en 2025, le temps de propagation d'une machine " +
      "compromise à d'autres systèmes est tombé à 29 minutes, et 82 % des intrusions détectées " +
      "n'impliquaient aucun logiciel malveillant. La part de la cybersécurité dans les budgets " +
      "logiciels d'entreprise est passée de 4,8 % en 2011 à 10,6 % en 2025. Citi juge la prime de " +
      "valorisation du secteur justifiée par la durabilité de cette dépense, avec trois risques : " +
      "ralentissement de la consommation cloud, ralentissement des revenus récurrents des plus " +
      "grandes plateformes dont les valorisations laissent peu de marge à la déception, et " +
      "concurrence des hyperscalers qui intègrent la sécurité directement dans leurs offres " +
      "cloud.\n\n" +
      "Second thème réaffirmé, les matières premières comme diversificateur de moyen terme : Citi " +
      "voit dans leur récent repli une opportunité d'entrée plutôt qu'une raison d'abandonner la " +
      "thèse, les indices diversifiés affichant historiquement une corrélation positive aux " +
      "actions en période de croissance forte et négative en période de ralentissement — un " +
      "profil inverse de celui des obligations en régime de forte inflation. La banque a réduit " +
      "tactiquement son exposition aux mines de cuivre avant le conflit au Moyen-Orient, sorti sa " +
      "position sur les valeurs énergétiques après le rallye géopolitique, et réduit son " +
      "exposition aux actions brésiliennes avant les élections, tout en maintenant l'or comme " +
      "socle du portefeuille.\n\n" +
      "Sur le positionnement, Citi maintient une surpondération des grandes capitalisations " +
      "américaines en actions, une sous-pondération de la duration longue en obligations, une " +
      "orientation vers le crédit de meilleure qualité, et recommande l'or face à une corrélation " +
      "actions-obligations devenue moins fiable depuis la pandémie. Risques identifiés : une " +
      "saison de résultats où des dépenses IA plus timides pèseraient sur les bénéficiaires du " +
      "capex, une résurgence de pressions inflationnistes plus larges qui produirait un " +
      "environnement de stagflation difficile pour les actions comme pour les obligations, et " +
      "l'incertitude politique — élections de mi-mandat américaines, changement de premier " +
      "ministre au Royaume-Uni, élection générale serrée au Brésil.",
    highlights: [
      "Malgré la fermeture du détroit d'Ormuz et le conflit au Moyen-Orient, l'industrie manufacturière mondiale a progressé plus vite en juin qu'en février, avant le début du conflit.",
      "Nouveau thème d'investissement : la cybersécurité — l'IA augmente la valeur de ce qui doit être protégé tout en abaissant le coût des attaques, qui ont bondi de 89 % en 2025 selon CrowdStrike.",
      "La Fed, sous son nouveau président Kevin Warsh, juge sa prochaine décision plus probablement une hausse qu'une baisse ; Citi maintient une vue de taux « plus élevés plus longtemps ».",
      "Les entreprises américaines financent leur capex sur leurs flux internes avec un surplus de 635 milliards de dollars au T1 2026, contre un déficit de financement de 6,4 % de la production en 2000.",
      "La croissance sud-coréenne et taïwanaise accélère nettement, portée par les exportations liées à l'IA — les révisions de croissance 2026 sont positives pour l'Asie du Nord, négatives pour les économies avancées.",
      "Portefeuille : surpondération des grandes capitalisations américaines, sous-pondération de la duration longue, montée en qualité sur le crédit, et l'or comme socle face à une corrélation actions-obligations moins fiable.",
    ],
    driverRefs: ["iran", "rates", "ai"],
    trendRefs: ["prime-risque-permanente", "desinflation-terminee", "capex-ia-benefices"],
    sourceUrl: "https://www.docs.citi.com/WealthOCIO/2026Q3Report.pdf",
  },
  {
    id: "morganstanley-mid-2026",
    bank: "Morgan Stanley",
    bankMonogram: "MS",
    title: "Investment Outlook: Midyear 2026",
    periodCovered: "Mid-year 2026",
    // Aucune date de publication explicite ; le 12 mai 2026 est la date la plus précise citée
    // dans le texte (niveau du S&P 500 servant de base à l'objectif à 12 mois).
    publishedAt: "2026-05-12",
    summary:
      "Morgan Stanley publie son Investment Outlook mi-année 2026 sous la plume de sa Chief " +
      "Cross-Asset Strategist Serena Tang : à l'approche de la moitié de l'année, l'incertitude " +
      "reste élevée, portée par les tensions géopolitiques — les prix du pétrole et la durée des " +
      "perturbations d'approvisionnement liées au conflit iranien demeurent le facteur clé de " +
      "l'évolution de l'économie et des marchés financiers. En contrepoids, la hausse des " +
      "investissements en infrastructure d'intelligence artificielle continue de soutenir la " +
      "plupart des classes d'actifs. La maison recommande une surpondération des actions, une " +
      "sous-pondération de l'obligataire cœur et une pondération neutre sur le reste de " +
      "l'obligataire, les matières premières et le cash. Message central : « être constructif, " +
      "pas complaisant » — l'IA soutient les bénéfices, mais peut aussi peser sur le crédit.\n\n" +
      "Sur les actions, Morgan Stanley Research relève son objectif de fin d'année pour le " +
      "S&P 500 à 8 000 points (contre 7 800 précédemment), avec une cible mi-2027 à 8 300 " +
      "points — soit une progression de 12 % par rapport au niveau de 7 400 points du 12 mai " +
      "2026. Les résultats du premier trimestre ont dépassé les attentes de 6 %, le meilleur " +
      "taux de surprise en quatre ans, porté par un effet de levier opérationnel positif, un " +
      "pouvoir de fixation des prix amélioré et les premiers bénéfices tirés de l'adoption de " +
      "l'IA. Secteurs américains privilégiés : industrie, hyperscalers, financières et " +
      "consommation discrétionnaire. Les actions européennes et japonaises devraient aussi " +
      "profiter de l'amélioration des bénéfices, avec un MSCI Europe attendu en hausse de 11 % " +
      "et un TOPIX japonais de 12 % d'ici mi-2027. Le principal risque à cette vue constructive " +
      "serait une accélération de l'inflation à un niveau que la Fed ne pourrait ignorer, " +
      "entraînant un resserrement des conditions de liquidité.\n\n" +
      "Sur le crédit, le marché devrait sous-performer les autres classes d'actifs à mesure que " +
      "les entreprises émettent davantage de dette pour financer leurs investissements liés à " +
      "l'IA, en particulier parmi les émetteurs américains de qualité. Il y a un an, Morgan " +
      "Stanley Research anticipait un capex combiné de 450 milliards de dollars pour les cinq " +
      "plus grandes technologiques américaines, à la fois pour 2026 et pour 2027 ; après les " +
      "résultats et conférences du premier trimestre, ces estimations ont bondi à environ 800 " +
      "milliards de dollars pour 2026 et 1 160 milliards pour 2027.\n\n" +
      "Sur les obligations souveraines, une économie américaine stable — ralentissement sans " +
      "récession — devrait soutenir la demande de Treasuries, mais l'incertitude sur les prix " +
      "du pétrole et une offre plus abondante interrogent sur la durée de leur performance " +
      "positive. Les obligations souveraines européennes devraient surperformer les Treasuries " +
      "américaines, les économistes de la banque anticipant un passage à vide de la croissance " +
      "et une désinflation en zone euro.\n\n" +
      "Sur le dollar, la faiblesse devrait persister au second semestre à mesure que l'inflation " +
      "cœur américaine ralentit, que les anticipations de hausses de taux reculent et que " +
      "l'appétit pour le risque reste soutenu ; un point bas et un début de reprise sont " +
      "attendus pour 2027, une croissance américaine plus forte devant attirer davantage de " +
      "capitaux, tandis que l'élection présidentielle française du printemps prochain pourrait " +
      "raviver le risque politique en Europe et peser sur l'euro.\n\n" +
      "Sur le pétrole, le conflit iranien et ses implications pour la politique des banques " +
      "centrales, les prix de l'énergie et les devises restent centraux pour les matières " +
      "premières. Dans le scénario central de Morgan Stanley, les exportations via le détroit " +
      "d'Ormuz commencent à se rétablir début juin, mais des difficultés logistiques et " +
      "opérationnelles devraient maintenir le marché pétrolier tendu jusqu'au quatrième " +
      "trimestre, avec des prix du pétrole et du gaz naturel plus élevés. L'or, qui a " +
      "sous-performé les autres classes d'actifs depuis le début du conflit, pourrait se " +
      "redresser à mesure que les banques centrales et les ETF reprennent leurs achats " +
      "physiques et que le marché intègre des taux de la Fed plus bas.",
    highlights: [
      "S&P 500 : objectif de fin d'année relevé à 8 000 points, cible mi-2027 à 8 300 — soit +12 % par rapport au niveau du 12 mai 2026, porté par des résultats du T1 en hausse de 6 % au-dessus des attentes.",
      "Le capex combiné des cinq plus grandes technologiques américaines, anticipé à 450 milliards de dollars il y a un an pour 2026 et 2027, a bondi à environ 800 milliards pour 2026 et 1 160 milliards pour 2027.",
      "Le crédit devrait sous-performer à mesure que les entreprises émettent davantage de dette pour financer leurs investissements IA — l'IA soutient les bénéfices mais pèse sur le crédit.",
      "Le dollar devrait rester faible au second semestre avant un point bas et une reprise en 2027 ; l'élection présidentielle française du printemps prochain pourrait peser sur l'euro.",
      "Scénario central : les exportations via le détroit d'Ormuz commencent à se rétablir début juin, mais le marché pétrolier reste tendu jusqu'au T4 2026, avec des prix du pétrole et du gaz plus élevés.",
      "Allocation recommandée : surpondération des actions, sous-pondération de l'obligataire cœur, pondération neutre sur le reste de l'obligataire, les matières premières et le cash.",
    ],
    driverRefs: ["iran", "rates", "ai"],
    trendRefs: ["prime-risque-permanente", "capex-ia-benefices"],
    sourceUrl: "https://www.morganstanley.com/insights/articles/investment-outlook-midyear-2026",
  },
];
