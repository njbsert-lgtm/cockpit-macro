# Charte de design — Marguerite

**Cette charte remplace toutes les indications de design antérieures de CLAUDE.md.**
Référence visuelle **partielle** : la maquette `carnet-canaux.html`, hors dépôt, qui ne couvre
qu'une partie de l'application (en-tête, cartes, carrousel). Elle illustre ; elle n'arbitre pas.
**C'est la prose de cette charte qui tranche**, et une mesure qu'elle ne fixe pas se demande avant
d'être codée. En cas de contradiction, `CLAUDE.md` tranche sur le fonctionnel, cette charte sur le
visuel.

---

## Jetons

Tous définis une seule fois en variables CSS. Aucune valeur en dur dans un composant.

```css
:root{
  /* Surfaces et encre */
  --page:#FFFFFF;      /* fond général et fond de carte */
  --repos:#F4F5F6;     /* zones creuses : segments, jauges, blocs dépliés */
  --encre:#12161A;     /* texte principal, état actif */
  --doux:#5E6A70;      /* texte secondaire, corps de carte */
  --tenu:#8B959A;      /* métadonnées, dates, libellés */
  --trait:#E4E7E9;     /* bordures au repos */
  --trait-f:#CDD3D6;   /* bordures au survol, pointillés */

  /* Performance — exclusivement réservé aux chiffres */
  --hausse:#0F8A6A;
  --baisse:#C2334A;

  /* Les cinq canaux de transmission */
  --k-taux:#2F5FD0;    /* taux réels */
  --k-choc:#A85A18;    /* nature du choc */
  --k-reac:#6B4E9E;    /* fonction de réaction */
  --k-usd:#0E7490;     /* dollar */
  --k-pos:#4A5A66;     /* positionnement */

  /* Fraîcheur d'une collecte — ni un contenu ni une performance */
  --perime:#C9900C;    /* ambre : le seul usage est le point de fraîcheur « périmé » */

  /* Rayons */
  --rc:16px;           /* cartes */
  --rb:10px;           /* boutons, champs */
  --rp:999px;          /* pastilles, segments */

  --v:160ms cubic-bezier(.2,.7,.3,1);
}
```

### La règle chromatique, non négociable

**Deux systèmes de couleur qui ne se touchent jamais.**

- Les **couleurs de canal** qualifient un contenu : bande de carte, pastille de canal,
  point de canal, bordure gauche. Jamais un chiffre.
- Le **vert et le rouge** qualifient une performance : variation, pourcentage, écart.
  Jamais un contenu.

Un pourcentage de probabilité de branche est un chiffre éditorial, pas une performance :
il prend la couleur sémantique de la branche (positionnement, hausse, baisse), pas une
couleur de canal.

Les cinq teintes de canal se distinguent par leur clarté autant que par leur ton, et aucune
n'est ni verte ni rouge. C'est délibéré : `--k-choc` est un ambre brûlé plutôt qu'une
rouille, `--k-usd` un pétrole plutôt qu'un teal. Toute nouvelle teinte ajoutée au système
doit respecter cette contrainte.

**Exceptions écrites, et les seules.**
- Le **point de fraîcheur** de la barre : vert (`--hausse`), ambre (`--perime`), rouge
  (`--baisse`). C'est un état de collecte, ni un chiffre ni un contenu (`CLAUDE.md`).
- Le libellé **« ⚠️ Infirmé si »** d'un guet, en `--baisse` (voir « Page de lecture d'une note ») :
  il expose la note à la contradiction et doit se voir au premier regard.
- La **pastille de bloc validé** (liste d'archive, portail) et le compteur complet, en vert.
- `--k-choc` porte aussi le motif d'**alerte** (ligne d'alerte, état `ia`, « Non collecté »,
  « Non mesuré », pastille non validée) : une seule teinte pour « ceci appelle un geste ».

### La forme encode la fonction

Trois rayons, aucune exception.

- `--rp` pour ce qui **change une vue** : chips d'ancre, segments, filtres, pastilles, points,
  liens de navigation vers un autre écran.
- `--rb` pour ce qui **déclenche une action** : boutons, champs.
- `--rc` pour ce qui **contient** : cartes, blocs, panneaux.

Un lecteur apprend ce code sans qu'on le lui explique, à condition qu'il ne souffre
aucune exception. N'introduisez pas de quatrième rayon — un angle droit en est un.

---

## Typographie

**IBM Plex Sans** exclusivement, chargée depuis Google Fonts en poids 400, 500, 600, 700.
Plus de Bricolage Grotesque, plus d'Inter, plus de police à empattements.
Plus de monospace dans l'interface : c'est lui qui donnait à l'application un air de
terminal de trading, registre explicitement écarté. Il reste permis pour afficher du code
ou une URL.

- Corps : 15px, interligne 1.55
- Titres `h1`–`h4` : poids 600, interligne 1.2, `letter-spacing:-.015em`
- Titre de page : 27px, poids 700
  - Exception : la phrase de régime en tête de l'accueil se compose en 24px, poids 700,
    `text-wrap: pretty`. À 27px, une phrase de 150 signes occupe le premier écran entier et masque
    « Depuis S41 ».
- Titre de section : 17px
- Titre de carte : 15.5px, interligne 1.25
- Corps de carte : 12.5px, couleur `--doux`
- Métadonnées et dates : 11 à 12px, couleur `--tenu`
- Étiquettes en capitales : 9.5 à 11px, poids 600, `letter-spacing:.09em`
- Tous les chiffres portent `font-variant-numeric: tabular-nums`

`-webkit-font-smoothing: antialiased` sur le `body`.

Le `tabular-nums` est la règle typographique la plus importante de la charte : sans lui,
une colonne de pourcentages tremble d'une ligne à l'autre et devient illisible d'un
coup d'œil. Il s'applique au `body` entier plutôt qu'élément par élément : un chiffre
oublié dans un `<span>` est un chiffre qui tremble.

### Contraste

`--tenu` ne passe pas un contraste élevé (2,9:1 sur `--page`) : il est réservé aux
métadonnées de 11px et plus, jamais au corps de texte — un chapeau de page est du corps, il est
en `--doux`. Le corps utilise `--doux` ou `--encre`. Aucune information indispensable ne repose
sur `--tenu` seul.

