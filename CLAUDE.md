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
| **Outlook** | Qu'est-ce que les grandes banques anticipent ? | À la publication |

La veille n'a plus d'onglet : elle est un atelier interne, pas un écran qu'on consulte pour
lui-même. La file de tri vit à `/triage`, ouverte depuis un bouton compteur sur l'onglet Notes
(voir Onglet 4bis, plus bas).

### La barre persistante

Visible sur tous les écrans. Elle contient toujours l'indicateur de fraîcheur — point coloré
+ date, vert sous 24 h, ambre entre 24 et 48 h, rouge au-delà, cliquable pour voir le détail
par source.

**Le sélecteur de zone n'y figure que sur l'onglet Macro.** Ce n'est plus un contexte global
partagé par les quatre onglets : chaque onglet qui a besoin d'une notion de zone la gère lui-même.

| Onglet | Zone |
|---|---|
| **Macro** | Le sélecteur du bandeau, seul endroit où il apparaît. État dans l'URL : `?zone=fr`. |
| **Marchés** | Sa propre rangée de zones, **sur Obligations uniquement** (voir Onglet 3). Un filtre local, pas le bandeau. |
| **Notes** | Aucune notion de zone. L'écran d'accueil (`/`) et le fil (`/notes`) montrent tout. |
| **Outlook** | Sans objet. |

Changer de zone sur Macro ne touche ni Marchés ni Notes, et réciproquement : ce sont des
états indépendants, chacun dans l'URL de sa propre page, partageable et rechargeable.

---

## Onglet 1 — Notes

C'est le cœur du produit et l'écran d'accueil, à `/`.

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
Une rangée horizontale de **cartes-articles**, les plus récentes à gauche. Quatre à six notes
maximum : c'est une étagère de fraîcheur, pas un fil complet.

*Anatomie d'une carte*, du haut vers le bas :
1. Un bandeau coloré en tête de carte, dont la teinte encode le type — neutre pour une
   hebdomadaire, rouille pour une spéciale.
2. La semaine ISO et la date, en mono.
3. La phrase de régime, en gros et en gras : c'est l'accroche.
4. Deux lignes tirées du bloc « ce qui a changé », en texte simple.
5. Les drivers touchés, en pastilles.

Sans images, l'ancrage visuel est typographique : la hiérarchie de tailles doit être franche
entre ces cinq niveaux, sinon la carte se lit comme une ligne de tableau plutôt que comme un
article. La teinte du bandeau ne porte jamais l'information seule — le libellé du type reste
écrit juste en dessous.

- L'en-tête de la rangée affiche **« Notes › »** et est **entièrement cliquable** : il ouvre
  `/notes`. Le chevron seul est une cible trop petite au pouce.
- Un clic n'importe où sur une carte ouvre la note en pleine page.
- **Largeur de carte à 78 % de la fenêtre sur mobile**, pour que la suivante dépasse
  visiblement du bord. Sans ce débord, l'utilisateur ne devine pas que ça défile.
- `scroll-snap-type: x mandatory`, défilement natif, aucun JavaScript de défilement.
- Sur desktop, pas de carrousel : une grille de **trois** cartes. Le défilement horizontal
  est une contrainte de petit écran, pas un parti pris esthétique.
- Balisage en `<ul>` / `<li>` avec un `aria-label` explicite : c'est une liste, pas un décor.

**Page `/notes` — Le fil.**
Les mêmes cartes-articles, empilées en pleine largeur, de la plus récente à la plus ancienne.
Pas d'arborescence par semaine : ni colonne vertébrale d'hebdos ni spéciales indentées, un
seul fil chronologique plat. Filtrable par type et **par driver**, pas par zone — Notes n'a
pas de notion de zone. Une semaine sans note hebdomadaire apparaît comme une ligne discrète
dans le fil plutôt que de disparaître : un trou reste visible même sous un filtre, la
discipline rompue n'est pas quelque chose qu'un filtre doit pouvoir masquer.

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
4. **Ce que j'avais mal lu.** Bloc obligatoire, même vide. C'est ce qui transforme le fil
   en instrument d'apprentissage plutôt qu'en pile de notes.
