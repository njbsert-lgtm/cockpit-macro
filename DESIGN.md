# Charte de design — Marguerite

**Cette charte remplace toutes les indications de design antérieures de CLAUDE.md.**
Référence visuelle canonique : `/design/carnet-canaux.html`. En cas de doute, ce fichier
tranche. Toute page, tout composant, toute modification future s'y conforme.

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

---

## Typographie

**IBM Plex Sans** exclusivement, chargée depuis Google Fonts en poids 400, 500, 600, 700.
Plus de Bricolage Grotesque, plus d'Inter, plus de police à empattements.

- Corps : 15px, interligne 1.55
- Titres `h1`–`h4` : poids 600, interligne 1.2, `letter-spacing:-.015em`
- Titre de page : 27px, poids 700
- Titre de section : 17px
- Titre de carte : 15.5px, interligne 1.25
- Corps de carte : 12.5px, couleur `--doux`
- Métadonnées et dates : 11 à 12px, couleur `--tenu`
- Étiquettes en capitales : 9.5 à 11px, poids 600, `letter-spacing:.09em`
- Tous les chiffres portent `font-variant-numeric: tabular-nums`

`-webkit-font-smoothing: antialiased` sur le `body`.

### Contraste

`--tenu` ne passe pas un contraste élevé : il est réservé aux métadonnées de 11px et plus,
jamais au corps de texte. Le corps utilise `--doux` ou `--encre`. Aucune information
indispensable ne repose sur `--tenu` seul.

---

## Mise en page

- Colonne unique, `max-width: 520px`, centrée, `padding: 0 18px`
- `padding-bottom: 78px` sur le `body` pour dégager la barre d'onglets
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

### Chips d'ancre — collantes sous la barre de zone

`position:sticky; top:47px`. Rangée défilante de boutons en 13px, rayon `--rp`,
bordure `--trait`. L'actif prend fond et bordure `--encre`, texte blanc.

Ces chips sont des **ancres de section**, pas des filtres : un clic défile vers la section,
et un `IntersectionObserver` met à jour l'état actif au défilement
(`rootMargin: '-100px 0px -60% 0px'`).

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

### Chiffres clés du régime

Sous le titre de l'accueil, une grille de cellules bordées (2 colonnes sur mobile, 4 sur desktop). Une
cellule dont le libellé désigne un indicateur suivi dans Macro — « Fed funds », « BCE — facilité de
dépôt » — est entière un lien vers `/macro/<id>` : hauteur minimale 44 px, fond `--repos` au survol,
chevron `›` après le libellé. Les autres (prévisions, chiffres de marché) restent du texte, sans
chevron : le chevron annonce la fiche, il ne se met pas partout. Le rattachement se lit dans le
libellé (`lib/indicateur-cle.ts`) ; un `indicatorId` dans le frontmatter le force.

### Carte de driver

Bordure `--trait`, rayon `--rc`, padding 16px. Titre 15.5px avec une étiquette « Driver »
à droite (fond `--repos`, rayon `--rp`).

Chaque branche est une grille `1fr auto` : nom en 13px avec un sous-titre en 11.5px `--tenu`,
probabilité en poids 600 alignée à droite, puis une **jauge** de 5px pleine largeur
(fond `--repos`, remplissage à la couleur sémantique de la branche).

Pied séparé par une bordure haute : les points de canal suivis de leurs noms à gauche,
la date de dernière révision à droite.

### Ligne de tendance

Grille `1fr auto`, padding 14px 16px. À gauche le titre 14.5px et une ligne de contexte
12px `--tenu`. À droite une **pastille de statut** — fond à 11 % d'opacité de la couleur,
texte à la couleur pleine — puis la trajectoire en dessous (« Se renforce ↗ », « Stable → »,
« Sous tension ↘ »).

### Liste d'archive

Groupée par mois, avec un intertitre en 11px capitales `--tenu`.
Chaque entrée est une grille `4px 1fr` : la colonne de 4px porte la couleur du canal.

L'en-tête de l'entrée est un bouton dépliant (`aria-expanded`, `aria-controls`) qui révèle
un panneau de fond `--repos` listant l'état des cinq blocs — pastille ronde de 17px, pleine
verte si validé, en pointillés `--k-choc` sinon — puis deux boutons d'action.

Compteur de validation à droite du titre : `5/5` sur fond vert à 11 %, sinon sur fond ocre.

### Boutons

Rayon `--rb`, padding 10px 16px, 13px poids 500.
Secondaire : fond `--page`, bordure `--trait`. Primaire : fond et bordure `--encre`, texte blanc.

### Ligne de guet

Reprend exactement la **ligne de tendance** : grille `1fr auto`, padding 14px 16px.
À gauche le `libelle` en 14.5px, puis l'`attendu` en 12px `--tenu`. À droite la **pastille
de statut** — fond à 11 % d'opacité, texte à la couleur pleine — et sous elle l'échéance en
11px `--tenu`, ou « sans échéance » quand `echeance` vaut `null`.

`confirmeSi` et `infirmeSi` vivent dans un dépliant (`aria-expanded`, `aria-controls`) sur
fond `--repos`, motif de la liste d'archive : ce sont les critères de résolution, on les
consulte au moment de trancher, pas à chaque lecture.

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
un paragraphe de plus de six phrases ou, dans les deux premiers blocs, sans affirmation en gras en
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
- Rôles ARIA conformes à la maquette : `role="tablist"` et `aria-selected` sur les segments
  et la barre d'onglets, `aria-current` sur les chips d'ancre, `aria-expanded` sur les
  dépliants.

---

## Ce que la maquette n'impose pas

La référence est une **maquette de design**, pas une spécification fonctionnelle.
Elle ne remplace pas les décisions de CLAUDE.md sur ces points :

- **La navigation reste** Notes · Macro · Marchés · Outlook. La maquette montre
  « Carnet » et « Veille » : ignorez ces libellés, gardez les nôtres.
- **La liste des zones reste** celle de CLAUDE.md, pas les quatre de la maquette.
- **La structure des notes reste** celle de CLAUDE.md — cinq blocs pour une hebdomadaire,
  trois pour une spéciale. La maquette illustre un découpage différent en cinq blocs ;
  reprenez le **motif visuel** de validation, pas les intitulés.
- **La route reste** `/notes`, pas `/carnet`.