`--hausse` est à 3,6:1 sur `--page` : acceptable en poids 600 à partir de 15px, à éviter
en dessous. `--baisse` et les cinq couleurs de canal passent le seuil de 4.5:1.

---

## Mise en page

- Colonne unique, `max-width: 520px`, centrée, `padding: 0 18px`
- `padding-bottom: 78px` sur le `body` pour dégager la barre d'onglets — sur mobile seulement :
  sur desktop les onglets montent dans la barre du haut
- **Desktop (≥ 768px)** : le cadre garde `max-width: 1060px` et ses grilles (étagère à trois
  cartes, mode comparaison de Macro, colonnes de branches) ; seule la **colonne de lecture**
  d'une note reste limitée à 640px, une ligne plus longue ne se lit pas
- Sections espacées de 28px, `scroll-margin-top: 96px`
- Densité élevée assumée : petits corps, marges serrées, beaucoup d'information par écran.
  C'est un instrument, pas une brochure.

---

## Composants

### Barre de zone — collante en haut

`position:sticky; top:0`, fond blanc à 95 % avec `backdrop-filter: blur(14px)`,
bordure basse `--trait`.

À gauche la marque **Marguerite** en 13px poids 700. À droite un **segment** :
fond `--repos`, rayon `--rp`, padding 3px. Chaque bouton en 12px poids 500, couleur `--doux` ;
l'actif prend fond `--encre` et texte blanc.

Le projet compte plus de zones que la maquette n'en montre : le segment défile
horizontalement, sans barre de défilement visible, et la zone active reste amenée dans
le champ au chargement.

**Le segment n'apparaît que sur Macro** (`CLAUDE.md`) : Marchés a sa propre rangée de zones,
Notes n'a pas de notion de zone. Sur les autres écrans, la barre ne porte que la marque, les
onglets (desktop) et le point de fraîcheur.

### Chips d'ancre — collantes sous la barre de zone

`position:sticky; top:47px`. Rangée défilante de boutons en 13px, rayon `--rp`,
bordure `--trait`. L'actif prend fond et bordure `--encre`, texte blanc.

Ces chips sont des **ancres de section**, pas des filtres : un clic défile vers la section,
et un `IntersectionObserver` met à jour l'état actif au défilement
(`rootMargin: '-100px 0px -60% 0px'`).

Comme rien n'est jamais masqué, **aucune option « Tout »** : elle n'a de sens que pour un
filtre (voir « Filtres du fil »).

### En-tête de section

Titre 17px à gauche, compteur discret à droite en 12px `--tenu`
(« 4 récentes », « 3 actifs »). Sous le titre, une ligne de note en 12.5px `--doux`
qui explique la logique de la section.

Quand la section mène ailleurs, le titre devient un bouton portant un chevron `›`
qui se décale de 2px au survol. **Le titre entier est cliquable**, pas seulement le chevron.

### Carrousel de cartes

`display:flex`, `gap:12px`, `overflow-x:auto`, `scroll-snap-type:x mandatory`,
`scrollbar-width:none`. Débordement en pleine largeur par `margin: 0 -18px` et
`padding: 2px 18px 14px`.

Cartes à `flex: 0 0 262px`, `scroll-snap-align: start`. La dernière carte est une
**carte d'appel** à `flex: 0 0 132px` : fond `--repos`, bordure en pointillés `--trait-f`,
libellé centré du type « Voir toute l'archive › ».

Cette carte d'appel est obligatoire : le dernier geste de balayage doit aboutir quelque
part, jamais sur un cul-de-sac. Sur desktop, où l'étagère devient une grille de trois, elle
disparaît : l'en-tête de section « Notes › » mène déjà à l'archive.

### Carte

Bordure `--trait`, rayon `--rc`, fond `--page`, `overflow:hidden`.
Au survol la bordure passe à `--trait-f` ; à l'appui, `transform: scale(.99)`.

Structure d'une carte de note :
1. Une **bande de 4px** en haut, à la couleur du canal dominant
2. Padding 15px
3. Ligne d'en-tête : pastille de canal (bordure `currentColor`, texte à la couleur du canal),
   puis la date à droite — ou « Aujourd'hui » en poids 600 à la couleur du canal
4. Titre 15.5px
5. Accroche 12.5px `--doux`
6. Pied poussé en bas par `margin-top:auto` : cinq points de 6px, allumés à la couleur des
   canaux traversés, éteints en `#E0E3E5`, puis le décompte à droite

Les cinq points suivent toujours le même ordre — taux, choc, réaction, dollar,
positionnement — sans quoi la position d'un point ne voudrait plus rien dire.

Une carte porte une **bande en haut** dans un carrousel, un **filet à gauche** dans une
liste d'archive ou une page de lecture. Jamais les deux à la fois.

**Hebdo ou spéciale.** La bande encode le canal, pas le type : le type s'écrit, en capitales
9.5px `--tenu` (« Hebdo », « Spéciale »), dans l'en-tête de la carte, de l'entrée d'archive et de
la page de lecture. Jamais une couleur, jamais un aplat.

**Note sans canal déclaré.** Bande ou filet en `--trait`, aucune pastille de canal, les cinq
points éteints, et la semaine ISO à la place du décompte — plutôt qu'un « 0 canal » qui se
lirait comme un jugement.

### Chiffres clés du régime

Sous le titre de l'accueil, une grille de cellules bordées (2 colonnes sur mobile, 4 sur desktop). Une
cellule dont le libellé désigne un indicateur suivi dans Macro — « Fed funds », « BCE — facilité de
dépôt » — est entière un lien vers `/macro/<id>` : hauteur minimale 44 px, fond `--repos` au survol,
chevron `›` après le libellé. Les autres (prévisions, chiffres de marché) restent du texte, sans
chevron : le chevron annonce la fiche, il ne se met pas partout. Le rattachement se lit dans le
libellé (`lib/indicateur-cle.ts`) ; un `indicatorId` dans le frontmatter le force.

