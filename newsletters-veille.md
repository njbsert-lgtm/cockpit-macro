# Section à insérer dans CLAUDE.md

**Emplacement** : dans « Veille : d'où viennent les nouvelles », après le catalogue de sources.

---

## Les newsletters — une source d'un genre à part

### Pourquoi elles ne sont pas une source comme les autres

Vous êtes abonné : elles arrivent dans votre boîte, légitimement. Ce n'est pas du scraping.

Mais elles diffèrent de tout le reste du catalogue sur un point décisif : **ce sont des
sources secondaires, déjà interprétées**. Une dépêche de banque centrale rapporte un fait ;
une newsletter rapporte ce qu'un professionnel pense du fait.

Cette différence commande leur traitement. Elles entrent dans la veille avec un rôle propre,
pas comme une source de plus dans le même sac.

### Ce qu'elles apportent, ce qu'elles ne peuvent pas apporter

| Apportent | N'apportent pas |
|---|---|
| **La saillance** — ce que des professionnels jugent digne d'être écrit cette semaine | Des chiffres vérifiables |
| **Le cadrage** — pourquoi un fait compte, quel mécanisme il active | Une attribution primaire |
| **La couverture** — elles voient ce que vos mots-clés ratent | De la matière pour le bloc 4 |

La saillance est précisément ce qu'aucun filtre par mots-clés ne produit. C'est leur valeur
réelle.

### Le vrai gain : un audit de rappel permanent

C'est l'usage le plus précieux, et il n'est pas évident.

Pour chaque sujet traité par une newsletter, le pipeline cherche **si la veille primaire l'a
capté**. Trois issues :

| Issue | Ce que ça dit |
|---|---|
| Sujet capté par une source primaire | La couverture fonctionne |
| Sujet non capté, mais une source primaire existe | **Trou de filtrage** — un mot-clé, un thème ou un émetteur manque |
| Sujet non capté, aucune source primaire au catalogue | **Trou de couverture** — il manque une source |

Vous obtenez ainsi, chaque semaine et sans effort, la mesure que je vous proposais de faire à
la main une fois par trimestre. Les newsletters deviennent l'étalon contre lequel votre
collecte se calibre.

Le tableau de bord affiche ces deux compteurs. Trois trous de filtrage sur le même thème en un
mois, c'est un mot-clé à ajouter.

### Routage par horizon

Les newsletters ne se versent pas toutes au même endroit. Le tri par temporalité que vous
décrivez correspond à une distinction déjà présente dans l'application.

**Court terme — actualité de la semaine.** Devient un `VeilleItem` ordinaire, classé par la
passe 2 contre les axes et les guets. Alimente les blocs 1, 2 et le fil de la semaine.

**Long terme — recherche macro, perspectives, notes de fond.** Ne rentre pas dans la note
hebdomadaire. Alimente l'onglet Outlook et la révision trimestrielle des axes. Une thèse de
recherche n'a rien à faire dans un bloc « ce qui a changé cette semaine » : elle n'a pas
changé cette semaine.

Le classement se fait en passe 2, avec un champ supplémentaire :

```
horizon: 'court' | 'long' | 'mixte'
```

Un envoi `mixte` est découpé : chaque sujet est routé séparément. C'est fréquent — une
newsletter hebdomadaire mélange couramment commentaire de marché et analyse de fond.

### Extraction des drivers et des thèmes

Un thème récurrent dans les newsletters suit **exactement le circuit de la page consensus** :
rattachement à un axe existant, candidat axe, ou candidat driver. Pas de second mécanisme.

La différence est le rythme : le consensus des maisons se mesure par trimestre, les
newsletters par semaine. Un thème n'est donc retenu comme candidat que s'il apparaît dans
**au moins trois envois d'expéditeurs différents sur quatre semaines**. Sans ce seuil, une
obsession passagère d'un seul auteur deviendrait un candidat driver.

### Droit d'auteur — les règles, plus strictes qu'ailleurs

Une newsletter est une œuvre protégée, et le fait de la recevoir ne donne que le droit de la
lire.

- **Stocker au maximum : expéditeur, date, objet, liens, et un résumé court reformulé par
  sujet.** Jamais le corps du message.
- **Aucune citation** au-delà de quelques mots, et une seule par envoi si vraiment nécessaire.
- **Aucun résumé qui dispenserait de lire l'original.** Deux ou trois phrases par sujet, pas
  un condensé de chapitre.
- Les notes publiées **n'attribuent pas** un raisonnement à une newsletter privée : elles
  citent la source primaire que la newsletter pointait. Si aucune source primaire n'existe,
  le point n'entre pas dans la note.

Cette dernière règle est aussi une règle de qualité : elle force à remonter au fait.

### La frontière avec le contrôle des chiffres

**Aucun nombre issu d'une newsletter n'entre dans une note.** Le contrôle bloquant vérifie
chaque chiffre contre la base ; un chiffre de newsletter n'y est pas et ne peut pas l'être.

Si une newsletter mentionne une donnée intéressante, deux issues seulement : soit
l'instrument est collecté et la note cite **votre** valeur, soit il ne l'est pas et c'est une
lacune de données à traiter — pas un chiffre à recopier.

C'est contraignant, et c'est ce qui garde la garantie intacte. Une exception ici viderait le
contrôle de son sens partout ailleurs.

### Stockage

Les items de newsletter vivent **dans la base de l'application**, avec les autres
`VeilleItem`, distingués par `sourceType: 'newsletter'` et `autorite: 'moyenne'`.

Un stockage parallèle dans un autre outil créerait un second système que le pipeline de
rédaction ne voit pas — donc une source de vérité concurrente. Si un condensé hebdomadaire
lisible ailleurs est souhaité, qu'il soit une **sortie** du pipeline, jamais son magasin.

### Autorité et déclenchement

`autorite: 'moyenne'`. Conséquence directe : **une newsletter ne lève jamais d'alerte à elle
seule.** Elle signale qu'il se passe quelque chose et envoie chercher la source primaire —
exactement le traitement réservé à GDELT.

Si la source primaire existe et confirme, c'est elle qui déclenche. Si elle n'existe pas,
c'est un trou de couverture, pas une alerte.

### Ingestion technique

Point pratique à ne pas sous-estimer : le connecteur Gmail disponible en conversation n'est
pas accessible depuis un cron ou une action planifiée. L'ingestion demande soit un accès
programmatique à la boîte avec un jeton de rafraîchissement stocké en secret, soit une adresse
dédiée vers laquelle les newsletters sont redirigées et relevée par un service de réception.

La seconde voie est plus simple et plus propre : elle isole le périmètre — seul ce que vous
redirigez est lu — et évite de donner à l'application un accès à l'ensemble de votre
correspondance. C'est aussi la voie qui vous permet de choisir précisément quelles newsletters
entrent.
