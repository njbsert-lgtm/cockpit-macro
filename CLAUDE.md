# Cockpit Macro — cahier des charges

## Ce qu'on construit

Un tableau de bord macroéconomique et géopolitique personnel, consultable sur mobile et desktop.
Objectif : suivre les données macro par zone, la performance des classes d'actifs, et tenir un
journal de notes analytiques dont l'historique s'accumule.

Ce n'est **pas** un terminal de trading, ni un agrégateur de news. Un chiffre par jour suffit.
La valeur est dans l'interprétation, pas dans la fraîcheur à la seconde.

## Principe directeur

Deux natures de contenu, à ne jamais mélanger dans le code :

| | Origine | Fréquence | Stockage |
|---|---|---|---|
| **Données** | APIs publiques | Automatique, 1×/jour | Base de données |
| **Analyse** | Écrite à la main, assistée | À l'événement | Fichiers MDX versionnés |

Si l'automatisation des données casse, l'analyse doit rester lisible et le site utilisable.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** — pas de librairie de composants, le design est spécifique
- **Vercel** pour l'hébergement et les cron jobs
- **Supabase** (Postgres) pour les séries de données et l'historique
- **MDX** pour les notes, versionnées dans le repo
- **Zod** pour valider toute réponse d'API externe avant insertion
- **Recharts** pour les graphiques de séries, rien de plus lourd

Pas d'authentification en v1 : protection par mot de passe Vercel.

---

## Carcasse de l'application

### Quatre onglets

Barre d'onglets en bas sur mobile, horizontale en haut sur desktop. Jamais de hamburger.

| Onglet | Question | Fréquence |
|---|---|---|
| **Notes** *(défaut)* | Que s'est-il passé et qu'est-ce que ça implique ? | Quotidienne |
| **Macro** | Où en sont les économies ? | Hebdomadaire |
| **Marchés** | Où en sont les prix ? | Quotidienne |
| **Veille** | Qu'est-ce que je dois trier ? | Quotidienne |

L'onglet Veille existe dès l'étape 1 mais reste désactivé jusqu'à l'étape 5. La place est
réservée : ajouter un onglet plus tard, c'est refaire la navigation.

### La barre persistante

Visible sur tous les écrans, elle contient exactement deux choses :

1. **Le sélecteur de zone** — contexte global, une seule zone à la fois.
   Il pilote simultanément Macro (quels indicateurs), Marchés (quels instruments remontent)
   et Notes (quelles notes et quels passages sont mis en avant).
2. **L'indicateur de fraîcheur** — point coloré + date. Vert sous 24 h, ambre entre 24 et 48 h,
   rouge au-delà. Cliquable pour voir le détail par source.

L'état complet est dans l'URL : `?zone=fr`. Toute vue est partageable et rechargeable.

---

## Onglet 1 — Notes

C'est le cœur du produit et l'écran d'accueil.

### Structure en trois couches

**Couche 1 — Les drivers, en-tête permanent.**
Le régime en une phrase, puis trois à cinq **cartes de driver**. Chaque carte affiche la
question posée, la branche actuellement dominante, et la date de dernière révision.
C'est ce qu'on lit en dix secondes, et c'est le point d'entrée de toute la navigation :
un clic sur une carte ouvre la page du driver avec son arbre de scénarios et sa trajectoire.

Les cartes de driver sont **empilées en pleine largeur**, pas en rangée horizontale : chacune
porte une question, une branche dominante et une date, ce qui est trop de texte pour une
vignette étroite. Le défilement horizontal est réservé à l'étagère des notes, où l'ordre
chronologique rend le geste naturel.

Les cartes sont ordonnées par **intensité courante** — le driver qui explique le plus des
mouvements récents en premier. Cet ordre est fixé à la main dans le frontmatter de la note,
pas calculé : c'est un jugement, et il doit se voir.

**Couche 2 — L'étagère des notes récentes.**
Une rangée horizontale de cartes, les plus récentes à gauche, qui défile vers la droite.
Quatre à six notes maximum : c'est une étagère de fraîcheur, pas une archive.

