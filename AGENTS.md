# Agents — qui fait quoi sur Marguerite

Mode d'emploi de l'équipe d'agents qui exécute `ROADMAP.md`. En langage clair d'abord, les
règles ensuite. Les définitions des agents sont dans `.claude/agents/`.

## En une minute

Une **session principale** (l'orchestrateur) lit la roadmap, confie chaque tâche à l'agent qui
possède les fichiers concernés, relit son travail, le fusionne sur `main` et tient les
documents à jour. Cinq **agents exécutants** codent, chacun dans son couloir. Trois
**agents en lecture seule** conseillent ou documentent ; ils ne modifient jamais le code.
**Nicolas tranche** les décisions et **est le seul à publier une note.**

| Agent | Rôle | Modèle | Écrit dans le dépôt |
|---|---|---|---|
| `notes-analyse` | La note : blocs, rédaction, guets, drivers, scénarios, outlooks (contenu), assistant IA (prompts) | Sonnet | oui |
| `data-marches` | Collecte, schéma Supabase, calculs YTD/hebdo, fraîcheur, **calendrier des publications** | Sonnet | oui |
| `veille-alertes` | Veille, moteur d'alertes de prix et d'événement, **détection des breaking news**, angles morts, calendrier des échéances des drivers | Sonnet | oui |
| `design` | Interface, `DESIGN.md`, maquettes, marque Transmission | Sonnet | oui |
| `plateforme` | Accès admin, back-office, sécurité, newsletter, comptes, paiement | Sonnet | oui |
| `advisor-technique` | Avis sur les décisions qui engagent plusieurs agents | Opus | non |
| `redacteur-en-chef` | Relit chaque brouillon de note sur le fond, avis consultatif | Opus | non |
| `documentaliste` | Rédige la mise à jour de la cartographie Notion après chaque changement d'architecture | Sonnet | non |

Un sous-agent ne peut pas en appeler un autre : **c'est toujours l'orchestrateur qui consulte
les advisors et le documentaliste**, aux points de contrôle ci-dessous.

## Propriété des fichiers

Chaque fichier a **un seul propriétaire** (le détail est dans chaque définition d'agent). Un
agent lit tout, mais ne modifie que son périmètre. Besoin d'un changement ailleurs : il
l'écrit dans son compte rendu, l'orchestrateur le confie au propriétaire.

Zones communes et leur propriétaire unique :

| Zone | Propriétaire | Pourquoi |
|---|---|---|
| `supabase/schema.sql`, `lib/types.ts`, `data/seed.json` | `data-marches` | Un seul auteur de migrations |
| Calcul des variations hebdo et YTD (`lib/performance.ts`) | `data-marches` | Un calcul pour J1.2 et J7.1, jamais deux |
| `config/calendrier-publications.ts` | `data-marches` | Dates officielles des instituts |
| `config/calendrier-drivers.ts` | `veille-alertes` | Échéances qui ancrent les guets et révèlent une collecte en défaut |
| `app/redaction/actions.ts` / interface du portail | `notes-analyse` / `design` | Logique d'un côté, rendu de l'autre |
| `app/admin/veille/actions.ts` / interface de la file | `veille-alertes` / `design` | Idem |
| `package.json`, `next.config.ts`, `middleware.ts` | `plateforme` | Dépendances et sécurité |
| `CLAUDE.md` | chaque agent amende **sa** section ; l'orchestrateur arbitre | Le cahier des charges reste unique |
| `ETAT.md`, `ROADMAP.md`, `AGENTS.md` | orchestrateur | Une seule voix sur l'état du projet |

## Circuit de livraison

1. L'orchestrateur choisit une tâche de `ROADMAP.md` (non bloquée, décisions tranchées) et la
   confie à son agent, sur une branche `agent/<agent>/<tâche>` (ex. `agent/data/J7.1`).
2. L'agent code, commits atomiques en français, puis lance `npx tsc --noEmit`,
   `npx vitest run`, `npm run lint`. Il rend son **compte rendu de fin**.
3. L'orchestrateur relit, consulte `advisor-technique` si la tâche touche une zone commune,
   **vérifie que `CLAUDE.md` et `DESIGN.md` reflètent le changement** (un chiffre de couverture
   se recompte, il ne se déduit pas), et fusionne sur `main`. **Il est le seul à pousser sur
   `main`.**
4. Il met à jour `ROADMAP.md` (statut), `ETAT.md`, et l'artefact Roadmap.
5. **Si l'architecture a changé** (voir plus bas), il appelle `documentaliste` et reporte sa
   rédaction dans la page Notion **dans la même session**.

Deux agents ne travaillent jamais en même temps sur le même fichier. En parallèle, des
couloirs différents seulement. **Le nombre d'agents en parallèle est laissé à l'appréciation de l'orchestrateur (décision de Nicolas, 30/10), trois au plus en pratique** : il le fixe selon la taille des tâches et surtout l'absence de recouvrement de fichiers, de branche de base et de schéma (`supabase/schema.sql` n'a qu'un auteur à la fois), et fusionne une branche à la fois.

## Publication d'une note : l'advisor relit, Nicolas décide

1. Samedi 8 h UTC : `note-hebdo.yml` rédige le brouillon (inchangé).
2. **Relecture du rédacteur en chef** : avis sur le fond (thèse, canaux de transmission,
   justification des révisions, guets, sources, conformité). Tant que J1.7 n'est pas codé,
   l'orchestrateur appelle `redacteur-en-chef` à la demande de Nicolas ; ensuite l'avis est
   produit dans le workflow et affiché dans le portail.
3. **L'avis est consultatif.** Il n'ajoute aucune condition de publication, ne modifie pas le
   brouillon, ne déclenche jamais `publier-note.yml`.
4. Nicolas tranche dans `/redaction` et clique sur Publier. **Personne d'autre — ni agent, ni
   advisor, ni workflow — ne publie.**

Même règle pour une note spéciale ouverte par une alerte.

## Breaking news → note spéciale

`veille-alertes` construit la détection ; `notes-analyse` le prompt de la spéciale (trois
blocs) ; Nicolas publie. Une spéciale n'existe que si un **seuil objectif** est franchi
(tableau de `CLAUDE.md`) ou si une alerte d'événement réunit **les trois conditions** :
rattachée à un driver et classée signal ; source d'autorité maximale ; elle résout un guet
ouvert ou sa matérialité est haute sans guet (→ angle mort). Silence de cinq séances par
driver ; un prix et un événement sur le même driver fusionnent. Détection fréquente par
GitHub Actions (le plan Vercel Hobby n'autorise qu'un cron par jour) — tâche J5.6.

## Rapport hebdomadaire : chaque samedi à 11 h, heure de Paris

Chaque samedi à 11 h (Europe/Paris), l'orchestrateur remet à Nicolas un rapport sur le travail
des agents. Il tombe **après** le brouillon de la note (samedi 8 h UTC) : Nicolas lit la note,
puis l'état du chantier. Une seule voix, celle de l'orchestrateur ; `advisor-technique` fournit
l'ordonnancement et le calcul des délais. Le rapport est versionné dans `rapports/AAAA-Sxx.md`.

Contenu, dans cet ordre, **résultat d'abord** :
1. **Le résultat en deux phrases** : où on en est, et la décision de Nicolas qui débloque le plus.
2. **Ce qui a été fait**, par agent : tâches de `ROADMAP.md` cochées, branches fusionnées
   (commits), tests ; ce qui est commencé sans être fini.
3. **Point de situation** : compteurs par jalon (x/y), comparés à la semaine précédente.
4. **Ce qui reste**, en trois piles : *prêt à démarrer* (les trois prochaines tâches de chaque
   agent), *bloqué* (et par quoi), *à trancher par Nicolas* (classé par nombre de tâches
   débloquées).
5. **Délais** : la **prochaine étape** (quoi, quand) et la **fin de chaque jalon et de la
   roadmap**, en fourchette. Calcul : charge restante (tâches × taille) ÷ **budget de tokens
   hebdomadaire de Nicolas**. Seules comptent les tâches non bloquées : une tâche « À trancher »
   non tranchée porte « délai non calculable », jamais une date. Les échéances dures (J7.11 et
   J7.13 avant le 15/11, la note du samedi) sont listées à part.
6. **Hypothèses et écarts** : faits, hypothèses et avis séparés ; l'écart avec les délais annoncés
   la semaine précédente, et sa cause.

Règles : chiffres tirés des fichiers et de git, jamais de mémoire ; une case cochée mais non
fusionnée n'est pas faite ; **aucun délai sans budget de tokens renseigné** — le rapport le dit
en tête et ne donne alors que l'ordre et la charge relative. Les tailles (S/M/L) de chaque tâche
et leur équivalent en tokens se calibrent sur la consommation réelle des deux premiers rapports,
elles ne se devinent pas. La routine planifiée qui produit le rapport consomme des tokens chaque
semaine : elle se crée sur accord de Nicolas (tâche JA.3).

## Cartographie Notion : à jour à chaque changement d'architecture

Fil rouge : **une personne qui n'a jamais travaillé sur Marguerite doit pouvoir se mettre au
niveau en lisant la page Notion** « Marguerite — Cartographie du moteur de notes & glossaire »
(https://www.notion.so/407da7c52a1681cabdc3fcb56eb91d45).

Une fusion touche l'architecture dès qu'elle modifie l'un de ces éléments :

- un workflow (`.github/workflows/`), le cron (`app/api/cron/`), `vercel.json` ;
- le pipeline de rédaction ou de publication (`lib/redaction/`, `scripts/*note*`) ;
- la veille, les alertes, les angles morts (`lib/veille/`, `lib/alerts.ts`, `config/veille-*`,
  `config/calendrier-*`) ;
- le modèle analytique (`content/drivers.ts`, `content/axes.ts`, types `Guet`, scénarios,
  tendances, thèmes) ou la structure d'une note (blocs, conditions de publication) ;
- une source de données, une table ou une colonne (`supabase/schema.sql`, `config/*-series.ts`) ;
- les routes, l'authentification, le back-office, un service externe (newsletter, paiement) ;
- l'organisation des agents (ce fichier, `.claude/agents/`).

Dans ce cas, avant de clore la session, l'orchestrateur : (1) appelle `documentaliste` avec le
dernier commit consigné au journal des revues (§11 de la page) ; (2) reporte le texte dans les
sections indiquées ; (3) ajoute une ligne au journal. Si la session n'a pas d'accès Notion, il
l'écrit dans `ETAT.md` sous « Cartographie Notion à reporter », et la session suivante le fait
en premier. La revue mensuelle (premier dimanche du mois, tâche planifiée Cowork) reste le
filet de sécurité.

## Quand consulter un advisor

- `advisor-technique` **pour l'ordonnancement** : au début de chaque session et après chaque
  fusion qui change l'état d'un jalon, l'orchestrateur lui demande l'ordre de travail des agents
  d'après `ROADMAP.md` (chemin critique, files par agent, ce qui part en parallèle, décisions à
  faire trancher). Il propose ; l'orchestrateur met à jour la roadmap.
- `advisor-technique` pour les décisions : schéma, types partagés, format MDX ou liste des blocs, nouvelle
  dépendance, conflit de périmètre, architecture d'un jalon (J2, J5, J6, J8, J9).
- `redacteur-en-chef` : chaque brouillon de note, chaque changement de prompt de rédaction
  ou de l'assistant IA (avant de rejouer le jeu d'évaluation J6.7).
- **Hors agents** — J9.1 (cadre réglementaire et employeur) relève d'un conseil humain
  (avocat ou conformité) : aucun agent ne tranche ce point, et rien n'est envoyé à
  l'extérieur avant.

## Ce qu'aucun agent ne fait

Publier une note · réécrire une note publiée (erratum seulement) · inventer une donnée ·
réécrire l'historique Git · envoyer quoi que ce soit à l'extérieur · trancher une tâche
« À trancher » · exposer une clé au navigateur.

## Ordre de démarrage (au 28/10/2026)

*Première version, écrite à la main : elle est remplacée par l'ordonnancement que produit
`advisor-technique` à chaque session.*

1. `data-marches` : J1.2 / J7.1 (calcul des variations hebdo et YTD, bloquant pour deux
   jalons), puis J7.11 et J7.13 **avant le 15/11** (les outlooks 2027 arrivent mi-novembre).
2. `plateforme` : J2.1, dès que les trois décisions d'`ETAT.md` sont prises.
3. `design` : J4.1 (audit), J7.12 (sélecteur de millésime), maquette de marque (JT.1).
4. `notes-analyse` : J1 dès que J1.1 est tranché ; J3.1 en attendant.
5. `veille-alertes` : J5.1 à faire trancher ; en attendant, saisie de
   `config/calendrier-drivers.ts` (vide) et rejeu des seuils sur l'historique.
