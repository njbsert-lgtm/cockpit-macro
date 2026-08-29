# Section à insérer dans CLAUDE.md

**Emplacement** : après « Ce qui rend une note analytique et non descriptive », avant
« Cadence ». Elle remplace la phrase « les cinq blocs analytiques restent à vous » de la
passe 3, et le point 5 du moteur d'alertes (« l'alerte notifie, elle ne rédige pas »)
devient « l'alerte déclenche un brouillon rédigé, dont la publication reste humaine ».

---

## Rédaction assistée : ce que le modèle écrit, ce qui reste humain

**Renversement assumé d'un principe antérieur.** Le cahier posait que l'automatisation ne
rédige jamais. Elle rédige désormais. Ce qui ne change pas : **elle ne publie pas.**

La distinction n'est pas cosmétique. Un brouillon rédigé fait gagner l'heure de recopie de
chiffres, qui n'a aucune valeur analytique. Une publication automatique ferait disparaître le
seul geste qui en a une : trancher. Toute la spécification qui suit tient à cette frontière.

### Le contexte, seul horizon du modèle

Le modèle **n'a aucun accès au web au moment de rédiger**. Il reçoit un paquet de contexte
construit par nous, et rien d'autre. Ce qui n'y figure pas ne peut pas entrer dans la note.

```ts
type ContextePaquet = {
  noteType: 'hebdo' | 'speciale';
  isoWeek: string;
  comparesTo: string;              // slug de la note de référence
  notePrecedente: {                // ce à quoi on se compare, texte intégral
    regimeStatement: string;
    blocs: Record<string, string>;
    driverOrder: string[];
  };
  observations: Array<{            // valeurs de la semaine, depuis la base
    instrumentId: string; label: string;
    valeurs: Array<{ date: string; value: number }>;
    variationSemaine: number; variationYTD: number;
    fraicheur: 'ok' | 'retard' | 'absent';
  }>;
  alertes: AlertEvent[];           // seuils franchis dans la période
  itemsVeille: VeilleItem[];       // items classés signal, non encore versés
  scenariosCourants: ScenarioVersion[];
  tendancesCourantes: Trend[];
  trigger: string | null;          // pour une spéciale
};
```

**Règle de suffisance.** Si le paquet est vide ou dégradé — collecte en échec, aucune alerte,
aucun item de veille —, le modèle produit une note courte qui le dit explicitement. Il ne
comble jamais un contexte pauvre par des généralités de marché. Une semaine sans matière
produit trois paragraphes honnêtes, pas deux pages de meublage.

### Répartition par bloc

Chaque bloc porte un champ `authorship`, affiché discrètement sur la note publiée.
Le lecteur — c'est-à-dire vous dans six mois — doit savoir qui a écrit quoi.

| Bloc | Rédaction | Statut requis pour publier |
|---|---|---|
| 1. Ce qui a changé | Modèle | `ia-relue` |
| 2. Ce qui s'est confirmé | Modèle | `ia-relue` |
| 3. Révision des scénarios | Modèle propose, humain tranche | `humaine` ou `ia-corrigee` |
| 4. Ce que j'avais mal lu | **Humain seul** | `humaine` |
| 5. Ce que je surveille | Modèle propose | `ia-relue` |
| Consolidation des spéciales | Modèle | `ia-relue` |
| Le fil de la semaine | Modèle | `ia-relue` |

Valeurs possibles : `ia` (brouillon jamais touché), `ia-relue` (ouvert et validé sans
modification), `ia-corrigee` (modifié), `humaine` (écrit de bout en bout).

**Le bloc 4 n'est jamais pré-rempli.** Le modèle ne peut pas savoir ce que vous aviez mal lu :
il connaît vos textes, pas votre intention. Un modèle qui remplit ce bloc produit une
auto-critique plausible et creuse, et détruit exactement ce que le bloc existe pour capter.
Le champ s'ouvre vide. Écrire « rien de notable cette semaine » est une réponse valide —
c'est la saisie qui compte, pas la longueur.

**Le bloc 3 est proposé, jamais appliqué.** Le modèle peut suggérer qu'une vraisemblance a
bougé et écrire la justification. Mais **aucune `ScenarioVersion` n'est créée sans validation
humaine explicite** : la trajectoire d'un scénario est un historique de vos jugements, pas de
ceux d'un modèle. Une proposition non validée reste une proposition et n'entre pas dans la
vue Trajectoire.

Même règle pour les changements de statut de tendance et pour `driverOrder`.

### Le contrôle des chiffres — bloquant

C'est le garde-fou le plus important du pipeline, parce que c'est la faute la plus
indétectable à la lecture.

Après génération, chaque nombre du texte est extrait et confronté au paquet de contexte.

- Une valeur qui ne correspond à aucune donnée du paquet **bloque la publication**.
  Elle ne signale pas, elle bloque.