- L'en-tête de la rangée affiche **« Notes › »** et est **entièrement cliquable** : il ouvre
  la page d'archive. Le chevron seul est une cible trop petite au pouce.
- Chaque carte : le type (hebdo ou spéciale), la semaine ISO, la date, la phrase de régime,
  et les drivers touchés en pastilles. Un clic ouvre la note en pleine page.
- Les notes spéciales sont visuellement distinctes — ce sont des exceptions, ça doit se voir
  sans lire l'étiquette.
- **Largeur de carte à 78 % de la fenêtre sur mobile**, pour que la suivante dépasse
  visiblement du bord. Sans ce débord, l'utilisateur ne devine pas que ça défile.
- `scroll-snap-type: x mandatory`, défilement natif, aucun JavaScript de défilement.
- Sur desktop, pas de carrousel : une grille de quatre cartes. Le défilement horizontal est
  une contrainte de petit écran, pas un parti pris esthétique.
- Balisage en `<ul>` / `<li>` avec un `aria-label` explicite : c'est une liste, pas un décor.

**L'archive ne figure pas sur cet écran.** Elle a sa propre page, `/notes`.

**Page `/notes` — L'archive.**
Liste complète, notes hebdomadaires en colonne vertébrale, spéciales indentées sous leur
semaine. Filtrable par zone, par période, par type et **par driver**. Les semaines sans note
hebdomadaire y apparaissent comme des trous explicites.

**Couche 3 — Les tendances de fond.**
Index thématique, accessible depuis l'en-tête. Ce qu'on consulte une fois par mois, pas
tous les jours — donc en troisième position, jamais en avant.

### Drivers et tendances : deux objets distincts

À ne surtout pas fusionner dans le modèle de données.

| | Driver | Tendance de fond |
|---|---|---|
| Nature | Incertitude active | Direction déjà établie |
| Forme | Bifurque en 3 branches | A un statut et une trajectoire |
| Question | « Que se passe-t-il si… ? » | « Qu'est-ce qui est durablement vrai ? » |
| Horizon | Trimestres | Années |
| Exemple | La Fed monte-t-elle ses taux ? | La désinflation est terminée |
| Révision | À chaque bascule de vraisemblance | À chaque changement de statut |

**Le lien entre les deux est explicite et bidirectionnel** : chaque tendance liste les drivers
qui pourraient l'invalider, chaque driver liste les tendances qu'il alimente. C'est ce qui
permet de répondre à « si la Fed monte, laquelle de mes convictions longues tombe ? ».

### Ce qui rend une note analytique et non descriptive

Une note n'est pas un résumé de l'actualité. Elle a une **structure obligatoire** dont
chaque bloc force un jugement. Le gabarit MDX doit refuser de compiler si un bloc manque.

1. **Ce qui a changé depuis la dernière note.** Pas ce qui s'est passé — ce qui a changé
   dans la lecture. Si rien n'a changé, l'écrire : « rien n'a modifié la thèse cette semaine »
   est une information de premier ordre.
2. **Ce qui s'est confirmé.** Les hypothèses que les données ont validées. Sans ce bloc,
   on ne retient que les surprises et on surestime le changement.
3. **Révision des scénarios.** Pour chaque famille, la vraisemblance a-t-elle bougé, et
   pourquoi ? Une révision sans justification écrite est interdite.
4. **Ce que j'avais mal lu.** Bloc obligatoire, même vide. C'est ce qui transforme l'archive
   en instrument d'apprentissage plutôt qu'en pile de notes.
5. **Ce que je surveille d'ici la prochaine note.** Trois éléments maximum, chacun avec
   le signal précis qui le validerait ou l'invaliderait.

Les nouvelles individuelles sont des **pièces à conviction** citées à l'intérieur de ces blocs,
pas des sections autonomes. Une nouvelle qui ne sert aucun des cinq blocs ne rentre pas.

### Cadence : hebdomadaire fixe + notes spéciales

**La note hebdomadaire est le squelette.** Elle paraît le dimanche soir, qu'il se soit passé
quelque chose ou non. Une semaine sans note est un trou dans l'archive, et l'archive n'a de
valeur que si elle est continue. Une semaine où rien n'a bougé produit une note courte qui
le dit : c'est une information, pas un échec.

