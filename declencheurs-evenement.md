# Section à insérer dans CLAUDE.md

**Emplacement** : dans « Le moteur d'alertes — règles d'implémentation », après la règle 5.

---

## Déclencheurs d'événement — le second moteur

Le moteur d'alertes décrit plus haut surveille des **prix**. Il ne voit pas les événements.
Un dépôt réglementaire qui change la lecture d'un driver n'y déclenche rien, sauf à provoquer
un mouvement d'indice assez violent pour franchir un seuil de prix — donc après coup, et
seulement dans les cas extrêmes.

C'est l'inverse de ce qu'on cherche. Ce qui justifie une note spéciale n'est pas l'ampleur
d'un mouvement, c'est **le déplacement d'un driver**.

D'où un second moteur, de nature différente : il ne mesure pas des écarts, il confronte des
événements à des attentes pré-inscrites.

### Le bloc 5 est la pré-inscription

Le bloc « ce que je surveille » n'est plus seulement du texte. Chacun de ses éléments devient
un objet suivi, et le gabarit MDX en exige la forme structurée.

```ts
type Guet = {
  id: string;
  noteSlug: string;              // la note qui l'a posé
  driverId: string;              // obligatoire — un guet sans driver n'a pas de sens
  libelle: string;               // 'Résultats NVIDIA, guidance data center'
  attendu: string;               // ce que j'anticipe, en clair
  confirmeSi: string;            // signal qui valide la branche dominante
  infirmeSi: string;             // signal qui la fait basculer
  echeance: string | null;       // date connue, ou null si l'événement est imprévisible
  sourceAttendue: string[];      // 'EDGAR:NVDA', 'FED:communique', 'EIA:STEO'
  statut: 'ouvert' | 'confirme' | 'infirme' | 'expire' | 'sans-objet';
  resoluPar: string | null;      // id de l'item de veille qui l'a résolu
  resoluLe: string | null;
};
```

**Trois guets maximum par note.** La contrainte existante devient une contrainte de données.
Un dispositif qui surveille quinze choses ne surveille rien.

**Un guet non résolu à son échéance passe à `expire` et remonte automatiquement dans le
bloc 5 de la note suivante**, avec sa date d'origine visible. Un guet oublié est une
question qu'on a cessé de se poser sans le décider — ça doit se voir.

### Le pont : un item de veille peut lever une alerte

Passe 2 gagne deux champs en sortie :

```
{ …, resoutGuet: string | null, materialite: 'haute' | 'moyenne' | 'faible' }
```

Le prompt système reçoit **les guets ouverts** en plus de la grille des cinq canaux.
Le modèle ne juge pas de l'importance dans l'absolu : il répond à une question précise —
cet item résout-il l'un des guets listés, et dans quel sens ?

Un `AlertEvent` de type `evenement` est levé quand **les trois conditions** sont réunies :

1. L'item est rattaché à un driver et classé `isSignal`
2. Sa source est d'autorité maximale — dépôt réglementaire, communiqué officiel, publication
   statistique. Une détection GDELT ne lève jamais d'alerte à elle seule : elle signale qu'il
   se passe quelque chose, elle ne prouve rien.
3. **Il résout un guet ouvert**, ou sa matérialité est jugée haute alors qu'aucun guet ne le
   couvrait

Le troisième cas est délibérément plus étroit qu'il n'y paraît, et il est instrumenté : un
événement de matérialité haute qu'aucun guet n'attendait est enregistré comme **angle mort**.
Le compte d'angles morts par driver est affiché sur la page du driver. Beaucoup d'angles
morts sur un driver signifie que vous surveillez les mauvaises choses — c'est le retour le
plus utile que le système puisse vous rendre.

### Calendrier des échéances connues

`config/calendrier-drivers.ts` liste les rendez-vous datés à l'avance et le driver concerné :
réunions de banques centrales, publications statistiques, réunions OPEP, rapports EIA,
publications de résultats des émetteurs suivis.

Deux usages :
- **Avant** : le portail de rédaction rappelle les échéances de la semaine à venir au moment
  d'écrire le bloc 5. On ne pose pas un guet sur un événement qu'on a oublié.
- **Après** : une échéance passée sans item de veille correspondant signale une **collecte en
  défaut**, pas un non-événement. La différence est essentielle — une source qui se tait
  ressemble à un monde calme.

### Période de silence

Un déclencheur d'événement respecte la même règle de silence de cinq séances, mais **par
driver** et non par règle. Deux événements majeurs sur le même driver dans la semaine
produisent un seul brouillon, enrichi du second — pas deux notes spéciales concurrentes.

Un déclencheur de prix et un déclencheur d'événement sur le même driver fusionnent aussi :
le mouvement de prix devient une pièce du brouillon d'événement, pas une note séparée.
C'est presque toujours la même histoire vue deux fois.