- La tolérance est celle de l'arrondi déclaré par instrument, pas une marge libre.
- Une variation calculée par le modèle est recalculée par nous et comparée.
- Un pourcentage de vraisemblance qui ne figure pas dans `scenariosCourants` et n'a pas été
  validé au bloc 3 est un chiffre inventé : blocage.

Le rapport de contrôle liste chaque nombre, sa source, et son verdict. Il est consultable
depuis le portail de validation.

**Pourquoi bloquant et non signalant.** Un chiffre légèrement de travers dans une phrase bien
tournée est invisible à la relecture — c'est précisément ce qu'un modèle produit quand il
reformule. Un avertissement qu'on peut ignorer sera ignoré au bout de trois semaines.

### Ce que le modèle n'a pas le droit de faire

Vérifié mécaniquement, pas par le prompt :

- **Réécrire la `regimeStatement` sans le signaler.** Il peut la proposer différente ; le
  portail affiche alors une comparaison avec l'ancienne et demande une décision.
- **Introduire un instrument, un driver ou une tendance absents du paquet.**
  Toute référence à un identifiant inconnu bloque le rendu.
- **Citer une source absente de `itemsVeille`.** `Note.sources` se construit à partir des
  items effectivement versés, jamais depuis le texte généré.
- **Écrire au conditionnel généralisé.** Une note qui multiplie « pourrait », « semblerait »
  et « il conviendra de surveiller » n'a pas tranché. Un contrôle de style signale les
  formules d'atténuation au-delà d'un seuil par bloc. Signalement, pas blocage.

### Le portail de validation

Accessible à `/redaction`. C'est le seul chemin vers la publication.

Il présente, dans cet ordre :

1. **Le rapport de contrôle des chiffres**, en premier. Si un blocage subsiste, la
   publication est indisponible et le bouton dit pourquoi.
2. **Les blocs**, chacun éditable, avec son `authorship` courant. Un bloc ouvert et refermé
   sans modification passe de `ia` à `ia-relue` ; modifié, il passe à `ia-corrigee`.
3. **Les propositions de révision** — scénarios, tendances, ordre des drivers — chacune avec
   deux boutons : accepter, refuser. Aucune n'est cochée par défaut.
4. **Le bloc 4**, vide, en champ de saisie.

**Conditions de publication**, toutes nécessaires :
- Aucun blocage sur les chiffres
- Le bloc 4 est renseigné
- Aucun bloc n'est resté au statut `ia`
- Toute proposition de révision a été acceptée ou refusée explicitement

**Le principe qui gouverne ce portail : la validation doit coûter quelque chose.**
Un bouton « Tout publier » qui accepte tout en un geste serait actionné sans lecture au bout
d'un mois, et la note deviendrait une synthèse d'actualité signée de votre nom. Il n'y a donc
pas de validation globale, et le bloc 4 impose une frappe réelle à chaque note.

### Le cycle hebdomadaire

`note-hebdo.yml`, GitHub Actions, dimanche soir. GitHub Actions plutôt qu'un cron Vercel :
le plan Hobby n'autorise qu'un déclenchement quotidien, déjà pris par la collecte, et le
commit se fait naturellement là où vivent les MDX.

Le workflow :
1. Construit le paquet de contexte depuis la base
2. Appelle le modèle
3. Passe le contrôle des chiffres
4. **Commite un brouillon** — `status: brouillon` dans le frontmatter, sur la branche `main`

**Un brouillon n'est jamais rendu dans le fil ni dans l'étagère.** Il n'existe que dans
`/redaction`. La publication est un acte humain qui bascule `status` à `publiee` et fige
`publishedAt`.

Si le contrôle des chiffres échoue, le brouillon est commité quand même, avec son rapport
d'échec attaché : un brouillon bloqué est plus utile qu'un silence, il vous dit qu'il y a un
problème de données à regarder.

**Aucune notification.** Vous ouvrez `/redaction` le dimanche soir parce que c'est votre
rituel, pas parce qu'une alerte vous y pousse.

### Les notes spéciales

Même pipeline, déclenché par le moteur d'alertes plutôt que par le calendrier. Le point 5 du
moteur d'alertes se lit désormais : **l'alerte déclenche un brouillon rédigé, dont la
publication reste humaine.** Le paquet de contexte porte alors `trigger` renseigné, et le
modèle ne rédige que les trois blocs requis.

Un brouillon de spéciale qui n'est pas publié dans les cinq jours est archivé
automatiquement : l'alerte s'est révélée être du bruit, et c'est une information en soi.
Le compte de brouillons abandonnés par famille de driver mérite d'être visible — un seuil qui
génère beaucoup d'abandons est un seuil mal calibré.

### Développement local

`npm run note:draft -- --dry-run` construit le paquet, appelle le modèle, passe le contrôle
et affiche le MDX sans rien écrire. C'est ce qui permet d'itérer sur le prompt sans polluer
le dépôt.

`npm run note:draft -- --week=2026-S33 --dry-run` rejoue une semaine passée : le seul moyen
honnête d'évaluer le pipeline est de lui faire rédiger une semaine dont vous connaissez déjà
la bonne réponse, et de comparer.