**La note spéciale est l'exception, et doit le rester.** Si on en publie une par semaine,
la distinction meurt et le hebdo devient du remplissage. Le déclenchement est donc soumis à
des **seuils objectifs**, écrits dans la configuration, pas à une impression.

| Instrument / événement | Seuil | Fenêtre |
|---|---|---|
| **Actions** — Nasdaq 100, S&P 500, Euro Stoxx 50, FTSE 100, CAC 40, Nikkei 225, Hang Seng | ±3,0 % *(300 bps)* | 2 séances glissantes |
| **US 10 ans** | ±40 bps | 1 semaine |
| **Spread US 10 ans − Bund 10 ans** | ±30 bps | 2 séances glissantes |
| **Spread OAT 10 ans − Bund 10 ans** | ±30 bps | 2 séances glissantes |
| **EUR/USD** | ±3,0 % *(300 bps ≈ 345 pips au niveau actuel)* | 2 séances glissantes |
| **Brent** | ±8 % | 2 séances glissantes |
| **Inflation sous-jacente publiée** | écart ≥ 0,3 pt au consensus | à la publication |
| **Banque centrale majeure** | décision non anticipée ou changement de biais explicite | à l'annonce |
| **Scénarios** | bascule de la branche dominante d'un driver | à la révision |
| **Géopolitique** | modification d'un flux physique : fermeture, embargo appliqué, saisie | à l'événement |

Au moins un seuil franchi, sinon ça attend le dimanche. Le seuil déclenché est enregistré dans
le champ `trigger` et affiché sur la note : le lecteur doit savoir pourquoi elle existe.

### Le moteur d'alertes — règles d'implémentation

Ces cinq règles décident si l'outil est utilisable ou s'il devient une machine à notifier.

1. **Calcul sur les clôtures uniquement.** Jamais d'intraday : le bruit de séance déclencherait
   des alertes qui s'annulent avant la fin de la journée. Une règle a besoin des trois dernières
   clôtures valides ; si l'une manque, la règle ne s'évalue pas et le journalise.
2. **Fenêtre glissante cumulée.** « 2 séances » signifie la variation entre la clôture du jour
   et celle de l'avant-veille. Un mouvement de 3 % en une seule séance est donc capté aussi,
   sans règle supplémentaire.
3. **Période de silence après déclenchement.** Une règle qui vient de se déclencher est muette
   pendant 5 séances, sauf si le seuil est franchi une seconde fois en sens inverse ou si le
   mouvement atteint le double du seuil. Sans ça, une tendance soutenue déclenche tous les jours.
4. **Le sens est enregistré, pas seulement l'amplitude.** Un écartement de spread et un
   resserrement de spread disent des choses opposées. Stocker `direction` et l'afficher.
5. **L'alerte notifie, elle ne rédige pas.** Elle ouvre un brouillon de note spéciale
   pré-rempli avec le seuil franchi, les valeurs concernées et les instruments liés.
   La décision de publier reste humaine — une alerte peut se révéler être du bruit.

**Lire les deux spreads correctement.** Ils mesurent des choses différentes et l'interface doit
les nommer distinctement, sans quoi l'alerte sera mal interprétée :
- **US 10 ans − Bund** : divergence de politique monétaire et de croissance entre les deux blocs.
  Pilote l'EUR/USD et les flux de capitaux transatlantiques.
- **OAT − Bund** : prime de risque souverain français. Un écartement est un signal de défiance
  budgétaire ou politique, pas de divergence de croissance.

### Comment les deux types s'articulent

C'est la subtilité à ne pas rater dans le code.

- **Le bloc « ce qui a changé » d'une hebdo se compare à la hebdo précédente**, jamais à la
  dernière spéciale. Sinon le fil hebdomadaire se rompt et l'archive devient illisible.