La date d'une valeur s'écrit « le 14/10 », et non plus « au 14/10 » — ici comme dans les listes
d'instruments mobiles. Les mentions « dernière valeur connue du … » et « valeur du … » restent
inchangées.

### Carte de driver

Bordure `--trait`, rayon `--rc`, padding 16px. Titre 15.5px avec une étiquette « Driver »
à droite (fond `--repos`, rayon `--rp`).

Chaque branche est une grille `1fr auto` : nom en 13px avec un sous-titre en 11.5px `--tenu`,
probabilité en poids 600 alignée à droite, puis une **jauge** de 5px pleine largeur
(fond `--repos`, remplissage à la couleur sémantique de la branche).

Pied séparé par une bordure haute : les points de canal suivis de leurs noms à gauche,
la date de dernière révision à droite. Les canaux d'un driver sont ceux de la note qui l'a
révisé en dernier ; sans canal, le libellé du driver tient la place.

**Vraisemblance, pas probabilité.** Le modèle de données porte trois catégories (centrale,
modérée, faible), pas des pourcentages : la jauge a trois crans (plein, deux tiers, un tiers) et
le libellé est écrit à droite. Afficher « 55 % » serait fabriquer un chiffre. Toute vue qui
affiche des vraisemblances porte en pied de section : « Vraisemblances éditoriales, non
implicites de marché. »

**La couleur d'une branche vient de son sens, jamais de son rang.** `--k-pos` pour la
branche centrale (actions à plat), `--baisse` pour la défavorable (actions en baisse),
`--hausse` pour la favorable (actions en hausse). La branche la plus vraisemblable n'est donc pas
la plus colorée : colorer par vraisemblance transformerait la carte en classement et la ferait
lire comme une prévision, alors qu'un driver sert à tenir plusieurs futurs ouverts.

**Repère de révision.** Quand une branche a changé de cran depuis la note précédente, sa jauge
porte un **repère** de 2×9px `--encre` à l'ancien cran, et le sous-titre l'écrit (« était faible en
S41 »). Le repère ne s'utilise pas ailleurs.

Trois branches en pratique, quatre au maximum. Au-delà, l'incertitude n'est pas
structurée : c'est le signe qu'il faut la scinder en deux drivers.

### Ligne de tendance

Grille `1fr auto`, padding 14px 16px. À gauche le titre 14.5px et une ligne de contexte
12px `--tenu`. À droite une **pastille de statut** — fond à 11 % d'opacité de la couleur,
texte à la couleur pleine — puis la trajectoire en dessous (« Se renforce ↗ », « Stable → »,
« Sous tension ↘ »).

**Couleurs de statut** — des couleurs de canal, puisque le statut qualifie un contenu ; le vert
et le rouge restent aux chiffres. Le libellé est toujours écrit.

| Statut | Trajectoire | Classe |
|---|---|---|
| renforce | Se renforce ↗ | `bg-k-taux/11 text-k-taux` |
| maintient | Stable → | `bg-k-pos/11 text-k-pos` |
| affaiblit | Sous tension ↘ | `bg-k-choc/11 text-k-choc` |
| invalidée | Écartée ✕ | `bg-tenu/11 text-tenu` |

Une tendance listée ailleurs (page d'un driver, pied d'une note) garde cette forme de ligne —
jamais une carte haute.

### Driver ou tendance

La distinction la plus importante du produit, et le design doit la rendre évidente sans
un mot d'explication. Un **driver** est une incertitude ouverte : branches, vraisemblances,
jauges. Une **tendance** est une direction établie : ni branches ni vraisemblances, seulement un
statut et une trajectoire. Les deux composants sont donc volontairement dissemblables — carte
haute à jauges contre ligne basse à pastille. Toute évolution qui les rapprocherait visuellement
est à refuser, même si elle paraît plus homogène.

### Frise d'une tendance

Sur la page d'une tendance, la chronologie de ses statuts : liste verticale, filet gauche de
1px `--trait`, un point de 10px (rayon `--rp`) par passage, à la couleur de son statut ce jour-là.
Pour chaque passage : la date en 11px `--tenu`, la pastille de statut, le lien vers la note, puis
la justification en 14.5px `--doux`. Ce qui invaliderait la tendance est une **ligne d'alerte**,
libellé « Invalidée si ».

### Liste d'archive

Groupée par mois, avec un intertitre en 11px capitales `--tenu`.
Chaque entrée est une grille `4px 1fr` : la colonne de 4px porte la couleur du canal.

L'en-tête de l'entrée est un bouton dépliant (`aria-expanded`, `aria-controls`) qui révèle
un panneau de fond `--repos` listant l'état des blocs — pastille ronde de 17px, pleine
verte si validé, en pointillés `--k-choc` sinon — puis deux boutons d'action, **tous deux
secondaires** : un fil peut avoir plusieurs entrées ouvertes, et autant de primaires qu'il y a
d'entrées dépliées casseraient la règle du primaire unique.

Compteur de validation à droite du titre : complet sur fond vert à 11 %, sinon sur fond ocre.
Le dénominateur suit le format de la note, cinq ou trois blocs selon `CLAUDE.md`.

### Filtres du fil

Le fil `/notes` se filtre par type et par driver (`CLAUDE.md`). Deux rangées sous le titre de
page, chacune précédée de son étiquette en capitales 9.5px `--tenu` (« Type », « Driver »). Les
boutons ont le visuel des chips — rayon `--rp`, 13px poids 500, bordure `--trait`, actif en fond
et bordure `--encre`, texte blanc —, mais ce ne sont **pas** des chips d'ancre : ils ne collent
pas, ils masquent, et portent `aria-pressed`. D'où l'option **« Tout »**, en tête et par défaut.
Hauteur 44px, défilement horizontal sans barre.

### Liens de navigation de l'accueil

Tendances de fond, Thèmes sous observation, Triage, Rédaction : ils mènent à un autre écran,
donc rayon `--rp` — 13px poids 500, bordure `--trait`, fond `--page`, 44px de haut, chevron `›`.
Un compteur éventuel est une pastille `--repos` en 11px. Rédaction n'apparaît que si un brouillon
existe ; les autres n'ont jamais de compteur à zéro trompeur.

