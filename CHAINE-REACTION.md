# Rendre la chaîne opérationnelle — checklist

Cas de référence : la Fed relève ses taux le 16 septembre. Que faut-il pour que ça remonte
dans l'application et qu'une bascule de scénario soit proposée ?

---

## La chaîne complète, et où elle casse

| # | Maillon | État |
|---|---|---|
| 1 | Le taux directeur est collecté depuis FRED | À vérifier |
| 2 | Le communiqué de la Fed est capté par la passe 1 | **Cassé** — seul EDGAR passe |
| 3 | La passe 2 le classe signal et le rattache au driver taux | Jamais exécutée |
| 4 | Le paquet de contexte le porte au modèle | Dépend de 1 à 3 |
| 5 | Le modèle rédige et propose la bascule de branche | Jamais exécuté |
| 6 | Vous validez dans `/redaction` | Opérationnel |
| 7 | Hors samedi : une alerte lève un brouillon de spéciale | **Inexistant** |

Les maillons 1 à 6 suffisent pour que ça apparaisse **le samedi**. Le maillon 7 est ce qui
permet de réagir dans la journée.

---

## Bloc A — Faire paraître la note du samedi

C'est là que se trouve l'essentiel du gain. Six étapes, dans l'ordre, sans en sauter.

### A1. Diagnostiquer le plafond de la passe 1

Hypothèse principale : les items sont triés par autorité décroissante avant troncature, et les
dépôts réglementaires saturent les quarante places. Ce qui expliquerait exactement le symptôme
— seul EDGAR remonte.

> Vérifie l'ordre d'application du plafond quotidien en passe 1 : les items sont-ils triés par
> autorité avant troncature ? Montre-moi le volume brut par source avant et après plafond sur
> les sept derniers jours, sans rien modifier. Vérifie aussi que les flux RSS des banques
> centrales sont bien configurés et répondent — un flux mort ne produit aucune erreur visible.

Si c'est le plafond, la correction est un quota par famille de source plutôt qu'un classement
global.

### A2. Restreindre le paquet de contexte aux données collectées

Sans ça, le contrôle bloquant des chiffres compare de l'inventé à de l'inventé.

> Restreins le paquet de contexte aux séries réellement collectées. Un instrument servi par le
> seed y figure avec `fraicheur: 'absent'` et sans valeur. Ajoute un test qui échoue si une
> valeur de seed entre dans le paquet.

### A3. Vérifier que le taux directeur est collecté

> Le taux des fed funds figure-t-il dans les séries collectées depuis FRED ? Montre-moi sa
> dernière valeur et sa date. Si la hausse du 16 septembre n'y est pas, dis-moi pourquoi.

C'est le test le plus parlant : si la donnée n'est pas en base, le modèle ne pourra pas citer
le nouveau niveau, et le contrôle des chiffres bloquera à juste titre.

### A4. Lancer la passe 2 et la laisser courir

> Lance la passe 2 manuellement sur les items déjà collectés. Montre-moi combien classés,
> combien retenus signal, la répartition par driver et par source, et le coût en jetons.
> Confirme que le modèle utilisé est bien Haiku 4.5.

Puis **deux jours** de fonctionnement avant de juger quoi que ce soit.

### A5. Poser les axes et trois guets — votre part, sans code

> À partir de `content/drivers.ts` et de l'état des scénarios, propose-moi trois à cinq axes
> par driver selon `axes-de-surveillance.md`. Rends-les en tableau, n'écris rien dans le code.

Vous corrigez, puis vous écrivez trois guets à la main. Sans eux, la première note n'a rien à
confirmer ni à infirmer.

### A6. Le dry-run, puis le test du garde-fou

> Lance `npm run note:draft -- --dry-run`. Affiche le MDX produit, le rapport de contrôle des
> chiffres, le modèle utilisé et le coût. N'écris rien, ne commite rien.

Ce que vous vérifiez : la décision de la Fed est-elle dans le paquet, le modèle propose-t-il la
bascule sur le driver taux, les guets proposés sont-ils testables.

Puis :

> Modifie un chiffre du brouillon pour qu'il ne corresponde plus aux données, et relance.
> Je veux voir le contrôle bloquer la publication.

Un garde-fou qu'on n'a jamais vu se déclencher n'est pas un garde-fou.

### A7. Activer la planification

Seulement après deux dry-runs jugés corrects.

> Ajoute le `schedule` à `note-hebdo.yml` : samedi, après la collecte du matin qui rapatrie la
> clôture du vendredi. Confirme-moi l'expression cron et l'heure française correspondante.

---

## Bloc B — Réagir hors du samedi

À traiter après la première note publiée, pas avant.

### B1. Collecter le Bund et l'OAT

Prérequis : deux des règles d'alerte portent sur des spreads qui n'existent qu'au seed.
Source ECB Data Portal, gratuite, sans clé. Les deux spreads deviennent des instruments
dérivés calculés à l'insertion.

### B2. Construire le moteur d'alertes de prix

L'étape 4 du cahier, jamais construite. Les cinq règles d'implémentation y figurent déjà :
calcul sur clôtures, fenêtre glissante cumulée, période de silence de cinq séances, sens
enregistré, l'alerte notifie sans rédiger.

### B3. Construire le pont veille vers alerte

L'étape 7. `resoutGuet` et `materialite` en sortie de passe 2, `AlertEvent` de type
`evenement`, compteur d'angles morts par driver, brouillon de spéciale automatique.

C'est ce maillon qui aurait produit un brouillon mercredi soir plutôt que samedi.

---

## Une correction à faire cette semaine

**La branche dominante du driver taux est factuellement fausse.** Le statu quo prolongé n'est
plus le scénario central depuis le 16 septembre, et le dot plot en annonce une autre d'ici la
fin de l'année.

Ne la corrigez pas à la main dans le code : faites-la passer par le bloc 3 de la première note,
avec sa justification. C'est le circuit prévu, et ça donne à la note un contenu réel plutôt
qu'un exercice.

---

## Ce qui ne sera jamais automatique

La bascule de branche elle-même. Le modèle propose, avec les événements qui la motivent ; vous
acceptez ou refusez dans `/redaction`. Aucune `ScenarioVersion` n'est créée autrement.

C'est ce qui fait que la vue Trajectoire mesure vos jugements. Si la machine les écrivait, elle
ne mesurerait plus que la vitesse à laquelle un modèle suit les prix.