- **Une spéciale se compare à la dernière note, quelle qu'elle soit.** C'est un delta à chaud.
- **La hebdo suivante consolide les spéciales de la semaine** dans un bloc supplémentaire :
  ce que les notes spéciales ont établi, et ce qui, avec le recul de quelques jours,
  s'est révélé être du bruit. Ce bloc est l'antidote à la réaction à chaud.

**Structure allégée pour les spéciales.** Exiger « ce que j'avais mal lu » trente minutes après
un choc n'a aucun sens. Une spéciale ne requiert que trois blocs : ce qui a changé, la révision
des scénarios avec justification, ce que je surveille. Les cinq blocs complets restent
obligatoires pour les hebdos.

### Identification et archive

Numérotation par semaine ISO : `2026-S33` pour l'hebdo, `2026-S33-E1` et `2026-S33-E2` pour les
spéciales de cette semaine. L'archive présente les hebdos comme colonne vertébrale, avec les
spéciales indentées sous la semaine à laquelle elles appartiennent.

Si une semaine n'a pas d'hebdo, l'archive affiche explicitement le trou plutôt que de refermer
la liste. Une discipline rompue doit être visible.



Une tendance de fond est un objet persistant qui traverse les notes, pas un paragraphe.

Chaque tendance a un statut affiché : **se renforce · se maintient · s'affaiblit · invalidée**.
Sur la page d'une tendance, on voit la chronologie de tous les passages de notes qui l'ont
mentionnée, avec les changements de statut. C'est ce qui permet de voir, en un écran, si votre
lecture de long terme tient depuis six mois ou si elle s'est érodée sans que vous le remarquiez.

Dans une note, les passages qui touchent une tendance de fond sont visuellement marqués et
cliquables vers la page de la tendance.

### Scénarios : un arbre par driver

Un driver, une question, trois branches. Les scénarios n'existent jamais seuls : ils sont
toujours la réponse à la question d'un driver.

| Driver | Question | Branches |
|---|---|---|
| **Taux directeurs** | La Fed reprend-elle son cycle de hausse ? | Hausse · Statu quo prolongé · Retour aux baisses |
| **Conflit iranien** | Ormuz rouvre-t-il ? | Fin du conflit · Enlisement · Durcissement |
| **Cycle IA** | Les profits justifient-ils le capex ? | Profits et capex accélèrent · Profits tiennent, capex plafonne · Profits déçoivent |

Chaque branche : la thèse, la grille d'impacts par classe d'actifs (direction + explication),
les signaux de confirmation ou d'alerte.

### La page d'un driver

Un clic sur une carte de driver ouvre une page qui contient, dans cet ordre :

1. La question et la branche dominante actuelle
2. Les trois branches, comparables côte à côte sur desktop, en onglets sur mobile
3. La **trajectoire** — comment la vraisemblance de chaque branche a évolué dans le temps
4. Les **instruments qu'il pilote**, avec leur valeur du jour et leurs alertes actives
5. Les **tendances de fond** qu'il alimente ou pourrait invalider
6. Les **passages de notes** qui l'ont révisé, du plus récent au plus ancien

C'est la page qui répond à « qu'est-ce qui fait bouger le marché en ce moment, et qu'est-ce
qui se passe selon comment ça tourne ».

### Versionnement

**Les scénarios sont versionnés.** Chaque révision crée une version datée liée à la note qui
l'a produite. Deux vues :
- **État courant** — ce que je pense aujourd'hui
- **Trajectoire** — comment la vraisemblance de chaque branche a évolué dans le temps

C'est la vue Trajectoire qui a le plus de valeur analytique : elle montre si vous avez suivi
les données ou couru derrière les prix.

---

## Onglet 2 — Macro

Les indicateurs économiques, filtrés par le sélecteur de zone.

### Indicateurs suivis, par zone

Inflation totale et sous-jacente · Croissance du PIB · Taux de chômage · Taux directeur ·
PMI composite · Salaires · Solde budgétaire · Dette publique rapportée au PIB ·
Balance courante.

Zones : États-Unis · Zone euro · France · Allemagne · Espagne · Italie · Royaume-Uni ·
Japon · Chine · Inde · Émergents (agrégat).

### Deux modes de lecture