5. **Ce que je surveille d'ici la prochaine note.** Trois éléments maximum, chacun avec
   le signal précis qui le validerait ou l'invaliderait.

Les nouvelles individuelles sont des **pièces à conviction** citées à l'intérieur de ces blocs,
pas des sections autonomes. Une nouvelle qui ne sert aucun des cinq blocs ne rentre pas.

**Comment un item versé depuis `/triage` devient une pièce à conviction.** Le rattachement se
fait à deux niveaux, jamais mélangés :
- `Note.veilleItemRefs` (frontmatter) est la liste versionnée, décidée par l'auteur, de tout ce
  que la note cite — pour la trajectoire et pour `LeFilDeLaSemaine`.
- `VeilleItem.attachedToBlock`, posé par l'action « Verser » de `/triage`, dit *où* dans la note
  l'item apparaît : chaque bloc affiche en pied de section les pièces qui lui sont attachées,
  résolues au rendu, après le texte rédigé — jamais avant, jamais à sa place.

Un item purgé (au-delà de quinze jours) ou une base injoignable ne casse jamais le rendu : la
pastille ou la ligne du fil disparaît, silencieusement — la note reste lisible même quand la
donnée automatique n'est plus là, exactement le principe directeur du cahier.

**Les sources se déclarent bloc par bloc, jamais pour la note entière.** `Note.sources` est une
carte « nom de bloc → sources » : on doit pouvoir savoir de quelle source vient telle
affirmation, ce qu'une liste unique en pied de note ne dit pas. La validation refuse une source
rattachée à un bloc que la note ne porte pas — elle ne s'afficherait nulle part.

### Cadence : hebdomadaire fixe + notes spéciales

**La note hebdomadaire est le squelette.** Elle paraît le dimanche soir, qu'il se soit passé
quelque chose ou non. Une semaine sans note est un trou dans le fil, et le fil n'a de valeur
que s'il est continu. Une semaine où rien n'a bougé produit une note courte qui le dit :
c'est une information, pas un échec.

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
  dernière spéciale. Sinon le fil hebdomadaire se rompt et devient illisible.
- **Une spéciale se compare à la dernière note, quelle qu'elle soit.** C'est un delta à chaud.
- **La hebdo suivante consolide les spéciales de la semaine** dans un bloc supplémentaire :
  ce que les notes spéciales ont établi, et ce qui, avec le recul de quelques jours,
  s'est révélé être du bruit. Ce bloc est l'antidote à la réaction à chaud.

**Structure allégée pour les spéciales.** Exiger « ce que j'avais mal lu » trente minutes après
un choc n'a aucun sens. Une spéciale ne requiert que trois blocs : ce qui a changé, la révision
des scénarios avec justification, ce que je surveille. Les cinq blocs complets restent
obligatoires pour les hebdos.

### Identification et continuité

Numérotation par semaine ISO : `2026-S33` pour l'hebdo, `2026-S33-E1` et `2026-S33-E2` pour les
spéciales de cette semaine. Le fil ne les groupe plus visuellement par semaine — chaque note
est sa propre carte, à sa propre date — mais l'identifiant garde la trace du rattachement :
c'est lui qui permet de détecter une semaine sans hebdo.

Si une semaine n'a pas d'hebdo, le fil l'affiche explicitement comme un trou plutôt que de la
faire disparaître. Une discipline rompue doit être visible.



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

Un clic sur un indicateur — carte en mode zone, ligne en mode comparaison — ouvre sa fiche :
la série complète en graphique et son historique en table, date par date.

---

## Onglet 3 — Marchés

La performance par classe d'actifs. **Deux rangées de filtres en haut, puis la liste** — et non
une arborescence à parcourir. Le niveau 1 et le niveau 2 sont le même écran : on change de
classe sans revenir en arrière.

### Les deux rangées de filtres

