# Charte de design — Longue-vue

**Cette charte remplace toutes les indications de design antérieures de CLAUDE.md.**
Référence visuelle canonique : `/design/carnet-canaux.html`. En cas de doute, ce fichier
tranche. Toute page, tout composant, toute modification future s'y conforme.

Seule exception : la section « Page de lecture d'une note » ne découle pas de cette
maquette, qui s'arrête à la carte de carrousel. Elle fait autorité à sa place.

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

Les cinq teintes de canal se distinguent par leur clarté autant que par leur ton, et aucune
n'est ni verte ni rouge. C'est délibéré : `--k-choc` est un ambre brûlé plutôt qu'une
rouille, `--k-usd` un pétrole plutôt qu'un teal. Toute nouvelle teinte ajoutée au système
doit respecter cette contrainte.

### La forme encode la fonction

Trois rayons, aucune exception.

- `--rp` pour ce qui **change une vue** : chips d'ancre, segments, pastilles, points.
- `--rb` pour ce qui **déclenche une action** : boutons, champs.
- `--rc` pour ce qui **contient** : cartes, blocs, panneaux.

Un lecteur apprend ce code sans qu'on le lui explique, à condition qu'il ne souffre
aucune exception. N'introduisez pas de quatrième rayon.

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
- Titre de section : 17px
- Titre de carte : 15.5px, interligne 1.25
- Corps de carte : 12.5px, couleur `--doux`
- Métadonnées et dates : 11 à 12px, couleur `--tenu`
- Étiquettes en capitales : 9.5 à 11px, poids 600, `letter-spacing:.09em`
- Tous les chiffres portent `font-variant-numeric: tabular-nums`

`-webkit-font-smoothing: antialiased` sur le `body`.

Le `tabular-nums` est la règle typographique la plus importante de la charte : sans lui,
une colonne de pourcentages tremble d'une ligne à l'autre et devient illisible d'un
coup d'œil.

### Contraste

`--tenu` ne passe pas un contraste élevé (2,9:1 sur `--page`) : il est réservé aux
métadonnées de 11px et plus, jamais au corps de texte. Le corps utilise `--doux` ou
`--encre`. Aucune information indispensable ne repose sur `--tenu` seul.

`--hausse` est à 3,6:1 sur `--page` : acceptable en poids 600 à partir de 15px, à éviter
en dessous. `--baisse` et les cinq couleurs de canal passent le seuil de 4.5:1.

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

À gauche la marque **Longue-vue** en 13px poids 700. À droite un **segment** :
fond `--repos`, rayon `--rp`, padding 3px. Chaque bouton en 12px poids 500, couleur `--doux` ;
l'actif prend fond `--encre` et texte blanc.

Le projet compte plus de zones que la maquette n'en montre : le segment défile
horizontalement, sans barre de défilement visible, et la zone active reste amenée dans
le champ au chargement.

La barre de zone appartient au **cadre de l'application**, pas à l'écran : la zone
sélectionnée vaut pour toutes les vues et vit dans l'URL, de sorte qu'un lien partagé
rouvre la bonne zone.

### Chips d'ancre — collantes sous la barre de zone

`position:sticky; top:47px`. Rangée défilante de boutons en 13px, rayon `--rp`,
bordure `--trait`. L'actif prend fond et bordure `--encre`, texte blanc.

Ces chips sont des **ancres de section**, pas des filtres : un clic défile vers la section,
et un `IntersectionObserver` met à jour l'état actif au défilement
(`rootMargin: '-100px 0px -60% 0px'`).

Comme rien n'est jamais masqué, **aucune option « Tout » n'est nécessaire** : elle n'a de
sens que si les autres chips cachent quelque chose.

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
part, jamais sur un cul-de-sac.

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
liste d'archive. Jamais les deux à la fois.

### Carte de driver