- **Mode zone** : tous les indicateurs d'une économie, avec pour chacun la dernière valeur,
  la variation, une série sur trois ans, et la date de publication.
- **Mode comparaison** : un indicateur, toutes les zones côte à côte. C'est là que les
  divergences de politique monétaire deviennent visibles.

Chaque indicateur affiche **la prochaine date de publication**. Savoir quand la donnée sort
compte autant que sa valeur.

---

## Onglet 3 — Marchés

La performance par classe d'actifs, en trois niveaux de profondeur.

**Niveau 1 — Les quatre classes.** Actions · Obligations · Matières premières · Devises.
Pour chacune : performance depuis le 1er janvier, sur un mois, sur un an. Un clic ouvre le
niveau 2.

**Niveau 2 — Les instruments de la classe.** Liste triable, réordonnée pour remonter les
instruments de la zone sélectionnée. Chaque ligne : valeur, perf YTD, perf 1 mois,
note éditoriale courte.

**Niveau 3 — La fiche instrument.** Graphique de la série, les performances sur plusieurs
horizons, **les drivers qui le pilotent** avec leur branche dominante — cliquables vers la
page du driver —, et **les passages de notes qui le mentionnent**, du plus
récent au plus ancien. C'est la jonction entre le prix et l'analyse :
on doit pouvoir partir d'un chiffre et remonter à ce qu'on en avait dit.

---

## Onglet 4 — Veille *(étape 5)*

File des items collectés et classés « signal », en attente de tri. Trois actions par item :
verser dans la note en cours de rédaction, archiver, ignorer. Compteur en pastille sur l'onglet.

---

## Modèle de données

