# Pipeline de note depuis la fiche Notion

À insérer dans `CLAUDE.md`, section « Rédaction assistée ». Remplace la construction du paquet
de contexte décrite jusqu'ici.

---

## Le changement

La fiche macro hebdomadaire de Notion devient la **matière principale** de la note. Elle est
alimentée chaque soir par le tri de la boîte, sourcée ligne par ligne, et couvre la semaine
complète le samedi matin.

Deux conséquences immédiates :

- Le paquet de contexte est bien plus simple : un document au lieu de quarante-huit
  observations et vingt-cinq items de veille éparpillés.
- La note gagne ce que la veille primaire ne produisait pas : la **saillance**, c'est-à-dire
  le jugement de professionnels sur ce qui méritait d'être écrit.

---

## Le contrôle des chiffres, en deux régimes

**C'est la décision structurante.** Jusqu'ici, tout nombre devait correspondre à une valeur en
base, sous peine de blocage. Une note écrite depuis la fiche bloquerait sur la quasi-totalité
de ses chiffres.

La règle devient : **deux provenances, deux vérifications, toutes deux bloquantes.**

### Régime A — Instrument collecté par l'application

Brent, 10 ans américain, EUR/USD, or, indices suivis, indicateurs macro en base.

Le nombre doit correspondre à la valeur stockée, à la tolérance d'arrondi déclarée près.
Un écart bloque la publication.

**Sans exception.** Si la fiche cite un Brent à 104 $ et que la base a 102,96 $, la note
affiche la valeur de la base. Pas de moyenne, pas d'arbitrage : l'application a sa propre
source pour cet instrument, c'est elle qui fait foi.

### Régime B — Nombre absent de la base

Décisions de banques centrales, chiffres d'études, prévisions de maisons, statistiques
nationales non collectées.

Deux conditions cumulatives, toutes deux bloquantes :

1. **Le nombre doit se retrouver littéralement dans la fiche.** Un nombre inventé, arrondi
   différemment, ou reformulé par le modèle bloque la publication. La vérification se fait par
   recherche exacte dans le texte source.
2. **Le nombre doit porter son attribution dans la note.** Un chiffre du régime B sans
   émetteur nommé dans la phrase qui le contient bloque également.

La seconde condition est la plus importante. Elle transforme une faiblesse — des chiffres
non vérifiables — en discipline éditoriale : le lecteur sait toujours qui avance quoi.

### Ce que le rapport de contrôle affiche

Chaque nombre, sa provenance (A ou B), sa source, son verdict. Le total par régime en tête.
Une note comportant une majorité de chiffres du régime B est normale ; une note n'en comportant
que du régime B signale que la collecte n'a rien apporté cette semaine.

---

## Le paquet de contexte

```ts
type ContextePaquet = {
  noteType: 'hebdo' | 'speciale';
  isoWeek: string;
  comparesTo: string;

  ficheNotion: {
    pageId: string;
    url: string;
    semaine: string;              // 'S38 — lundi 14/09 au dimanche 20/09'
    contenu: string;              // le markdown intégral de la fiche
    sources: string[];            // émetteurs cités
    recupereLe: string;
  } | null;

  notePrecedente: { /* inchangé */ };
  observations: Observation[];    // pour le régime A et les instruments cités
  scenariosCourants: ScenarioVersion[];
  axes: Axe[];
  guetsOuverts: Guet[];
  guetsExpires: Guet[];
  echeancesAVenir: EcheanceCalendrier[];
};
```

**Règle de suffisance.** Pas de fiche pour la semaine, ou fiche vide : le modèle produit une
note courte qui le dit. Il ne comble jamais l'absence par des généralités de marché.

---

## Récupération de la fiche

### Accès technique — le point à ne pas rater

Le connecteur Notion utilisé en conversation **n'est pas accessible depuis un workflow**.
Il faut une intégration interne Notion, avec son propre jeton.

