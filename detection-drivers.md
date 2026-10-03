# Détection des drivers — thèmes sous observation et angles morts

À insérer dans `CLAUDE.md`. Remplace la règle de seuil « trois émetteurs différents sur quatre
semaines » de la section newsletters, et complète « Promouvoir un candidat en driver ».

---

## Les trois sources d'un candidat driver

| Source | Ce qui déclenche | Nature du signal |
|---|---|---|
| **Outlooks** | Un thème recommandé qui ne rentre dans aucun driver | Consensus — le marché suit une force absente de la grille |
| **Thèmes sous observation** | Une thèse d'auteur confirmée par les instruments | Empirique — quelqu'un a vu avant les autres |
| **Angles morts** | Des événements majeurs sans axe de rattachement | Structurel — la grille a un trou |

Les trois convergent vers le même circuit : candidat → en observation → actif.

---

## Le thème sous observation

### Le principe

Un auteur isolé avance une thèse. Elle n'est pas consensuelle, donc elle n'apparaît ni sur la
page consensus ni dans une majorité de sources. Elle peut être une obsession personnelle — ou
une lecture en avance.

**On ne tranche pas sur le nombre de gens qui la portent. On tranche sur ce que font les
instruments.**

C'est la logique des guets, appliquée un cran au-dessus : au lieu de pré-inscrire une attente
sur un événement, on pré-inscrit une attente sur une thèse.

### Pourquoi le seuil social était le mauvais

Un seuil de popularité retient ce qui est déjà partagé — donc déjà dans les prix, donc sans
valeur pour qui le découvre à ce moment-là. Un seuil empirique retient ce que les prix
commencent à valider avant que le consensus ne s'en saisisse.

### La forme

```ts
type ThemeObserve = {
  id: string;
  libelle: string;                 // 'Risque souverain français'
  origine: 'notion' | 'outlook' | 'note';
  emetteur: string;                // qui l'avance, nommément
  these: string;                   // ce qu'il affirme, en une phrase
  dateOrigine: string;

  // Le cœur du mécanisme — obligatoire
  instrumentsTemoins: string[];    // ce qui confirmerait ou infirmerait
  confirmeSi: string;              // seuil chiffré, pas une impression
  infirmeSi: string;
  echeance: string;                // date de verdict

  statut: 'observe' | 'confirme' | 'infirme' | 'expire';
  mentions: Array<{ date: string; source: string; emetteur: string }>;
  verdictLe: string | null;
  verdictPar: string | null;       // slug de la note qui a tranché
};
```

### Deux règles dures

**Les instruments témoins doivent être collectés.** Une thèse dont rien dans la base ne peut
dire si elle se vérifie n'est pas observable — c'est de l'opinion. Si l'instrument manque,
le thème est marqué `lacune-donnee` et devient une priorité de collecte, pas un candidat.

C'est ce qui relie la détection de drivers au chantier des données : **ce qu'on ne mesure pas,
on ne peut pas le promouvoir.**

**Le seuil est chiffré.** « Le spread OAT-Bund dépasse 150 points de base en clôture » se
vérifie. « Les tensions sur la dette française s'aggravent » ne se vérifie pas. Sans chiffre,
le thème est refusé à la création.

### Le cycle

Un thème sous observation est **créé** depuis la fiche Notion ou un outlook, proposé par le
modèle avec son seuil, validé par vous dans `/redaction` — comme un guet.

À l'échéance, trois issues :

- **Confirmé** — les instruments ont validé. Le thème devient **candidat driver** et entre dans
  le circuit habituel : question fermée, deux axes, condition de retrait.
- **Infirmé** — les instruments ont démenti. Le thème est archivé, et sa trace reste : savoir
  qu'une thèse a été testée et rejetée vaut mieux que de la retester dans six mois.
- **Expiré** — sans verdict. Il remonte une fois dans la note suivante, puis s'archive.

**Cinq thèmes sous observation au maximum.** Au-delà, on surveille tout, donc rien.

### Exemple

> **Risque souverain français** — avancé par une seule maison, octobre 2026.
> *Thèse* : la trajectoire budgétaire française est le sujet sous-estimé de 2027.
> *Instruments témoins* : spread OAT-Bund, OAT 10 ans.
> *Confirmé si* : le spread dépasse 150 pb en clôture avant le 31/01/2027.
> *Infirmé si* : il reste sous 110 pb sur toute la période.
> *Échéance* : 31/01/2027.

Si le spread passe le seuil, un auteur isolé avait raison avant le consensus, et le sujet
mérite son driver. S'il ne le passe pas, c'était une obsession, et on le sait.

*Note : ce thème est aujourd'hui inobservable — le Bund et l'OAT ne sont pas collectés.
Il serait créé en `lacune-donnee`, ce qui est en soi l'information utile.*

---

## Le compteur d'angles morts

### Ce qu'il mesure

**L'incomplétude de la grille, pas la vigilance.**

Chaque événement classé par la passe 2 se rattache à un axe, ou ne se rattache à rien.
Un événement de matérialité haute qui ne trouve aucun axe signale que le modèle du driver n'a
pas de case pour lui.

### L'exemple réel de la semaine S38

Les Houthis prennent des îles dans Bab el-Mandeb ; l'oléoduc saoudien de contournement d'Ormuz
est frappé par drones.

Les axes du driver Iran portaient sur le transit d'Ormuz et l'état des négociations. **Aucun
ne couvrait les voies de contournement.** L'axe a dû être créé à la rédaction de la note.

C'est un angle mort caractérisé : matérialité haute, driver identifiable, aucun axe
correspondant. Et il était détectable mécaniquement.

### La distinction qui compte

| | Ce que c'est | Ce que ça dit |
|---|---|---|
| Événement **imprévu** | Personne ne pouvait le dater | Normal, aucune conclusion |
| **Angle mort** | La grille n'avait pas de case | Il manque un axe ou un driver |

Un centre de données dans l'espace est imprévisible dans son détail, mais tombe sur l'axe
« contrainte physique » du driver IA. Ce n'est **pas** un angle mort : le cadre a fonctionné.

### La mesure

```ts
type AngleMort = {
  id: string;
  evenementId: string;
  date: string;
  materialite: 'haute';            // seuls les hauts comptent
  driverId: string | null;         // null = aucun driver ne convient
  axeManquantPropose: string | null;
  statut: 'ouvert' | 'resolu';     // résolu = un axe ou un driver a été créé
  resoluPar: string | null;
};
```

Deux compteurs distincts, affichés sur la page du driver et sur l'écran d'accueil :

- **Angles morts avec driver, sans axe** — il manque une dimension à un driver existant.
  Seuil d'alerte : trois sur le même driver en un trimestre.
- **Angles morts sans driver** — le marché suit une force absente de la grille.
  Seuil d'alerte : deux sur un même sujet en un trimestre.

### Ce qu'on en fait

Un angle mort ne crée rien automatiquement. Il apparaît dans le paquet de contexte de la note
suivante, et le modèle propose l'axe ou le driver manquant au bloc 3. Vous tranchez.

Le compteur est l'instrument de mesure le plus honnête du dispositif : il ne dit pas si vous
avez eu raison, il dit si votre cadre a pu accueillir ce qui s'est produit.