```ts
type Zone =
  | 'us' | 'ez' | 'fr' | 'de' | 'uk' | 'es' | 'it'
  | 'jp' | 'cn' | 'in' | 'em' | 'global';

type AssetClass = 'equity' | 'rates' | 'commodity' | 'fx';

type Instrument = {
  id: string;                // 'spx', 'brent', 'us10y', 'eurusd'
  label: string;
  assetClass: AssetClass;
  zones: Zone[];             // pour le tri contextuel
  unit: 'index' | 'percent' | 'usd' | 'ratio';
  ytdBasis: number | null;   // clôture du 31 décembre, saisie à la main
  note: string;
};

type Observation = {
  instrumentId: string;
  date: string;
  value: number;
  source: string;
  fetchedAt: string;
};

type MacroIndicator = {
  id: string;                // 'cpi', 'gdp', 'unemployment'
  label: string;
  zone: Zone;
  unit: 'percent' | 'index' | 'level';
  frequency: 'monthly' | 'quarterly';
  seriesKey: string;         // identifiant chez la source, ex. FRED
  nextRelease: string | null;
};

type Driver = {
  id: 'rates' | 'iran' | 'ai' | string;   // extensible : de nouveaux drivers apparaîtront
  label: string;             // 'Taux directeurs'
  question: string;          // 'La Fed reprend-elle son cycle de hausse ?'
  dominantBranchId: string;  // la branche jugée la plus vraisemblable aujourd'hui
  intensityRank: number;     // ordre d'affichage, fixé à la main dans la note
  instrumentRefs: string[];  // les instruments qu'il pilote
  trendRefs: string[];       // les tendances qu'il alimente ou pourrait invalider
  zones: Zone[];
  lastRevisedAt: string;
  lastRevisedIn: string;     // slug de la note
  retiredAt: string | null;  // un driver peut cesser d'en être un ; on ne le supprime pas
};

type Trend = {
  id: string;
  title: string;
  thesis: string;
  zones: Zone[];
  assetClasses: AssetClass[];
  status: 'renforce' | 'maintient' | 'affaiblit' | 'invalidee';
  statusHistory: Array<{ date: string; status: Trend['status']; noteSlug: string; why: string }>;
  driverRefs: string[];      // les drivers qui pourraient la faire tomber
  invalidatedBy: string;     // ce qui la ferait tomber, en clair
};

type Note = {
  slug: string;              // '2026-S33' ou '2026-S33-E1'
  kind: 'hebdo' | 'speciale';
  date: string;
  isoWeek: string;           // '2026-S33', identique pour l'hebdo et ses spéciales
  parentWeek: string | null; // pour une spéciale : la hebdo de rattachement
  comparesTo: string;        // slug de la note de référence du bloc « ce qui a changé »
  trigger: string | null;    // obligatoire pour une spéciale : le seuil franchi
  regimeStatement: string;   // le régime en une phrase, à cette date
  keyIndicators: Array<{ label: string; value: string }>;
  zones: Zone[];
  // blocs MDX obligatoires — hebdo : whatChanged, whatConfirmed, scenarioRevisions,
  //   whatIGotWrong, whatIWatch, plus specialsRecap si des spéciales ont paru dans la semaine
  // blocs MDX obligatoires — spéciale : whatChanged, scenarioRevisions, whatIWatch
  driverOrder: string[];     // ordre d'intensité des drivers à cette date, jugement manuel
  trendRefs: string[];       // tendances de fond touchées
  instrumentRefs: string[];  // instruments cités
  sources: Array<{ label: string; url: string }>;
};

type AlertRule = {
  id: string;                // 'ndx-3pct', 'oat-bund-30bp'
  label: string;
  target: { kind: 'instrument'; instrumentId: string }
        | { kind: 'spread'; longLegId: string; shortLegId: string };
  measure: 'percent' | 'basisPoints';
  threshold: number;         // 3.0 pour 3 %, 30 pour 30 bps
  windowSessions: number;    // 2 ou 5
  cooldownSessions: number;  // 5 par défaut
  enabled: boolean;
};

type AlertEvent = {
  ruleId: string;
  firedAt: string;
  direction: 'up' | 'down';  // écartement ou resserrement, hausse ou baisse
  observed: number;          // valeur mesurée, ex. 3.7 ou 42
  fromValue: number;
  toValue: number;
  fromDate: string;
  toDate: string;
  status: 'nouveau' | 'promu' | 'ignore';  // promu = a donné lieu à une note spéciale
  noteSlug: string | null;
};

// Les spreads sont des instruments dérivés, calculés à l'insertion, pas à l'affichage.
// Les stocker comme des Observation à part entière permet de les grapher et de les alerter
// avec le même code que les instruments simples.
// À créer : 'spread-us10y-bund10y', 'spread-oat10y-bund10y'

type ScenarioVersion = {
  driverId: string;          // référence un Driver, jamais une chaîne libre
  branchId: string;
  version: number;
  date: string;
  noteSlug: string;       // la note qui a produit cette révision
  likelihood: 'central' | 'moderee' | 'faible';
  likelihoodChangedFrom: ScenarioVersion['likelihood'] | null;
  why: string;               // obligatoire si la vraisemblance a changé
  thesis: string;
  impacts: Record<'eq' | 'fi' | 'fx' | 'cm', {
    direction: 'up' | 'down' | 'flat';
    label: string;
    text: string;
  }>;
  watchSignals: string;
};
```

### Règle d'héritage des zones

Sélectionner `fr` doit remonter aussi les contenus taggés `ez` et `global` : une décision BCE
concerne la France même si elle n'est pas taggée `fr`. Hiérarchie à implémenter :
`fr ⊂ ez ⊂ global`, `de ⊂ ez ⊂ global`, `us ⊂ global`, `cn ⊂ em ⊂ global`.
Sans ça, le filtre France renverra presque toujours zéro résultat.

---

## Sources de données

Gratuites, en accès programmatique. Clés en variables d'environnement, jamais dans le repo.

| Donnée | Source | Note |
|---|---|---|
| Macro US, taux, inflation | **FRED API** | Gratuit, très fiable, couvre aussi de l'international |
| Macro zone euro et pays | **ECB Data Portal**, **Eurostat** | APIs publiques sans clé |
| Macro France | **INSEE** (API BDM) | Gratuit, inscription requise |
| Macro UK | **ONS API** | Gratuit, sans clé |
| Énergie | **EIA API** | Gratuit, données officielles |
| Indices actions, FX | **Financial Modeling Prep** ou **Twelve Data** | Palier gratuit limité |
| Bund et OAT 10 ans | **ECB Data Portal**, **Bundesbank**, **Banque de France** | Gratuit, sans clé |
| Métaux | **metals.dev** ou via FMP | Vérifier argent et cuivre |