**Rangée 1 — la classe d'actifs.** Quatre boutons : Actions · Obligations · Matières
premières · Devises. **Pas d'onglet « Vue d'ensemble »** : une classe est toujours
sélectionnée, Actions par défaut. Chaque bouton ne porte que le nom de la classe — pas de
performance agrégée en dessous. Une moyenne simple des indices suivis n'est pas un chiffre
défendable : ça n'est l'indice de personne. La performance se lit instrument par instrument,
dans la liste ; pour un repère global sur les actions, la classe inclut **MSCI ACWI** —
un indice réel, investissable, plutôt qu'une moyenne fabriquée.

**Rangée 2 — la zone, sur Obligations uniquement.** Boutons à défilement horizontal,
**« Toutes » en tête et par défaut**. Une courbe souveraine appartient à un émetteur ; un
indice actions, une devise ou une matière première sont mondiaux, et les filtrer par pays
masquait une partie de la liste sans rien apprendre. Les trois autres classes n'ont donc pas
de rangée de zones du tout et affichent l'ensemble des instruments suivis. Un choix ici reste
local à Marchés ; il ne touche ni Notes ni Macro.

**Sur Obligations, choisir un pays affiche sa courbe complète** — 6 mois · 1 an · 3 ans ·
5 ans · 10 ans · 15 ans · 20 ans, du plus court au plus long — au lieu du point de repère
unique. « Toutes », « Zone euro » et « Émergents » restent sur le repère à 10 ans, un par
pays : afficher toutes les maturités des neuf pays en même temps ferait un mur de lignes, pas
une liste. `Zone euro` et `Émergents` sont des agrégats, pas des émetteurs : ils n'ont pas de
courbe qui leur soit propre, seulement celles de leurs pays membres.

**Une courbe n'a que les maturités que sa source publie.** Le Trésor américain ne cote pas de
15 ans — ses taux constants s'arrêtent à 10 puis sautent à 20 — donc la courbe US en compte
six et non sept. Aucune interpolation : un point qu'une source ne publie pas n'existe pas, et
l'inventer serait de la donnée fabriquée.

**Style des boutons.** De vrais boutons, jamais du texte en gras souligné : fond `--paper`,
bordure fine, rayon 2 px. À l'état actif, fond `--ink` et texte blanc. **Hauteur minimale
44 px** et `aria-pressed` sur chacun — le contraste inversé ne dit rien à un lecteur d'écran.

**Contraintes de largeur, à vérifier à 390 px.** Les quatre boutons de la rangée 1 tiennent
sans troncature — le libellé passe à la ligne plutôt que d'être coupé. La rangée 2 laisse
voir le bord du bouton suivant : sans ce débord, personne ne devine que ça défile.

### La liste

Chaque ligne : le libellé de l'instrument à gauche, la valeur à droite, **la performance
depuis le 1er janvier en lecture directe** sous la valeur, puis **la variation du jour dans une
pastille colorée** — fond vert pâle en hausse, rouge pâle en
baisse, neutre à plat. La couleur ne porte jamais l'information seule : le signe reste écrit.
Un clic ouvre la fiche instrument.

La variation est mesurée **entre les deux dernières clôtures**, et exprimée dans l'unité qui
se lit : **points de base pour les taux et les spreads**, pourcentage pour tout le reste. Dire
qu'un 10 ans « perd 0,5 % » n'informe personne ; « perd 2 bps » se lit immédiatement.

**Deux clôtures séparées de plus de sept jours ne se suivent plus.** Au-delà, ce n'est plus
une variation de séance mais un saut au-dessus d'un trou, et la variation n'est pas calculée.
Sept jours laissent passer un week-end prolongé par un jour férié, pas un mois d'absence.

**Quand la variation est indisponible, jamais de tiret.** La ligne affiche la dernière valeur
connue avec sa date, en ambre ou en rouge selon la fraîcheur — c'est l'état 4 ou 5 du cahier,
pas un vide. Le pourquoi est dans l'infobulle.

### L'état dans l'URL

Les deux filtres sont dans la chaîne de requête : `?classe=rates&zone=fr`. Toute vue est
partageable et rechargeable. Une valeur de `classe` inconnue retombe sur le défaut plutôt que
de produire un 404 : un paramètre d'URL se saisit à la main, il ne doit pas casser la page.

### La fiche instrument