### Ligne d'alerte

Le motif commun de tout ce qui appelle l'attention sans être un chiffre : bordure gauche de 3px
`--k-choc`, fond `--k-choc` à 11 %, padding 8px 12px, texte 13px `--doux`, précédé d'un libellé
en capitales 10.5px poids 600 `--k-choc` (« Seuil déclenché », « Alerte », « Signalement »,
« Invalidée si »). C'est la seule forme pour le seuil d'une note spéciale, une alerte
d'instrument sur la page d'un driver, un signalement de style dans le portail. Une variation
chiffrée à l'intérieur reste en `--hausse` ou `--baisse`.

### Boutons

Rayon `--rb`, padding 10px 16px, 13px poids 500.
Secondaire : fond `--page`, bordure `--trait`. Primaire : fond et bordure `--encre`, texte blanc.

**Un seul bouton primaire par écran.** Dès qu'un second aplat `--encre` apparaît, l'œil ne
sait plus où aller et l'écran s'alourdit.

### Ligne de guet

Reprend exactement la **ligne de tendance** : grille `1fr auto`, padding 14px 16px.
À gauche le `libelle` en 14.5px, puis l'`attendu` en 12px `--tenu`. À droite la **pastille
de statut** — fond à 11 % d'opacité, texte à la couleur pleine — et sous elle l'échéance en
11px `--tenu`, ou « sans échéance » quand `echeance` vaut `null`.

`confirmeSi` et `infirmeSi` vivent dans un dépliant (`aria-expanded`, `aria-controls`) sur
fond `--repos`, motif de la liste d'archive : ce sont les critères de résolution, on les
consulte au moment de trancher, pas à chaque lecture.

Exception sur la page de lecture d'une note : le « Infirmé si » sort du dépliant et prend le
traitement de rupture (voir « Le « Infirmé si » rompt la série »).

Couleurs de statut — même règle que le statut de tendance, **couleurs de canal uniquement**,
le vert et le rouge restant réservés aux chiffres. Le libellé est toujours écrit : la couleur
ne porte jamais l'information seule.

| Statut | Classe | Lecture |
|---|---|---|
| ouvert | `bg-k-taux/11 text-k-taux` | en cours |
| confirmé | `bg-k-pos/11 text-k-pos` | établi |
| infirmé | `bg-k-reac/11 text-k-reac` | bascule — un événement analytique |
| expiré | `bg-k-choc/11 text-k-choc` | discipline rompue, même ocre que la pastille non validée |
| sans objet | `bg-tenu/11 text-tenu` | clos délibérément |

Un guet remonté de la note précédente porte sa **date d'origine** en 11px `--tenu` devant le
libellé. C'est ce qui rend visible qu'une question traîne depuis trois semaines.

### Rappel de calendrier

**En-tête de section** — titre 17px, compteur discret à droite (« 3 à venir ») — au-dessus
d'une liste à la forme du fil de la semaine : date en 10.5px `--tenu`, libellé, puis le driver
concerné en pastille. Panneau `--repos`.

N'apparaît que dans le portail, au-dessus du bloc 5. Ce n'est pas un contenu de lecture :
c'est un rappel au moment d'écrire, pour qu'on ne pose pas un guet sur un événement oublié.

### Badge d'authorship

L'**étiquette** de la carte de driver : fond `--repos`, rayon `--rp`, capitales 9.5px poids
600, `letter-spacing:.09em`. Placé à droite du titre de bloc.

| Valeur | Libellé | Couleur de texte |
|---|---|---|
| `ia` | IA | `--k-choc` |
| `ia-relue` | IA relue | `--doux` |
| `ia-corrigee` | IA corrigée | `--doux` |
| `humaine` | Humaine | `--encre` |

`ia` est le seul état qui appelle une action — un bloc jamais ouvert — et le seul qui sorte du
gris. Sur la note publiée, tous passent en `--tenu` : le cahier demande un affichage discret,
et le badge y est une mention de provenance, pas une consigne.

### Étiquette « Non collecté »

La même étiquette, appliquée à une valeur saisie à la main dans `data/seed.json` qu'aucune
source ne collecte. Libellé « Non collecté », texte `--k-choc` : comme `ia`, c'est une valeur
qu'aucune vérification n'a touchée. Toujours suivie de la date de la valeur.

- Elle remplace le point de fraîcheur : une valeur du seed n'est pas une collecte en retard,
  c'est une collecte qui n'existe pas.
- Rien ne se calcule sur une valeur non collectée : ni pastille de variation, ni YTD, ni
  variation colorée sur une carte d'indicateur — le vert et le rouge d'un mouvement inventé se
  liraient comme un vrai.
- Sur une fiche, une phrase sous la valeur étend l'étiquette au graphique, aux performances
  et à l'historique.

### Compteur d'angles morts

Deux compteurs, **jamais fondus en un seul** : « avec driver, sans axe » dit qu'il manque une
dimension à un driver existant, « sans driver » dit que le marché suit une force absente de la
grille. Ils ne se lisent pas de la même façon et n'ont pas le même seuil. Aucun composant nouveau :
tout est emprunté à des motifs déjà posés.

**Sur l'accueil** — sous les cartes de driver, une **en-tête de section** (« Angles morts »,
compteur discret « 91 jours », ligne de note de 12.5px `--doux`), puis la **grille des indicateurs
clés** de l'en-tête : deux colonnes, rayon `--rc`, bordure et séparateur `--trait`. Chaque cellule
porte son libellé en 9.5px capitales `--tenu`, la valeur en 13px poids 600 `--encre`, puis une ligne
de 11px `--tenu` (« seuil : trois sur un même driver »). Les cellules ne sont pas des liens : aucun
écran ne leur correspond, l'accès au détail se fait par la page du driver.