Contraintes dans le code :
- **Un appel par instrument par jour.** Cron à 6 h UTC, jamais à la demande.
- Toute réponse passe par un schéma Zod. Une réponse malformée est journalisée et ignorée,
  elle n'écrase jamais la dernière valeur valide.
- Si une source tombe : dernière valeur connue **avec sa date**, pas un tiret, jamais zéro.
- Les bases YTD sont saisies à la main une fois par an dans un fichier de configuration.

---

## Veille : d'où viennent les nouvelles

### Ce qu'on ne fait pas

**Pas de scraping de Bloomberg, Reuters ou FactSet.** Leur contenu est protégé, leurs
conditions d'utilisation interdisent l'extraction automatisée, et FactSet est une licence
payante. Reformuler par un modèle ne règle pas le problème de droit d'auteur, il le déplace.
C'est aussi contre-productif : ces agences rapportent des sources primaires. En allant à la
source, on a l'information plus tôt, gratuitement, sans le cadrage narratif qui est le bruit
qu'on cherche à filtrer.

### Ce qu'on fait : les sources primaires

| Catégorie | Sources | Accès |
|---|---|---|
| Banques centrales | Fed, BCE, BoE, BoJ, Banque de France | RSS + communiqués |
| Statistiques | BLS, BEA, Eurostat, INSEE, ONS, INE, ISTAT | APIs publiques |
| Énergie | EIA, AIE, OPEP | API + rapports mensuels |
| Institutions | FMI, Banque mondiale, OCDE, BRI | APIs |
| Entreprises | SEC EDGAR, communiqués investisseurs | API EDGAR gratuite |
| Détection large | **GDELT** | Gratuit, mondial, métadonnées sans texte intégral |

### Le pipeline de tri, en trois passes

**Passe 1 — Filtre déterministe, sans IA.** Liste d'entités et de mots-clés surveillés.
Élimine 90 % du volume pour zéro euro et zéro latence.

**Passe 2 — Classification par l'API Claude.** Sortie JSON stricte :
`{ nature, markets[], zones[], horizon, channels[], isSignal, trendRefs[], reasoning }`.
La règle de tri est déjà écrite : la grille des cinq canaux de transmission (taux réel,
nature du choc, fonction de réaction, dollar, positionnement) plus le test « flux ou
déclaration ». Le modèle l'applique, il ne l'invente pas. Grille dans le prompt système.

**Passe 3 — Validation humaine.** Les items retenus alimentent la note en cours de
rédaction. Le modèle trie et met en forme ; les cinq blocs analytiques restent à vous.

### Droit d'auteur dans le code

Stocker liens et métadonnées, jamais le texte intégral. Les notes contiennent des faits
reformulés et sourcés, pas des citations longues. Un chiffre n'est pas protégeable ;
la formulation d'un journaliste l'est.

---

## Design

- Fond clair `#F2F3EF`, cartes blanches, texte `#14171C`
- Barre persistante et pied en bleu pétrole `#0E4553`, texte blanc pur
- Accents : ocre `#8A5D00` (tension), rouille `#A3382A` (risque), vert-bleu `#136055` (détente)
- **Contraste minimum 7:1 sur tout le texte de corps.** Contrainte, pas préférence.
- Inter (corps), Bricolage Grotesque (titres), IBM Plex Mono (chiffres, en `tabular-nums`)
- Élément signature : la **chaîne de transmission** en pastilles reliées par des flèches,
  horizontale sur desktop, verticale sur mobile
- Mobile d'abord. Pas d'animation décorative, pas de dégradés, coins arrondis ≤ 2 px.

## Les cinq états, à concevoir dès l'étape 1

C'est là que les applications pourrissent. Chaque écran doit avoir les cinq états dessinés
avec des données figées :

