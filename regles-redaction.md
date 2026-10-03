# Trois règles de rédaction et une précision sur les thèmes

À insérer dans `CLAUDE.md`, section « Rédaction assistée ».

---

## 1. Trois phrases de régime proposées, une retenue

### Pourquoi

La phrase de régime est le titre de la note et son accroche sur la carte. C'est aussi, et
surtout, **le seul endroit où le modèle doit dire de quoi parle la semaine**.

Lui en demander une seule l'autorise à produire une formule passe-partout qui coiffe un
enchaînement de sujets sans en dégager un. Lui en demander trois l'oblige à trancher trois fois.

### Le diagnostic qu'elles fournissent

**Si les trois propositions se ressemblent, la note n'a pas de thèse.** Le modèle a résumé la
fiche au lieu de l'analyser. C'est le signal le plus rapide qu'un brouillon est à rejeter —
visible avant même d'avoir lu le corps.

Les trois doivent donc viser des angles **différents**, pas des reformulations : par exemple
le fait dominant, le mécanisme sous-jacent, la contradiction de la semaine. Le prompt système
l'exige explicitement.

### La forme

```ts
regimeStatementPropositions: [
  { texte: string, angle: 'fait' | 'mecanisme' | 'contradiction', justification: string },
  // exactement trois
]
regimeStatement: string | null   // renseigné à la validation, jamais par le modèle
```

Dans `/redaction`, les trois s'affichent avec leur angle et leur justification. Vous en
retenez une, ou vous en écrivez une quatrième. **Aucune n'est sélectionnée par défaut** — et
la publication exige qu'une soit choisie.

Les deux non retenues sont conservées dans la note. Relire six mois plus tard l'angle qu'on a
écarté est instructif.

---

## 2. Un sujet, un paragraphe

### La règle

Chaque sujet occupe son propre paragraphe, avec un retour à la ligne à chaque changement.
**Un paragraphe ne contient jamais deux sujets. Un sujet ne s'étale jamais sur deux
paragraphes** sans que le second apporte un élément distinct.

### Pourquoi c'est une règle de fond, pas de mise en forme

Le défaut observé — un enchaînement de sujets sans compréhension — se loge précisément dans
les paragraphes composites. Quand deux sujets partagent un paragraphe, la transition entre eux
tient par une conjonction plutôt que par un raisonnement, et la confusion devient invisible.

Séparer les paragraphes force à nommer le lien, ou à constater qu'il n'y en a pas.

### Mise en œuvre

- Chaque paragraphe des blocs 1 et 2 commence par une **affirmation en gras** qui énonce le
  sujet. Si l'affirmation ne tient pas en une phrase, le paragraphe traite de deux choses.
- Un paragraphe de plus de six phrases est signalé dans le rapport : c'est presque toujours
  deux sujets agglomérés.
- Aucune liste à puces dans les blocs 1 à 4. Les puces permettent de juxtaposer sans relier,
  c'est-à-dire exactement le défaut à corriger. Elles restent admises dans le bloc 5 et dans
  le fil de la semaine, qui sont des énumérations assumées.

---

## 3. Un thème s'observe même sans témoin collecté

### Précision sur le mécanisme

La déclaration suffit à créer un thème sous observation. **L'absence de l'instrument en base
ne bloque pas la création** — elle change seulement le statut.

```
statut: 'observe' | 'observe-sans-temoin' | 'confirme' | 'infirme' | 'expire'
```

Un thème en `observe-sans-temoin` porte son instrument témoin et son seuil, écrits comme les
autres. Il attend seulement que l'instrument soit collecté pour que le verdict devienne
calculable.

### Ce que ça produit

**La liste des thèmes sans témoin devient la feuille de route de collecte.** Elle dit, avec des
arguments, quelles données manquent — et pourquoi elles manquent : non pas « il serait bien
d'avoir le Bund » mais « une thèse sur le risque souverain français est en attente de verdict
depuis six semaines, faute du spread OAT-Bund ».

C'est un meilleur argument de priorisation qu'une liste d'instruments à connecter.

### Conséquences

- L'échéance d'un thème sans témoin est **suspendue** : elle ne court qu'à partir du jour où
  l'instrument est collecté. Sinon il expirerait sans avoir jamais pu être testé.
- La page d'un thème sans témoin affiche depuis combien de temps il attend, et quel instrument
  le débloquerait.
- Ces thèmes ne comptent pas dans le plafond de cinq thèmes observés — ils n'occupent aucune
  attention, ils attendent.
