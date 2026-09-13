# La couche d'intelligence — traitement hebdomadaire du corpus

À insérer dans `CLAUDE.md` après « Les newsletters — une source d'un genre à part ».

---

## Le constat qui motive ce changement

La veille primaire ne produit pas de matière exploitable : seuls les dépôts réglementaires
remontent, GDELT et les flux institutionnels ne donnent rien. Tant que ce n'est pas diagnostiqué,
les notes n'ont pas de substance.

Les newsletters sont un corpus dense, déjà filtré par des professionnels, et disponible
immédiatement. **Elles deviennent l'entrée principale de la veille**, la collecte primaire
passant en appui.

Ce renversement est explicite et provisoire. Il ne supprime pas la collecte primaire : il
cesse d'en dépendre pour produire une note.

---

## Les quatre traitements, dans l'ordre

Le corpus de la semaine passe par quatre étapes. L'ordre compte : chacune s'appuie sur la
précédente.

### 1. Dédupliquer par événement, pas par mention

**L'étape la plus importante, et celle qu'on oublie.**

Les newsletters se recopient. Un même fait apparaît dans huit envois. Compter huit signaux
reviendrait à mesurer la circulation d'une information, pas son poids.

Le modèle regroupe donc les mentions en **événements** :

```ts
type Evenement = {
  id: string;
  libelle: string;              // reformulé, une phrase
  dateFait: string;             // quand le fait s'est produit, pas quand il a été commenté
  mentions: Array<{
    expediteur: string;
    date: string;
    angle: string;              // ce que cet expéditeur en retient, une phrase
  }>;
  sourcePrimaire: string | null; // le lien vers le fait lui-même, si identifiable
  axeId: string | null;
  driverId: string | null;
  direction: 'accelere' | 'ralentit' | 'neutre';
  horizon: 'court' | 'long';
};
```

**Un événement compte pour un**, quel que soit le nombre de mentions. Le nombre de mentions est
conservé séparément : il mesure la saillance, pas l'importance.

Distinguer les deux est ce qui sépare une lecture de marché d'une revue de presse.

### 2. Consensus et divergences

Sur chaque événement à plusieurs mentions, le modèle sépare :

- **Ce que tout le monde retient** — l'angle commun
- **Ce sur quoi les lectures diffèrent**, avec qui dit quoi

Une divergence entre deux newsletters sur la lecture d'un même fait vaut souvent plus que le
fait lui-même. C'est là que se trouvent les mécanismes contestés — donc les endroits où une
conviction personnelle peut se former.

Même typage que la page consensus : désaccord sur un **fait**, sur un **mécanisme**, ou sur une
**probabilité**.

### 3. Le tableau de pression par axe

C'est la traduction opérationnelle de « infléchir les scénarios selon la répétition ».

Pour chaque axe de chaque driver, sur une fenêtre glissante de **quatre semaines** :

- Le nombre d'événements — dédupliqués — qui poussent vers `accelere`
- Le nombre qui poussent vers `ralentit`
- Pondérés par l'autorité de la source primaire quand elle existe, moins quand elle n'existe pas

```ts
type Pression = {
  axeId: string;
  fenetre: { debut: string; fin: string };
  accelere: number;
  ralentit: number;
  solde: number;                 // accelere − ralentit, pondéré
  evenements: string[];          // pour pouvoir remonter au détail
  contredit: boolean;            // le solde contredit-il la branche dominante ?
};
```

**Quand le solde d'un axe contredit la branche dominante de son driver pendant deux semaines
consécutives**, une proposition de révision de scénario est levée — avec la liste des
événements qui la motivent.

Elle est **proposée**, jamais appliquée. La règle ne change pas : aucune version de scénario
sans validation humaine.

Le tableau de pression s'affiche sur la page du driver : on voit quels axes poussent, dans quel
sens, et depuis quand.

### 4. Extraction de vocabulaire — et retour vers la collecte primaire

C'est le mécanisme qui répare progressivement ce qui ne marche pas.

Le modèle extrait les **termes récurrents** du corpus : entités, sigles, noms de programmes,
formulations qui reviennent. Ceux qui n'apparaissent pas dans la configuration de la passe 1
sont proposés comme mots-clés candidats.

Vous en retenez quelques-uns chaque semaine. Au bout de deux mois, la collecte primaire capte
le vocabulaire que le marché emploie réellement — et non celui qu'on avait deviné au départ.

Même chose pour les entités : un émetteur, une institution ou un organisme cité plusieurs fois
et absent du catalogue est proposé comme source ou comme émetteur à suivre.

---

## Ce qui ne change pas

**Aucun chiffre issu d'une newsletter n'entre dans une note.** Le contrôle bloquant vérifie
chaque nombre contre la base. Si une newsletter cite une donnée intéressante, soit
l'instrument est collecté et la note affiche **votre** valeur, soit c'est une lacune de données
à traiter.

C'est la seule garantie du dispositif qui ne se négocie pas. Une exception ici la viderait
partout.

**Les notes citent la source primaire**, jamais la newsletter. Le champ `sourcePrimaire` de
l'événement sert exactement à ça. Si aucune source primaire n'est identifiable, l'événement
peut informer votre lecture mais n'est pas cité.

**Stockage limité** : expéditeur, date, objet, liens, et un résumé court par sujet. Jamais le
corps du message. Une mention conserve un angle reformulé en une phrase, pas un extrait.

**Autorité moyenne** : une newsletter ne lève jamais d'alerte seule. Elle envoie chercher la
source primaire.

---

## Le double emploi avec la page consensus

Les deux mécanismes se ressemblent et doivent rester distincts :

| | Corpus newsletters | Page consensus |
|---|---|---|
| Matière | Commentaire hebdomadaire | Perspectives publiées des maisons |
| Rythme | Hebdomadaire | Trimestriel |
| Horizon | Court terme | Long terme |
| Sortie | Pression par axe, propositions de révision | Thèmes, candidats drivers |

Les newsletters de fond — recherche macro, notes trimestrielles — sont classées `horizon: long`
et **alimentent la page consensus**, pas la note hebdomadaire. Un seul flux d'entrée, deux
destinations selon l'horizon.

---

## Le diagnostic à mener en parallèle

Ce renversement ne dispense pas de comprendre pourquoi la collecte primaire ne produit rien.
Trois hypothèses à écarter dans l'ordre :

1. **Les flux ne tournent pas** — le module échoue silencieusement dans l'orchestrateur, ou
   les points d'accès RSS sont morts. Le journal séparé par module doit le dire.
2. **Le filtre étrangle** — les thèmes et pays GDELT sont trop restrictifs, ou la règle
   « doit se rattacher à un driver ou un canal » rejette tout parce que le vocabulaire
   configuré ne correspond pas à celui des dépêches.
3. **Le plafond est mal placé** — les items sont classés par autorité, et les dépôts
   réglementaires saturent les quarante places avant que le reste ne passe.

La troisième hypothèse expliquerait exactement le symptôme observé : seul EDGAR remonte.
À vérifier en premier, c'est la moins coûteuse à corriger.