**Sur la page d'un driver** — en dernière section, titre 17px et compteur discret à droite
(« 2 en 91 jours », motif de l'en-tête de section). La liste reprend le **rappel de calendrier** :
panneau `--repos`, une ligne par événement — date en 10.5px `--tenu`, titre en lien souligné vers
la source, puis « Axe manquant : » et le libellé proposé en 12px `--tenu`. Une phrase de 12px
`--tenu` en pied donne le second compteur (« Sans driver sur le trimestre : 1 »), avec un lien vers
l'accueil.

**Seuil** — la **pastille de statut du guet** : fond à 11 % d'opacité de la couleur, texte à la
couleur pleine, libellé toujours écrit. « Seuil atteint » en `bg-k-choc/11 text-k-choc`, le même
ocre que « expiré » : une discipline rompue, ici une grille qui a un trou. Sous le seuil, aucune
pastille — un compteur qui crie sans raison finit par ne plus être lu. Quand le seuil est atteint,
la cellule ou la liste nomme le driver ou le sujet concerné.

**Chromatique** — ce sont des décomptes, ni des performances ni des contenus : le vert et le rouge
leur sont interdits, la valeur reste en `--encre`. La couleur de canal ne sert qu'à la pastille de
seuil, et le libellé ne dépend jamais d'elle.

**Les états** :
1. *Normal* — les deux valeurs, la pastille si un seuil est atteint.
2. *Chargement* — deux cellules `--repos` à la forme de la grille ; jamais un spinner.
3. *Vide* — la table est lisible et ne contient rien : « Aucun angle mort sur les 91 derniers
   jours — tout ce qui a été jugé de matérialité haute s'est rattaché à un axe. » C'est un vrai
   zéro, et la phrase dit ce qu'il signifie.
4. *Périmé* — sans objet : le compteur se recalcule à chaque lecture depuis la table. La fraîcheur
   de la passe 2 est un autre signal, déjà porté par le point de la barre.
5. *Erreur* — table illisible (migration non appliquée, base injoignable) : l'**étiquette** « Non
   mesuré » (fond `--repos`, rayon `--rp`, capitales 9.5px, texte `--k-choc`, comme « Non
   collecté ») à la place de la valeur, avec une phrase qui nomme la cause. **Jamais un 0** : il
   affirmerait que la grille tient alors qu'on n'en sait rien.

### Chiffres à trancher

Panneau du portail, sous le rapport de contrôle des chiffres, présent seulement quand un nombre est
non conforme. Bordure `--k-choc`, titre en capitales avec le décompte « N restants sur M ». Une ligne
par nombre : le bloc en petites capitales, **la phrase entière avec le nombre surligné** (`<mark>`,
fond `--k-choc` à 25 %), le reproche du contrôle en `--doux`. Deux gestes, jamais en bloc : un champ
« Corriger la phrase » (remplace la phrase dans le bloc, qui passe à `ia-corrigee`) et un bouton
« Garder tel quel ». Un nombre gardé reste listé, marqué « gardé », avec « Reprendre l'examen ».
Boutons de 44 px minimum.

### Portail de rédaction

Reprend le **motif de validation de la liste d'archive**, que cette charte invite déjà à
réutiliser pour les vrais blocs.

- **Compteur de validation** en tête : `4/5` sur fond vert à 11 % quand complet, ocre sinon.
  C'est l'exception chromatique que le motif d'archive porte déjà ; elle n'est pas étendue
  ailleurs.
- **Rapport des chiffres en premier**, panneau `--repos`, une ligne par nombre : la valeur, sa
  source, son verdict. Pastille ronde de 17px, pleine si conforme, en pointillés `--k-choc`
  sinon.
- **Chaque bloc** est une entrée dépliante (`aria-expanded`, `aria-controls`) : pastille de
  validation, titre, badge d'authorship.
- **Propositions et guets** : boutons à 44px, secondaire « Refuser », primaire « Accepter »,
  plus « Corriger » sur un guet, qui ouvre les champs en place. Aucun n'est coché par défaut,
  et **il n'existe aucun bouton de validation globale** — la validation doit coûter quelque
  chose.
- **Bouton de publication** primaire, désactivé tant qu'une condition manque, avec la raison
  écrite dessous. Jamais un bouton mort sans explication : c'est l'état 3 du cahier, dire quoi
  faire plutôt que constater.

Largeur : colonne de 520px sur mobile, plus large sur desktop — même dérogation que l'étagère
de Notes et le mode comparaison de Macro. C'est un écran de travail, plus dense qu'un écran de
lecture.

Entrée : un bouton compteur discret sur l'accueil de Notes quand un brouillon existe, comme
celui de `/triage`. Aucune notification.

#### Portail à gestes : frise, relecture dans la note, chiffres par valeur

Le compteur `0/6` n'est plus un dépliant par bloc : c'est une **frise** de segments, un pour la
phrase de régime puis un par bloc (avec son emoji de bloc). Fait en `--hausse`, en cours en
`--encre`, à faire en `--trait`, avec un point `--k-choc` s'il reste des chiffres à trancher dans le
geste. **L'état informe, il ne verrouille jamais** : segments en `role="tab"` (`aria-selected`,
libellé « Ce qui a changé, à faire, 7 chiffres à trancher »), « ‹ Précédent » et « Suivant › »
toujours actifs, la saisie d'un geste laissé en cours survit au changement de segment. Seul « Publier
la note » reste conditionné.

- **Tableau (4a)** : surtitre, compteur, « N gestes avant publication », frise, ligne « Bloque la
  publication » (bordure `--k-choc`, rayon `--rc`, seulement si les chiffres bloquent), puis « À faire
  maintenant » — le geste ouvert, sans dépliant — et « Ensuite », la liste des autres gestes.
- **Relire dans la note (4b)** : un bloc se relit avec la mise en page de la page de lecture — filet de
  canal de 3px, emoji dans la marge, sous-titres en 700, gras d'attaque neutralisé. Les chiffres non
  conformes sont surlignés (`bg-k-choc/25`, poids 600) ; les toucher ouvre une bulle sous le
  paragraphe (verdict, régime, rang « 1 sur 7 dans ce bloc », « Garder tel quel » et « Corriger la
  phrase », un nombre à la fois). Barre d'emoji collante en lecture continue, puce active suivie à
  l'`IntersectionObserver` ; barre basse collante au-dessus de la barre d'onglets mobile. « Valider
  le bloc » reste grisé tant qu'un chiffre du bloc n'est pas tranché, raison écrite — et **cela ne
  bloque jamais la navigation**. « Aperçu publié » masque surlignages, badges et pastilles.