1. **Normal**
2. **Chargement** — squelettes à la forme du contenu, jamais de spinner centré
3. **Vide** — dire quoi faire, pas juste « aucun résultat »
4. **Périmé** — la donnée existe mais date : l'afficher avec sa date, en ambre
5. **Erreur** — nommer la source en cause et la dernière valeur connue

Un chiffre sans date n'est jamais affiché. Un chiffre absent n'est jamais remplacé par zéro.

---

## Ordre de construction

**Étape 1 — La carcasse, données figées.**
Next.js + Tailwind. Les quatre onglets, la barre persistante avec sélecteur de zone et
indicateur de fraîcheur, la navigation à trois niveaux de l'onglet Marchés, les scénarios
cliquables, l'étagère et l'archive des notes, et **les cinq états de chaque écran**.
Données depuis `data/seed.json`, écrit à la main. Aucune API.

Le seed contient volontairement des cas dégradés : un instrument sans valeur du jour, une
source périmée de trois jours, une zone sans note, **une semaine sans hebdo**, **une
semaine portant deux notes spéciales**, et **un historique de clôtures assez long pour
tester le moteur d'alertes** : un franchissement de seuil, un quasi-franchissement, un
franchissement en période de silence, et une série trouée par un jour férié. Sinon les états 3, 4 et 5 et l'affichage de
l'archive casseront en production.

Critère de validation : le site est déployé sur Vercel et **utilisable au pouce sur un
téléphone**. Pas « joli en capture d'écran ».

**Étape 2 — Le contenu éditorial.**
Objets **Driver** avec leurs cartes en en-tête de l'onglet Notes et leur page dédiée.
Notes en MDX avec frontmatter et validation des blocs obligatoires selon le type.
Objets **Tendance** avec chronologie de statuts, liés aux drivers dans les deux sens.
Scénarios versionnés, rattachés à un driver, avec la vue Trajectoire.
Migrer trois notes rétrospectives pour vérifier que l'archive et tous les liens croisés
fonctionnent — driver ↔ tendance ↔ instrument ↔ note. C'est ce maillage qui fait le produit.

**Étape 3 — Les données automatiques.**
Une source d'abord : FRED, pour les taux et l'inflation. Cron, Zod, stockage, fraîcheur.
Observer trois jours avant d'ajouter Eurostat et l'INSEE, puis l'EIA, puis actions et FX.
Les deux spreads sont calculés et stockés dès que le Bund, l'OAT et le 10 ans US sont en place :
ils ont besoin de trois clôtures d'historique avant que leurs alertes puissent s'évaluer.

**Étape 4 — Confort.**
Mode comparaison de l'onglet Macro, graphiques de séries, recherche dans l'archive,
export d'une note en PDF. **Moteur d'alertes** : une fois les données automatiques en
place, un contrôle quotidien post-clôture évalue les règles, applique la période de silence,
et ouvre un brouillon de note spéciale pré-rempli. Il notifie, il ne rédige pas.
Les règles sont dans un fichier de configuration éditable, pas en dur dans le code.

**Étape 5 — La veille.**
Passe 1 seule d'abord : collecte RSS et GDELT, filtre par mots-clés, file brute.
L'observer une semaine pour calibrer. Classification par l'API Claude ensuite.

Ne pas commencer par l'étape 3 ni par l'étape 5.

---

## Règles de travail

- Commits atomiques, messages en français, un commit par étape validée
- Tout composant affichant un chiffre affiche aussi sa date de relevé
- Aucune clé d'API dans le repo, `.env.local` dans `.gitignore` au premier commit
- Aucune donnée inventée : si une valeur manque, l'interface le dit
- Tests sur la logique de filtrage par zone, le calcul de performance YTD, la validation des
  blocs obligatoires selon le type de note, le rattachement des spéciales à leur semaine
  ISO, et **le moteur d'alertes** : franchissement de seuil, fenêtre glissante, période de
  silence, calcul des spreads, gestion des clôtures manquantes. C'est la logique la plus
  facile à casser sans s'en apercevoir. Le reste se vérifie à l'œil.

## Avertissement en pied de page

Support d'analyse personnel, pas un conseil en investissement.