1. Créer une intégration interne sur `notion.so/my-integrations`, en lecture seule
2. **Partager la base « Vues Macro — Synthèses hebdo » avec cette intégration** — sans ce
   partage explicite, le jeton est valide mais ne voit rien, et l'erreur ressemble à une
   base vide
3. Secrets GitHub : `NOTION_TOKEN`, `NOTION_VUES_MACRO_DB`

### Sélection de la fiche

La base porte une propriété `Semaine` au format `S38 — lundi 14/09 au dimanche 20/09`.
Le collecteur sélectionne la fiche dont le numéro de semaine ISO correspond à la semaine
courante, et non la plus récente par date de création — une fiche peut être créée en avance.

Après génération réussie, basculer la propriété `Lue` à vrai. C'est le journal d'exécution le
plus lisible qui soit, directement dans Notion.

---

## Génération — abandon de la sortie structurée

Le schéma monolithe dépasse la limite du compilateur de grammaire. On valide après plutôt
que de contraindre pendant.

Le modèle produit une **réponse unique en deux parties** :

1. Le MDX complet, frontmatter compris, selon un gabarit donné en instructions système
2. Une section JSON délimitée par un marqueur, contenant les seuls objets structurés :
   révisions de scénario proposées, guets proposés, axes proposés

Validation Zod sur la partie JSON uniquement. En cas d'échec, **une seule** tentative de
réparation : l'erreur de validation est renvoyée au modèle avec sa sortie précédente. Si la
réparation échoue, le brouillon est commité avec son rapport d'échec attaché.

**Un script de reproduction minimal est un prérequis**, pas un confort : `npm run note:probe`
appelle l'API avec le seul schéma et un contexte factice. Tester une hypothèse doit coûter
quelques secondes et quelques centimes, pas un run complet.

---

## Ordonnancement

| Quand | Quoi |
|---|---|
| Chaque soir, 19 h Paris | Le tri de boîte alimente la fiche Notion *(existant)* |
| Chaque matin, 6 h Paris | Collecte marché et veille primaire *(existant)* |
| Samedi, 9 h Paris | Récupération de la fiche, génération du brouillon |

Le samedi matin, la fiche contient la semaine complète, bilan du vendredi inclus.

Le workflow commite un **brouillon** — `status: brouillon` — qui n'apparaît ni dans la galerie
ni dans le fil. La publication reste un acte humain dans `/redaction`.

---

## Ce qui ne change pas

**Les blocs obligatoires.** Cinq pour une hebdomadaire, trois pour une spéciale.

**Le bloc 4 reste vide.** Le modèle ne peut pas savoir ce que vous aviez mal lu. Le champ
s'ouvre vide, et la publication l'exige rempli.

**Les révisions sont proposées, jamais appliquées.** Aucune `ScenarioVersion` sans validation
humaine explicite dans le portail.

**Les guets restent à vous sur le seuil.** Le modèle propose depuis les échéances du calendrier
et le contenu de la fiche ; vous fixez la valeur qui tranche.

**Droit d'auteur.** La note cite la source primaire que la newsletter pointait, jamais la
newsletter elle-même quand une source primaire existe. Reformulation systématique, citations
courtes et rares. La fiche Notion reste un document privé : elle n'est pas republiée.

---

## La veille primaire ne disparaît pas

Elle change de rôle : elle devient le **contrôle de rappel** de la fiche.

Pour chaque sujet traité dans la fiche, le pipeline vérifie si la veille primaire l'a capté.
Trois issues, affichées dans le rapport :

| Issue | Ce que ça dit |
|---|---|
| Capté par une source primaire | La couverture fonctionne |
| Non capté, source primaire au catalogue | Trou de **filtrage** — un mot-clé manque |
| Non capté, aucune source au catalogue | Trou de **couverture** — une source manque |

Vous obtenez ainsi chaque semaine, sans effort, la mesure de ce qui échappe à votre collecte.
C'est ce qui permettra de réparer la passe 1 progressivement plutôt que de l'abandonner.