- **Chiffres par valeur (4c)** : en tête, le nombre à trancher, une barre `--hausse` / `--k-choc`
  (conformes / non conformes), les totaux par régime. « Par valeur » regroupe les occurrences d'une
  même valeur et d'une même série — la valeur en 19px 700 (`--text-19`), le reproche, le nombre
  d'occurrences, un encadré « Pour trancher » tiré des seules données existantes, puis **un geste par
  occurrence**, jamais un geste de groupe. « Par bloc » garde la liste d'origine.

#### Choix de la phrase de régime, et signalements de style

Deux éléments du portail, sans composant nouveau.

**Choix de la phrase de régime** — une **entrée dépliante** au motif des blocs : pastille de
validation de 17px, titre « Phrase de régime », étiquette à droite (fond `--repos`, rayon `--rp`,
capitales 9.5px) qui dit « À choisir » ou « Retenue · » suivie de l'angle. Elle est **ouverte tant
que rien n'est retenu** — c'est un geste qu'on doit obtenir, pas une option qu'on peut laisser
dormir —, repliée ensuite. Elle se place juste sous le rapport des chiffres, avant les blocs, et
compte comme un bloc dans le compteur de validation.

Le contenu est un panneau `--repos`. Chaque proposition est une **carte** : bordure `--trait`,
rayon `--rb`, fond `--page`, qui prend la bordure `--encre` une fois choisie. Dedans, le libellé
d'angle (« Le fait dominant », « Le mécanisme sous-jacent », « La contradiction de la semaine ») en
9.5px capitales `--tenu`, la phrase en 14.5px poids 600, puis la justification en 12px `--tenu`. Un
bouton radio natif de 16px, `accent-color: --encre`, dans une zone de 44px de haut au moins. Une
quatrième carte, « Écrire la mienne », porte un champ de saisie de 13px. Le bouton primaire
« Retenir cette phrase » en pied, au motif des boutons du portail.

**Aucune carte n'est sélectionnée par défaut** : aucun radio n'est coché tant qu'aucune décision
n'est enregistrée, et une décision enregistrée se relit, jamais ne se présume. C'est le seul état
qu'il faut vérifier à l'œil — une proposition cochée d'avance se publierait sans être lue.

**Signalements de style** — au-dessus du texte éditable d'un bloc, une liste reprenant la **ligne
d'alerte** de la fiche d'un driver : bordure gauche de 3px `--k-choc`, fond `--k-choc` à 11 %,
13px `--doux`, précédée du libellé « Signalement » en 10.5px capitales `--k-choc`. Ils portent sur
un paragraphe de plus de six phrases, sans sous-titre dans les trois premiers blocs ou, dans les deux premiers, sans affirmation en gras en
tête. **Jamais bloquants** : ils ne changent ni le compteur ni la condition de publication. Le
libellé est toujours écrit, la couleur ne porte jamais seule l'information.

#### Thèmes sous observation

Une page (`/notes/themes`) et une proposition du portail, sans composant nouveau.

**La page** reprend l'**en-tête de page des tendances** (retour, capitales 11px, titre 27px,
chapeau 15px `--tenu`) et la **carte de la ligne de tendance** : bordure `--trait`, rayon `--rc`,
fond `--page`. Trois sections au motif de l'**en-tête de section** (titre 17px, compteur à droite,
ligne de note dessous) : « En attente de données », « Sous observation », « Tranchés » ; une
section vide n'est pas dessinée. Dans une carte, du haut vers le bas : le libellé en 14.5px poids
600, l'émetteur et la date en 12px `--tenu`, la thèse en 13px, puis « Confirmé si » et « Infirmé
si » en 12px `--tenu` (libellés en gras), enfin **une ligne d'état** en 12px : pour un thème sans
témoin, depuis combien de jours il attend et l'instrument qui le débloquerait (`--doux`, poids
500) ; pour un thème observé, « Verdict le … », « verdict à trancher » ou « début d'observation
à dater ». La ligne d'état est toujours écrite : aucune couleur ne la porte, et **jamais d'ambre**,
réservé à la fraîcheur d'une collecte — un thème qui attend n'est pas une donnée périmée.

Les thèmes en attente sont triés du plus ancien au plus récent : c'est l'argument de priorisation
de la collecte. L'état vide dit quoi faire (le geste est une proposition acceptée dans le portail).
Entrée : un bouton « Thèmes sous observation › » sur l'accueil de Notes, au motif des boutons
« Tendances de fond » et « Triage », **sans compteur**.

**La proposition dans le portail** réutilise la **carte de proposition** des révisions et des
tendances : titre, sous-titre (émetteur, délai en jours, « témoin hors catalogue » le cas échéant),
puis dans le corps la thèse, les témoins, les deux seuils. Deux boutons de 44px, « Refuser » et
« Accepter », aucun coché par défaut, comptés dans les conditions de publication comme toute
autre proposition. Le bloc s'intitule « Thèmes proposés à l'observation » et n'est dessiné que si
le modèle en a proposé.

### Barre d'onglets

`position:fixed` en bas, fond blanc à 95 % avec `blur(16px)`, bordure haute `--trait`,
`padding: 8px 0 max(8px, env(safe-area-inset-bottom))`.

Chaque onglet : icône SVG de 20px en trait de 1.7 (`stroke:currentColor`, `fill:none`,
`stroke-linecap:round`), libellé de 10.5px en dessous. Inactif en `--tenu`, actif en `--encre`.

Aucune couleur d'accent sur l'onglet actif : l'accent est réservé aux canaux, et un onglet
n'est pas un canal. Le libellé est toujours affiché — une icône seule ne survit pas à la
première hésitation du lecteur.

**Desktop (≥ 768px).** La barre du bas disparaît : les quatre onglets montent dans la barre
collante, à droite de la marque — icône de 18px et libellé 13px poids 500 côte à côte, inactif en
`--tenu`, actif en `--encre` avec un filet bas de 2px `--encre` (`CLAUDE.md` : « horizontale en
haut sur desktop »).