Graphique de la série avec son **échelle de temps** — 5 ans · 3 ans · 1 an · YTD · 6 mois ·
3 mois · 1 mois · 1 semaine —, ancrée sur le dernier relevé et non sur la date du jour : une
série qui a cessé d'être publiée doit continuer à montrer son historique. La période
réellement couverte est écrite sous le graphique. Puis les performances sur plusieurs horizons, **les drivers qui le
pilotent** avec leur branche dominante — cliquables vers la page du driver —, et **les
passages de notes qui le mentionnent**, du plus récent au plus ancien. C'est la jonction entre
le prix et l'analyse : on doit pouvoir partir d'un chiffre et remonter à ce qu'on en avait dit.

---

## Onglet 4 — Outlook

Les derniers outlooks stratégiques des grandes banques privées (J.P. Morgan, Goldman Sachs,
BNP Paribas, HSBC, UBS…), condensés et reliés au maillage driver/tendance existant.

**Liste** (`/outlook`) — une carte par outlook : la banque (identité typographique, pas une
image — le design n'embarque pas de logos externes), le titre de la publication, la période
couverte (« Mid-year 2026 », un libellé humain, pas une date ISO), la date de publication.

**Détail** (`/outlook/[id]`) — le condensé, ses points majeurs, les drivers et tendances de
fond que la publication met en avant (pastilles cliquables vers leurs pages respectives), et
en dernier un lien vers le document original.

**Contenu rédigé hors de l'application, jamais scrapé.** Même principe que l'interdiction de
Bloomberg/Reuters/FactSet (§ Veille) : le condensé est produit avec l'assistance d'un modèle
en dehors du site, à partir du document original lu à la main, puis collé dans
`content/outlooks.ts` — de l'analyse versionnée, comme les notes et les tendances, pas de la
donnée automatique. Aucun outlook n'est inventé au nom d'une banque : le fichier est vide tant
que rien n'a été réellement lu, et `/outlook` l'affiche comme un état vide plutôt que de
fabriquer un exemple.

---

## Onglet 4bis — La veille, en atelier interne

Sans onglet dédié : la file de tri vit à `/triage`, ouverte depuis un bouton compteur sur
l'écran d'accueil de l'onglet Notes. Ce n'est pas un écran qu'on consulte pour lui-même, c'est
l'antichambre de la note en préparation.

File des items collectés et classés « signal », en attente de tri. Groupée par jour, les jours
de plus de trois jours repliés par défaut ; purge automatique au-delà de quinze jours.

Trois actions par item, en Server Actions écrivant avec la clé de service :
- **Verser** — l'item se rattache à l'un des cinq blocs analytiques de la note en préparation
  (`attachedToBlock`, `draftNoteSlug`) ; il devient une pièce à conviction citable dans ce bloc.
- **Archiver** ou **ignorer** — retire l'item de la file sans le rattacher à rien.

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
  // bloc MDX facultatif — hebdo uniquement, toujours en dernier : leFilDeLaSemaine,
  //   la chronologie des items de veille retenus, rendu depuis veilleItemRefs
  driverOrder: string[];     // ordre d'intensité des drivers à cette date, jugement manuel
  trendRefs: string[];       // tendances de fond touchées
  instrumentRefs: string[];  // instruments cités
  veilleItemRefs: string[];  // items de veille cités comme pièces à conviction, ou dans « Le fil de la semaine »
  // Les sources, par bloc analytique et non par note : « quelle affirmation vient d'où ».
  // Une source rattachée à un bloc absent de la note est refusée à la validation.
  sources: Partial<Record<string, Array<{ label: string; url: string }>>>;
};

// La grille des cinq canaux de transmission : un item de veille s'y rattache au même titre
// qu'à un driver, par mot-clé, en passe 1.
type VeilleChannel = 'taux-reel' | 'nature-choc' | 'fonction-reaction' | 'dollar' | 'positionnement';