Bordure `--trait`, rayon `--rc`, padding 16px. Titre 15.5px avec une étiquette « Driver »
à droite (fond `--repos`, rayon `--rp`).

Chaque branche est une grille `1fr auto` : nom en 13px avec un sous-titre en 11.5px `--tenu`,
probabilité en poids 600 alignée à droite, puis une **jauge** de 5px pleine largeur
(fond `--repos`, remplissage à la couleur sémantique de la branche).

Pied séparé par une bordure haute : les points de canal suivis de leurs noms à gauche,
la date de dernière révision à droite.

**La couleur d'une branche vient de son sens, jamais de son rang.** `--k-pos` pour la
branche centrale, `--baisse` pour la défavorable, `--hausse` pour la favorable. La branche
la plus probable n'est donc pas la plus colorée : colorer par probabilité transformerait
la carte en classement et la ferait lire comme une prévision, alors qu'un driver sert à
tenir plusieurs futurs ouverts en même temps.

Trois branches en pratique, quatre au maximum. Au-delà, l'incertitude n'est pas
structurée : c'est le signe qu'il faut la scinder en deux drivers.

Toute vue affichant des probabilités doit préciser qu'elles sont **éditoriales et non
implicites de marché**. Une ligne en pied de section suffit.

### Ligne de tendance

Grille `1fr auto`, padding 14px 16px. À gauche le titre 14.5px et une ligne de contexte
12px `--tenu`. À droite une **pastille de statut** — fond à 11 % d'opacité de la couleur,
texte à la couleur pleine — puis la trajectoire en dessous (« Se renforce ↗ », « Stable → »,
« Sous tension ↘ »).

### Driver ou tendance

La distinction la plus importante du produit, et le design doit la rendre évidente sans
un mot d'explication.

Un **driver** est une incertitude ouverte : branches, probabilités, jauges.
Une **tendance** est une direction établie : ni branches ni probabilités, seulement un
statut et une trajectoire.

Les deux composants sont donc volontairement dissemblables — carte haute à jauges contre
ligne basse à pastille — de sorte qu'on les reconnaisse de loin, sans lire. Toute évolution
qui les rapprocherait visuellement est à refuser, même si elle paraît plus homogène.

### Liste d'archive

Groupée par mois, avec un intertitre en 11px capitales `--tenu`.
Chaque entrée est une grille `4px 1fr` : la colonne de 4px porte la couleur du canal.

L'en-tête de l'entrée est un bouton dépliant (`aria-expanded`, `aria-controls`) qui révèle
un panneau de fond `--repos` listant l'état des blocs — pastille ronde de 17px, pleine
verte si validé, en pointillés `--k-choc` sinon — puis deux boutons d'action.

Compteur de validation à droite du titre : complet sur fond vert à 11 %, sinon sur fond ocre.
Le dénominateur suit le format de la note, cinq ou trois blocs selon `CLAUDE.md`.

### Boutons

Rayon `--rb`, padding 10px 16px, 13px poids 500.
Secondaire : fond `--page`, bordure `--trait`. Primaire : fond et bordure `--encre`, texte blanc.

**Un seul bouton primaire par écran.** Dès qu'un second aplat `--encre` apparaît, l'œil ne
sait plus où aller et l'écran s'alourdit.

### Barre d'onglets

`position:fixed` en bas, fond blanc à 95 % avec `blur(16px)`, bordure haute `--trait`,
`padding: 8px 0 max(8px, env(safe-area-inset-bottom))`.

Chaque onglet : icône SVG de 20px en trait de 1.7 (`stroke:currentColor`, `fill:none`,
`stroke-linecap:round`), libellé de 10.5px en dessous. Inactif en `--tenu`, actif en `--encre`.

Aucune couleur d'accent sur l'onglet actif : l'accent est réservé aux canaux, et un onglet
n'est pas un canal. Le libellé est toujours affiché — une icône seule ne survit pas à la
première hésitation du lecteur.

---

## Page de lecture d'une note