---

## Page de lecture d'une note

L'écran qui s'ouvre au clic sur une carte. La maquette s'arrête à la carte : cette section ne
découle d'aucune référence visuelle, elle fait autorité seule.

**Principe : filet, pas aplat.** Une note se lit longuement. Une carte ou un en-tête en aplat
pèse sur un texte de cette longueur. La couleur du canal se rappelle par un filet de 3px qui
court le long du corps, jamais par une surface.

### Structure

**Au-dessus, dans le cadre** — le retour « ← Notes » en 12px. Il appartient au cadre de
l'application, pas à la note.

**En-tête** — une ligne de métadonnées en 11px `--tenu` : le type en capitales (« Hebdo »,
« Spéciale »), la semaine ISO, la date. Puis la pastille du canal dominant (bordure
`currentColor`, texte à la couleur du canal), et le **titre, qui est la phrase de régime**, en 26px
poids 700, `letter-spacing:-.025em`, interligne 1.14. Rien sous le titre ne la répète : pas de
« phrase à retenir ». Puis « Comparée à 2026-S40 du … » en 11px `--tenu`, en lien. Sur une
spéciale, le seuil déclenché en **ligne d'alerte**. Enfin la grille des **chiffres clés**.

**Corps** — pas de carte autour : `border-left: 3px solid` à la couleur du canal,
`padding-left: 18px`. Chaque bloc : l'emoji, sur un fond `--page` de 30px de large et 38px de
haut, tiré dans la marge gauche par `margin-left:-39px` par-dessus le filet — **le filet est
interrompu à l'endroit de l'emoji**, qui se lit sur blanc —, suivi du libellé du bloc, **à la taille d'un sous-titre** (15.5px poids 600, sans capitales), à la couleur du canal. Texte du bloc en 14.5px, interligne 1.6, `--encre`, **justifié** avec
césure automatique (`hyphens:auto`, la page est en `lang="fr"`) : sans césure, la justification
creuse des lézardes sur une colonne de mobile. En pied de bloc, dans cet ordre, les pièces à
conviction (pastilles `--rp`) puis les sources (11px `--tenu`, liens).

**Un sujet, un sous-titre.** Dans les blocs « Ce qui a changé », « Ce qui s'est confirmé » et
« Révision des scénarios », chaque paragraphe est précédé de son sous-titre (`###` dans le MDX) :
15.5px **poids 700** `--encre`, interligne 1.25, 24px au-dessus et 6px en dessous. Un texte long ne
se lit pas en un bloc : le sous-titre aère, et permet de sauter au sujet cherché. Il nomme le
sujet (« Le risque souverain français ») ; le jugement reste dans l'affirmation en gras qui
ouvre le paragraphe — **mais cette affirmation se rend en poids normal** : le sous-titre est
le seul gras de la page de lecture, deux gras voisins se concurrencent. Le `**…**` reste dans le
MDX, où il structure et où le contrôle de style le cherche.

Sur mobile, le corps est décalé de 12px vers la droite pour que les pastilles d'emoji tirées dans
la marge ne touchent pas le bord de l'écran.

**Pied de note** — les tendances touchées en pastilles `--rp`, puis les badges d'authorship en
`--tenu`.

Desktop : la colonne de lecture est limitée à 640px.

### Vocabulaire d'emoji — fermé

| Bloc | Emoji |
| --- | --- |
| Ce qui a changé | 🔄 |
| Ce qui s'est confirmé | ✅ |
| Révision des scénarios | 🔀 |
| Ce que j'avais mal lu | ✏️ |
| Ce que je surveille | 👁️ |
| Récap des spéciales | 📎 |
| Le fil de la semaine | 🧵 |
| Infirmé si (guet) | ⚠️ |

Ces emoji ne changent jamais d'une note à l'autre : le bénéfice — sauter directement au bloc
cherché sans lire les libellés — disparaît dès qu'un emoji change de sens. **Aucun autre emoji
dans une note.** Hors des notes, un seul autre vocabulaire est permis, celui des **thèmes
d'outlook** (ci-dessous), et seulement sur les écrans Outlook. Aucun emoji ailleurs : ni titre de
page, ni carte de driver, ni tableau de marché.

| Thème d'outlook | Emoji |
| --- | --- |
| Croissance, marché actions | 📈 |
| Banques centrales, taux | 🏦 |
| Énergie, pétrole | 🛢️ |
| Intelligence artificielle | 🤖 |
| Investissement, capex | 🏗️ |
| Cybersécurité | 🔐 |
| Matières premières, rareté | 🪙 |
| Infrastructure, électricité | ⚡ |
| Géopolitique, fragmentation | 🌍 |
| Industrie, concurrence | 🏭 |
| Portefeuille, allocation | 🧭 |

Les deux vocabulaires ne se recoupent jamais. Un emoji de bloc de note n'apparaît pas dans un
outlook, et inversement. Un nouveau thème réutilise l'emoji le plus proche ; un ajout à la table se
décide ici, pas dans le contenu.

Le nombre de blocs suit `CLAUDE.md` : cinq pour une hebdomadaire, trois pour une spéciale.

### Le « Infirmé si » rompt la série

Il n'y a pas de bloc d'invalidation distinct : c'est le « Infirmé si » de chaque guet qui en
tient lieu. Sur la page de lecture, il sort du dépliant de la ligne de guet et s'affiche sous
elle, sans pastille dans la marge : fond `--repos`, rayon `--rb`, padding 14px 16px, libellé
« ⚠️ Infirmé si » en capitales 10px poids 600 `--baisse` sur sa propre ligne, texte 13px `--doux`.
« Confirmé si » et la source attendue restent dans le dépliant.

C'est délibéré : ce bloc change de registre. Il n'affirme pas, il expose la note à la
contradiction, et doit se distinguer des autres au premier regard.

### Page d'un driver

