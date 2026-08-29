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