La maquette `/design/carnet-canaux.html` s'arrête à la carte de carrousel. Cette section
couvre l'écran qui s'ouvre au clic sur une carte.

**Principe : filet, pas aplat.** Une note se lit longuement. Un en-tête en aplat de couleur
pèse sur un texte de cette longueur. La couleur du canal se rappelle par un filet de 3px
qui court le long du corps, jamais par une surface.

### Structure

**En-tête** — pastille de canal (bordure `currentColor`, texte à la couleur du canal),
puis le titre en 26px poids 700, `letter-spacing:-.025em`, interligne 1.14.
Sous le titre, la phrase à retenir précédée de 💡, en 14px `--doux`.

**Corps** — `border-left: 3px solid` à la couleur du canal, `padding-left: 18px`.
Chaque bloc : une pastille ronde de 30px en fond `--repos` portant l'emoji, tirée dans
la marge gauche par `margin-left:-39px`, suivie du libellé en capitales 10px poids 600
à la couleur du canal. Texte du bloc en 14.5px, interligne 1.6.

**Figure** — optionnelle, après le dernier bloc, à l'intérieur du filet.

Au-dessus de la fiche, le fil d'Ariane de retour et le rappel de zone et de date
appartiennent au cadre de l'application, pas à la note.

### Vocabulaire d'emoji — fermé

| Bloc | Emoji |
| --- | --- |
| Constat | 🔎 |
| Canal de transmission | 🔗 |
| Implication marché | 📉 |
| Condition d'invalidation | ⚠️ |
| Rattachement | 🧭 |
| Phrase à retenir | 💡 |

Ces emoji ne changent jamais d'une note à l'autre. Le bénéfice — sauter directement au
bloc cherché sans lire les libellés — disparaît dès qu'un emoji change de sens.
**Aucun autre emoji dans une note.** Aucun emoji ailleurs dans l'application : ni dans un
titre de page, ni sur une carte de carrousel, ni dans un tableau.

Le nombre de blocs suit `CLAUDE.md` : cinq pour une hebdomadaire, trois pour une spéciale.

### Le bloc d'invalidation rompt la série

Il ne porte pas de pastille dans la marge. Fond `--repos`, rayon `--rb`, padding 14px 16px,
libellé `⚠️ Invalidé si` en `--baisse` sur sa propre ligne.

C'est délibéré : ce bloc change de registre. Il n'affirme pas, il expose la note à la
contradiction. Il doit se distinguer des autres au premier regard.

### Note ou fiche outlook

Les deux formats partagent la même structure didactique — l'essentiel en haut, des repères
visuels, des graphes. C'est voulu. Ce qui les distingue est **qui parle**, et cela doit se
lire en une demi-seconde.

| | Note | Fiche outlook |
| --- | --- | --- |
| En-tête | Pastille de canal, titre noir | Logo de la source, bandes multicolores |
| Couleur | Une seule, le canal dominant | Plusieurs, une par point à retenir |
| Emoji | Type de bloc, vocabulaire fixe | Thème du point, variable |
| Voix | Une : la nôtre | Deux : la leur, puis la nôtre |
| Clôture | Condition d'invalidation | « On suit » ou « On nuance » par point |

La distinction passe par l'en-tête et le régime de couleur, jamais par la mise en page.

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

## Ce que la charte interdit

- Les dégradés, de toute nature.
- Les ombres sur une carte de contenu. Les cartes se séparent par leur bordure. L'ombre
  est réservée à ce qui flotte réellement : barre d'onglets, feuille modale.
- Plus de deux aplats `--encre` sur un même écran.
- Une couleur de canal sur un chiffre.
- Un quatrième rayon.
- Le monospace dans l'interface.
- Une carte portant à la fois un filet à gauche et une bande en haut.
- Le mode sombre. Il a été essayé puis écarté : il écrase les données et rend les cinq
  couleurs de canal indistinctes.

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