Les trois branches : sur mobile, trois lignes-boutons empilées dans une carte `--rc`, séparées
par `--trait` — la ligne active passe sur fond `--repos`, chaque ligne porte son nom, sa
vraisemblance et la jauge sémantique —, le panneau de la branche active dessous ; sur desktop,
trois colonnes dans une carte `--rc`. La **branche dominante** se dit en toutes lettres
(« dominante », `--encre` poids 600) et par deux filets de 2px `--encre`, en haut et en bas de sa
ligne, sans filet latéral, sur fond `--repos` — jamais par une couleur de canal.

La **trajectoire** trace une ligne par branche à sa couleur sémantique (`--k-pos`, `--hausse`,
`--baisse`), chacune avec un tiret distinct pour que la couleur ne porte pas seule
l'information ; axes en `--trait`, graduations en 11px `--tenu` sur trois crans (faible, modérée,
centrale), dans une carte `--rc`, et la mention des vraisemblances éditoriales en pied.

---

## Page d'un outlook

**Principe : fiches, pas filet.** Une note se lit comme un texte continu. Un outlook se lit comme
une série de points indépendants. Les points majeurs sont donc des cartes `--rc` séparées, jamais
un texte à filet, pour que les deux écrans ne se confondent pas.

- **Carte chiffrée** : fond `--repos`, emoji 17px, chiffre en exergue 26px poids 700, légende 12px
  `--doux`. Le chiffre est en `--encre`. C'est un chiffre éditorial, pas une performance : jamais
  de vert ni de rouge.
- **Carte texte** : pastille ronde de 32px `--repos` portant l'emoji, thème en capitales 9.5px
  `--tenu`, texte 13.5px `--encre`.
- **Filtre de thème actif** : toutes les cartes du thème passent en carte texte, la phrase du point
  à la place du chiffre en exergue. Le chiffre seul ne se montre que sous « Tout ».
- **Pastille de thème** (liste et filtres) : `--rp`, contour `--trait`, sans fond. Elle se
  distingue ainsi de la pastille de driver, qui a un fond `--repos`.
- **Logo de la maison** : fichier SVG de `public/outlooks/logos/`, dans un cadre fond `--page`,
  bordure `--trait`, rayon `--rc`, de la hauteur du carré (40px en liste, 48px en fiche) et
  jusqu'à 96px de large : un logotype en longueur garde ses proportions. Sans logo fourni, le
  monogramme dans le carré `--repos`. La grille des positionnements garde le monogramme : c'est
  un tableau, pas une vitrine.
- **Positionnements** : ▲ ● ▼ en `--encre`, « n.p. » en `--tenu` quand le document ne tranche
  pas. On ne déduit jamais une position que la maison n'a pas écrite.
- **Graphique redessiné** : uniquement à partir des points cités dans le document, sans
  interpolation. Il est tracé en `--encre` et `--tenu`, sans couleur de performance ni de canal.
- **Aucune référence aux drivers ni aux tendances de Marguerite** sur les écrans Outlook : un
  outlook est prospectif et se lit avec ses propres thèmes.
- **Âge du document** : il s'écrit en clair (« il y a 3 mois »), jamais en ambre. L'ambre est
  réservé à la fraîcheur d'une collecte.

---

## Les cinq états

`CLAUDE.md` les exige sur chaque écran ; leur forme est commune.

1. **Normal.**
2. **Chargement** — des blocs `--repos` à la forme exacte du contenu, au rayon du composant
   imité. **Aucune pulsation** : « aucune animation décorative ». Jamais de spinner centré.
3. **Vide** — panneau `--repos`, rayon `--rc`, padding 16px : un titre 14.5px poids 600, une
   phrase 12.5px `--doux` qui dit quoi faire, éventuellement un bouton secondaire. Le pointillé est
   réservé à la carte d'appel.
4. **Périmé** — la valeur en `--encre`, puis le point de fraîcheur `--perime` et sa date en 11px.
5. **Erreur** — la valeur en `--encre`, puis le point `--baisse` et « dernière valeur connue du
   … · source : … » en 11px. Jamais un tiret, jamais un zéro.

---

## Interaction

- Transition unique : `160ms cubic-bezier(.2,.7,.3,1)`. Aucune animation décorative.
- `html { scroll-behavior: smooth }`
- `@media (prefers-reduced-motion: reduce)` ramène toutes les durées à 1ms et supprime
  le défilement doux.
- Focus visible partout : `outline: 2px solid var(--k-taux); outline-offset: 2px`
- Toute rangée défilante masque sa barre de défilement mais laisse voir le bord de
  l'élément suivant.
- Cibles tactiles : 44px de hauteur minimum sur tout contrôle principal.
- Rôles ARIA : `role="tablist"` et `aria-selected` sur les segments
  et la barre d'onglets, `aria-current` sur les chips d'ancre, `aria-expanded` sur les
  dépliants.

---

## Ce que la charte interdit

- Les dégradés, de toute nature.
- Les ombres sur une carte de contenu. Les cartes se séparent par leur bordure. L'ombre
  est réservée à ce qui flotte réellement : barre d'onglets, feuille modale.
- Plus de deux aplats `--encre` sur un même écran.
- Une couleur de canal sur un chiffre.
- Un quatrième rayon, angle droit compris.
- Le monospace dans l'interface, hors code et URL.
- Une carte portant à la fois un filet à gauche et une bande en haut.
- Une animation décorative, pulsation de squelette comprise.
- Le mode sombre. Il a été essayé puis écarté : il écrase les données et rend les cinq
  couleurs de canal indistinctes.

---

## Ce que la maquette n'impose pas

La maquette est une **référence visuelle partielle**, pas une spécification fonctionnelle.
Elle ne remplace pas les décisions de CLAUDE.md sur ces points :

- **La navigation reste** Notes · Macro · Marchés · Outlook. La maquette montre
  « Carnet » et « Veille » : ignorez ces libellés, gardez les nôtres.
- **La liste des zones reste** celle de CLAUDE.md, pas les quatre de la maquette.
- **La structure des notes reste** celle de CLAUDE.md — cinq blocs pour une hebdomadaire,
  trois pour une spéciale. La maquette illustre un découpage différent en cinq blocs ;
  reprenez le **motif visuel** de validation, pas les intitulés.
- **La route reste** `/notes`, pas `/carnet`.