// Lien et métadonnées, jamais le texte intégral (droit d'auteur). Vit en base : c'est de la
// donnée automatique, quotidienne — pas de l'analyse versionnée dans content/.
type VeilleItem = {
  id: string;                 // hash stable de (source + url) — l'upsert le rend idempotent
  title: string;
  url: string;
  source: string;             // 'GDELT' | 'Fed' | 'SEC EDGAR' | ...
  publishedAt: string;
  zones: Zone[];
  driverRefs: string[];
  channels: VeilleChannel[];
  isSignal: boolean;
  status: 'nouveau' | 'verse' | 'archive' | 'ignore';
  attachedToBlock: string | null;  // le bloc analytique auquel l'item sert de pièce à conviction
  draftNoteSlug: string | null;    // la note en préparation à laquelle l'item est promis
};

// L'outlook d'une banque privée — analyse versionnée dans content/, comme les notes et les
// tendances, jamais scrapée : condensé produit hors de l'app puis collé à la main.
type Outlook = {
  id: string;                 // 'jpmorgan-mid-2026'
  bank: string;                // 'J.P. Morgan'
  bankMonogram: string;        // 'JPM' — identité typographique, pas un logo externe
  title: string;               // 'Mid-Year Outlook 2026'
  periodCovered: string;       // libellé humain, ex. 'Mid-year 2026'
  publishedAt: string;         // date ISO, saisie à la main
  summary: string;             // le condensé, un ou plusieurs paragraphes
  highlights: string[];        // les points majeurs mis en avant, une ligne chacun
  driverRefs: string[];
  trendRefs: string[];
  sourceUrl: string;           // lien vers le document original
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
- **Un appel par instrument par jour.** Cron à 6 h UTC, jamais à la demande. Le plan Hobby
  n'autorise qu'un seul déclenchement quotidien : la route du cron est un **orchestrateur** qui
  exécute FRED puis la veille, en deux modules indépendants — jamais un second cron. FRED
  s'exécute et écrit en premier, sans exception ; la veille est enveloppée dans son propre
  `try`/`catch` pour qu'une panne ou une exception là-bas n'efface rien de ce que FRED a déjà
  produit. Chaque module journalise son résultat dans sa propre table de santé
  (`series_health` pour FRED, `veille_health` pour la veille), et seul `series_health` alimente
  l'indicateur de fraîcheur de la barre persistante — un incident de veille ne peut donc jamais
  s'y lire comme un incident FRED.
- Toute réponse passe par un schéma Zod. Une réponse malformée est journalisée et ignorée,
  elle n'écrase jamais la dernière valeur valide.
- Si une source tombe : dernière valeur connue **avec sa date**, pas un tiret, jamais zéro.
- Les bases YTD sont saisies à la main une fois par an dans un fichier de configuration.

### Ce qu'une source publie fait foi

Une série est collectée telle que sa source la publie — unité, fréquence, maturités. Quand
la source diverge de ce que le seed déclarait, **c'est la source qui a raison** et la
configuration est corrigée, jamais la donnée. Le Trésor américain ne cotant pas de 15 ans,
la courbe US en compte six ; les Fed funds sont quotidiens et non mensuels ; le solde
budgétaire fédéral est annuel et non trimestriel.

Une transformation d'unité est demandée à la source, jamais calculée chez nous : `units=pc1`
fait renvoyer un glissement annuel par FRED, ce qui transforme un indice de prix en taux
d'inflation sans coûter un second appel.

**Chaque série porte des bornes de plausibilité** dans `config/fred-series.ts`. Une valeur
en dehors fait rejeter *toute la réponse*, pas seulement le point fautif : si l'unité n'est
pas celle qu'on croit, ce n'est pas une observation qui est fausse, c'est la série entière.
Mieux vaut garder la dernière valeur valide et journaliser que stocker un indice là où on
attend un taux.

Rien ne passe en collecte automatique sans être sorti vert de `npm run fred:check`, qui
confronte les métadonnées réelles de chaque série à ce que la configuration déclare.

### Fraîcheur et retard : deux signaux à ne pas confondre

C'est ce qui décide si l'indicateur de la barre reste lisible ou devient du bruit.

**La fraîcheur** répond à « notre copie est-elle récente ? ». Elle se calcule sur la date du
relevé, jamais sur celle du chiffre, et pilote le point vert / ambre / rouge.

Le principe qui règle les week-ends, les fériés et les séries mensuelles d'un seul coup :
**re-confirmer est une écriture.** Chaque passage réécrit la dernière observation de chaque
série même quand la valeur n'a pas bougé. Un samedi, FRED renvoie la clôture de vendredi, on
la réécrit, le relevé date d'aujourd'hui : vert. Un CPI publié il y a trois semaines : vert.
**Une série qui ne bouge pas n'est jamais périmée** — seule une collecte en échec l'est.

Les paliers sont à **26 h et 50 h**, et non 24 h et 48 h : les crons du plan Hobby peuvent
tarder d'une heure, donc deux passages sains peuvent être espacés de près de 25 h. Sans cette
marge, un tuyau qui fonctionne passerait régulièrement en ambre — et un indicateur qui crie
sans raison finit par ne plus être lu.

**Le retard de publication** répond à une autre question : « la source a-t-elle cessé de
publier ? ». Il se calcule sur la date de l'observation, et il existe parce que la fraîcheur
ne le verrait pas — si FRED répond bien mais que le BLS saute une publication, notre copie
reste fraîche. Il s'affiche sur l'indicateur concerné et **ne fait jamais rougir le point de
la barre** : ce n'est pas un problème de collecte, et un point rouge pour une raison sur
laquelle le lecteur ne peut rien agir finit par être ignoré.

Le retard se compte en **jours ouvrés** pour les séries quotidiennes, avec trois jours de
tolérance. Aucun calendrier de fériés n'est maintenu — nous ne l'avons pas, et l'inventer
serait de la donnée fabriquée. Trois jours ouvrés absorbent un férié isolé comme un pont, tout
en laissant voir une source qui s'est vraiment tue.

### Repli sur le seed

Les deux sources ne se mélangent **jamais pour un même identifiant** : une série moitié base
moitié seed mentirait sur la provenance de ses points. Un instrument non couvert par une
série active lit le seed ; un instrument couvert lit la base, et retombe sur le seed si elle
est vide, en erreur ou injoignable. Le site reste utilisable sans base du tout.

Le **catalogue** d'instruments et d'indicateurs reste dans `data/seed.json` : c'est de la
configuration, pas une série temporelle, et le contrôle d'intégrité du contenu en dépend de
façon synchrone au chargement du module.

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

**Passe 1 — Filtre déterministe, sans IA.** Liste d'entités et de mots-clés surveillés
(`config/veille-taxonomy.ts`). Élimine 90 % du volume pour zéro euro et zéro latence.
Un item qui ne cite ni un mot-clé de driver ni un mot-clé d'un des cinq canaux de transmission
est écarté avant même d'être écrit — c'est ce qui rend une couverture large (GDELT en
détection large, tout le flux institutionnel) tenable sans passe 2. Pour SEC EDGAR, le
rattachement est posé en configuration plutôt que par mot-clé : un dépôt réglementaire ne cite
jamais « intelligence artificielle » dans son titre, mais l'émetteur qui l'a déposé est
déjà rattaché à un driver dans `EDGAR_TRACKED_ISSUERS`.

**Plafond quotidien.** 40 items maximum transmis à la passe 2 par jour, classés par autorité de
la source (communiqué officiel avant détection GDELT) puis par correspondance thématique
(nombre de mots-clés reconnus). Ce qui dépasse n'est simplement pas écrit ce jour-là — la
file se régénère le lendemain, elle ne rattrape pas le trop-plein. GDELT découpe sa collecte en
requêtes thème × pays traitées une à la fois, retenues par un curseur (`veille_cursor`) qui
reprend au tour suivant si le budget de temps d'un passage s'épuise avant la fin.

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

**La charte graphique vit dans [`DESIGN.md`](./DESIGN.md), qui fait seul autorité.**

Jetons, typographie, mise en page, composants, interaction : tout y est défini une fois.
Aucune valeur de couleur, de rayon, de taille ou de durée ne se décide ici ni dans un
composant. Une mesure absente de `DESIGN.md` se demande, elle ne s'improvise pas.

Deux points d'articulation avec le présent cahier, qui ne sont pas des décisions de design
et restent donc tranchés ici :

- **La largeur.** `DESIGN.md` pose une colonne unique de 520 px. Elle s'applique sur mobile ;
  le desktop garde sa largeur et ses grilles, sans quoi l'étagère à trois cartes de l'onglet
  Notes et le mode comparaison de l'onglet Macro deviendraient illisibles.
- **La règle chromatique** de `DESIGN.md` — couleurs de canal pour le contenu, vert et rouge
  pour les seuls chiffres — s'étend à l'indicateur de fraîcheur, dont le vert / ambre / rouge
  est prescrit plus haut : c'est un état de collecte, ni un chiffre ni un contenu éditorial.

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
cliquables, l'étagère et le fil des notes, et **les cinq états de chaque écran**.
Données depuis `data/seed.json`, écrit à la main. Aucune API.

Le seed contient volontairement des cas dégradés : un instrument sans valeur du jour, une
source périmée de trois jours, une combinaison classe d'actifs / zone sans instrument
(Marchés), **une semaine sans hebdo**, **une
semaine portant deux notes spéciales**, et **un historique de clôtures assez long pour
tester le moteur d'alertes** : un franchissement de seuil, un quasi-franchissement, un
franchissement en période de silence, et une série trouée par un jour férié. Sinon les états 3, 4 et 5 et l'affichage
du fil casseront en production.

Critère de validation : le site est déployé sur Vercel et **utilisable au pouce sur un
téléphone**. Pas « joli en capture d'écran ».

**Étape 2 — Le contenu éditorial.**
Objets **Driver** avec leurs cartes en en-tête de l'onglet Notes et leur page dédiée.
Notes en MDX avec frontmatter et validation des blocs obligatoires selon le type.
Objets **Tendance** avec chronologie de statuts, liés aux drivers dans les deux sens.
Scénarios versionnés, rattachés à un driver, avec la vue Trajectoire.
Migrer trois notes rétrospectives pour vérifier que le fil et tous les liens croisés
fonctionnent — driver ↔ tendance ↔ instrument ↔ note. C'est ce maillage qui fait le produit.

**Étape 3 — Les données automatiques.**
Une source d'abord : FRED, pour les taux et l'inflation. Cron, Zod, stockage, fraîcheur.
Observer trois jours avant d'ajouter Eurostat et l'INSEE, puis l'EIA, puis actions et FX.
Les deux spreads sont calculés et stockés dès que le Bund, l'OAT et le 10 ans US sont en place :
ils ont besoin de trois clôtures d'historique avant que leurs alertes puissent s'évaluer.

Périmètre FRED : la courbe souveraine US (6 mois à 20 ans, sans le 15 ans), l'inflation
totale et sous-jacente, le chômage, les salaires, le taux directeur, la croissance, la dette
et le solde budgétaire. `us-current-account` et `us-pmi` restent au seed, avec leur raison
écrite dans `config/fred-series.ts` — la première parce qu'elle est publiée en dollars et non
en part du PIB, la seconde parce que l'ISM a fait retirer ses indices de FRED.

Mise en service, dans l'ordre : exécuter `supabase/schema.sql`, renseigner les variables de
`.env.example`, lancer `npm run fred:check` et n'activer que les séries sorties vertes, puis
laisser le cron tourner. Le site fonctionne à chaque étape de cette séquence, y compris
avant la première — c'est ce que garantit le repli sur le seed.

**Étape 4 — Confort.**
Mode comparaison de l'onglet Macro, graphiques de séries, recherche dans les notes,
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
  ISO, **la collecte** (rejet d'une réponse malformée sans écriture, valeurs manquantes
  écartées sans être remplacées, réponse vide traitée comme un succès, bornes de plausibilité,
  repli sur le seed, jours ouvrés) et **le moteur d'alertes** : franchissement de seuil,
  fenêtre glissante, période de silence, calcul des spreads, gestion des clôtures manquantes.
  C'est la logique la plus facile à casser sans s'en apercevoir. Le reste se vérifie à l'œil.

## Avertissement en pied de page

Support d'analyse personnel, pas un conseil en investissement.
