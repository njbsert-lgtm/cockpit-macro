# État du projet — au 30/10/2026

Point d'entrée pour reprendre le travail. **`CLAUDE.md` (cahier des charges) et `DESIGN.md`
(charte) font autorité** ; **`ROADMAP.md`** dit ce qui reste à faire et qui le fait,
**`AGENTS.md`** dit comment on travaille ; ce fichier dit où on en est par rapport à eux, et ce qui a été discuté
sans être fait. `CHAINE-REACTION.md`, `couche-intelligence.md` et `newsletters-veille.md` sont des
documents de cadrage plus anciens (début octobre) : utiles pour l'historique, pas à jour.

## Organisation en agents (28/10/2026)

Le travail est désormais réparti entre cinq agents exécutants (`notes-analyse`,
`data-marches`, `veille-alertes`, `design`, `plateforme`), deux advisors en lecture seule
(`advisor-technique`, `redacteur-en-chef`) et un `documentaliste`, sous la conduite de la
session principale. Règles, propriété des fichiers et circuit de livraison : **`AGENTS.md`**.
Feuille de route versionnée, avec l'agent de chaque tâche : **`ROADMAP.md`** (elle était
jusqu'ici seulement dans l'artefact). Points clés :
- **Seul l'orchestrateur pousse sur `main`** ; chaque agent travaille sur `agent/<agent>/<tâche>`.
- **Le rédacteur en chef relit chaque brouillon ; son avis est consultatif. Nicolas est le seul
  à publier.**
- **La cartographie Notion est mise à jour à chaque fusion qui change l'architecture**, pas
  seulement à la revue mensuelle (liste des déclencheurs dans `AGENTS.md`).

### Cartographie Notion à reporter

**À reporter, non fait au 30/10** (changements d'architecture fusionnés depuis la dernière revue ;
règle de `AGENTS.md`) :
- **Routes et accès** (§ chaîne de production, § garde-fous) : accès administrateur Supabase Auth,
  middleware à liste positive, gardes dans les layouts et chaque Server Action, `/connexion`,
  `/auth/confirmer`, `/admin` (santé des sources et files d'attente), pied d'administration ; l'accueil
  public ne porte plus aucun lien d'administration.
- **Modèle analytique** (§ modèle, § anatomie d'une note) : **« Les marchés par driver » remplace « Ce que
  j'avais mal lu » à partir de la S45** (structure versionnée par semaine ISO, chiffres écrits par le code,
  validation ligne par ligne) ; `bilanGuets` dans le paquet ; `Outlook.millesime` et le type `Prevision`.
- **Données** (§ chaîne de production) : `weeklyChange` / `weeklyChanges` (`lib/performance.ts`).
- **Organisation** (§ 12) : agents, advisors, `AGENTS.md`, `ROADMAP.md`, rapport hebdomadaire du samedi.
- Glossaire (§ 10) : *millésime*, *prévision structurée*, *marchés par driver*, *bilan des guets*.
Tâche JA.2 : l'orchestrateur n'a pas encore écrit dans la page Notion (pas de session dédiée).

## Feuille de route — copie figée du 26/10/2026

**`ROADMAP.md` est la source de vérité** (statuts à jour, agent de chaque tâche) ; cette copie n'est
plus tenue, les cases ci-dessous sont celles du 26/10. Donnée par le propriétaire le 26/10 et recopiée
ici pour qu'une session sache où on en est. **Elle
remplace la numérotation précédente** : l'accès administrateur, appelé « J1.1 » plus tôt dans la
journée, est désormais **J2.1** ; J1 est le chantier « marchés par driver ». **Ordre retenu le
26/10 : J2.1 d'abord** (les routes d'administration sont publiques), puis J1 ; le reste de J2 après. Légende : [x] faite,
[~] en cours, [ ] à faire. Une case ne se coche qu'une fois le travail poussé et vérifié.

### J0 Assainir (5/5)
- [x] J0.1 Remise à zéro du corpus (Étape 6.6)
- [x] J0.2 Contrôler trajectoires et historiques après la purge
- [x] J0.3 Cuivre dans l'axe « Contrainte physique » : **gardé comme témoin** (décidé le 26/10) ;
  il reste hors des instruments pilotés du driver IA
- [x] J0.4 Historique Git (commit `4602cd8`, ~12 Mo) : **pas de réécriture** (décidé le 26/10)
- [x] J0.5 Logo J.P. Morgan : **logo du groupe acté** (décidé le 26/10)

### J1 Les marchés par driver (0/6)
- [ ] J1.1 Spécifier le bloc — à trancher
- [ ] J1.2 Variations hebdo par classe d'actifs
- [ ] J1.3 Pipeline de rédaction
- [ ] J1.4 Composant de note et rendu mobile
- [ ] J1.5 Bascule à partir de la note suivante
- [ ] J1.6 Bilan automatique des guets échus

### J2 Back-office /admin (0/7)
- [~] J2.1 Accès administrateur protégé — commits 1 à 4 faits le 26/10, sur la branche de session ;
  réglages Supabase et fusion dans `main` à faire (voir ci-dessous)
- [ ] J2.2 Accueil /admin : santé des sources et files d'attente
- [ ] J2.3 /redaction → /admin/redaction
- [x] J2.4 /triage → /admin/veille (à fusionner)
- [ ] J2.5 Guets et angles morts côté admin
- [ ] J2.6 File « À trancher »
- [ ] J2.7 Audit des pages publiques

### J3 Modèle analytique (0/3)
- [ ] J3.1 `Guet.axeLibelle` → `Axe.id`
- [ ] J3.2 Angles morts dans le paquet de contexte de rédaction
- [ ] J3.3 Circuit de promotion d'un driver — à trancher

### J4 Refonte de la page Notes (0/6)
- [ ] J4.1 Audit de densité à 390 px
- [ ] J4.2 Nouvelle hiérarchie
- [ ] J4.3 Maquette Claude Design et amendement `DESIGN.md`
- [ ] J4.4 Intégration : sections repliables, barre d'ancres allégée
- [ ] J4.5 Liste des notes : filtres driver et axe, recherche
- [ ] J4.6 Export PDF d'une note

### J5 Moteur d'alertes (0/5)
- [ ] J5.1 Spécifier les seuils objectifs par driver — à trancher
- [ ] J5.2 Moteur évalué après le cron, `AlertEvent` en base
- [ ] J5.3 `AlertEvent` de type `evenement`
- [ ] J5.4 Remplacer les alertes du seed
- [ ] J5.5 Notes spéciales automatisées (Étape 7)

### J6 Assistant IA de la note (0/7)
- [ ] J6.1 Spécifier le périmètre — à trancher
- [ ] J6.2 Paquet de contexte
- [ ] J6.3 Route API côté serveur
- [ ] J6.4 Interface : feuille mobile et questions suggérées par section
- [ ] J6.5 Réponses ancrées
- [ ] J6.6 Journal des questions dans /admin
- [ ] J6.7 Jeu d'évaluation de 20 questions types

### J7 Sources et outlooks (0/10)
- [ ] J7.1 Vue YTD multi-actifs dans Marchés
- [ ] J7.2 Bund et OAT quotidiens
- [ ] J7.3 Brent à terme ICE via une sonde Twelve Data
- [ ] J7.4 10 ans Inde et Chine, Hang Seng
- [ ] J7.5 Brancher l'INSEE
- [ ] J7.6 12 indicateurs non suivis : arbitrer — à trancher
- [ ] J7.7 Collecte des outlooks
- [ ] J7.8 Graphiques originaux des outlooks (`imageGraphique`)
- [ ] J7.9 Rattacher les points d'outlook aux scénarios
- [ ] J7.10 Matrice scénarios × banques

### J8 Newsletter (0/9)
- [ ] J8.1 Stratégie newsletter — à trancher
- [ ] J8.2 Cadre minimal avant le premier envoi externe
- [ ] J8.3 Choix de l'outil d'envoi — à trancher
- [ ] J8.4 Domaine d'envoi et délivrabilité
- [ ] J8.5 Inscription et désinscription
- [ ] J8.6 Gabarit de la note hebdo
- [ ] J8.7 Envoi branché sur `publier-note.yml`
- [ ] J8.8 Gabarit et envoi de la note spéciale
- [ ] J8.9 Mesure : abonnés, ouvertures, clics, désinscriptions

### J9 Ouverture et freemium (0/7)
- [ ] J9.1 Cadre réglementaire et employeur
- [ ] J9.2 Stratégie freemium — à trancher
- [ ] J9.3 Authentification des utilisateurs
- [ ] J9.3a Connexion par Google à l'ouverture au public (fournisseur OAuth Supabase + client Google
  Cloud). Le rôle admin reste posé à la main dans `app_metadata` : une inscription publique ne
  doit jamais le donner. Lève `shouldCreateUser: false` et la déconnexion des non-admins de
  `lib/auth/connexion.ts`, écrits pour un compte unique.
- [ ] J9.3b Lien magique utilisable depuis tous les navigateurs. Aujourd'hui (modèle par défaut de
  Supabase, flux PKCE) il ne s'ouvre que dans le navigateur qui l'a demandé. Correctif : SMTP
  personnalisé (même chantier que J8.3 / J8.4), puis modèle d'e-mail
  `{{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&type=email` — déjà accepté par
  `/auth/confirmer`. Bloquant avant toute ouverture au public.
- [ ] J9.4 Droits par niveau
- [ ] J9.5 Paiement et abonnements
- [ ] J9.6 CGU, mentions légales, confidentialité, avertissement
- [ ] J9.7 Mesure : inscriptions, conversion, rétention

**Vérifié dans le code le 26/10** : ni `app/admin/` ni `middleware.ts` n'existent ; `/redaction`,
`/triage` et `/diagnostic` restent publics à qui connaît l'URL. `axe_id` existe en sortie de
passe 2 (veille), mais `Guet.axeLibelle` n'est pas rattaché (J3.1). Aucune case n'est cochée au-delà
de ce que la feuille de route donne.

## J2.1 — accès administrateur protégé (soldé le 30/10)

**Fait le 26/10** sur `claude/roadmap-tracking-mr00y4`, **pas encore dans `main`**. Les trois
décisions sont prises selon les choix par défaut : `/diagnostic` protégé, boutons de l'accueil
retirés (commit 5, pas encore fait), tout côté serveur.
- (1) `89f7f82` session serveur (`lib/auth/session.ts`, `server-only`), règles pures
  (`lib/auth/regles.ts`), contournement local verrouillé, build en échec si `ADMIN_LOCAL` hors dev.
  **Écart au plan** : `server-only` n'est pas dans `lib/supabase.ts`, que les scripts `tsx` et les
  workflows importent (le paquet lève hors de Next) ; le test de frontière
  (`lib/auth/frontiere.test.ts`) couvre le risque à sa place.
- (2) `466d65b` `middleware.ts` + tests (404 sans session, matcher limité aux trois routes).
- (3) `fbbd479` gardes dans les layouts, les pages et les 13 Server Actions ; le test parcourt
  toutes les actions exportées sans les nommer.
- (4) `87e504e` `/connexion`, `/auth/confirmer` (`token_hash` ou `code`), déconnexion.
- Vérifié sur un build de production : `/redaction`, `/triage`, `/diagnostic` → 404 au corps
  identique à une adresse inconnue ; `/`, `/notes` → 200 ; `/api/cron/collect` non intercepté.
  En dev avec `ADMIN_LOCAL=1` : 200 sur `localhost`, 404 avec un hôte forgé.

**Reste, dans l'ordre :**
1. ~~**Réglages Supabase par le propriétaire**~~ **faits le 28/10** (inscriptions fermées, compte,
   rôle admin vérifié, Site URL et Redirect URL). **Le modèle d'e-mail n'a pas été changé** : Supabase
   l'interdit sans SMTP personnalisé ; on garde le modèle par défaut (flux `code`, lien à ouvrir dans
   le navigateur qui l'a demandé) jusqu'à J9.3b. `/diagnostic` du 28/10 : 5 variables, lecture et
   écriture en base vertes. Rappel de la liste d'origine : : inscriptions fermées, compte créé,
   rôle posé par SQL, Site URL et Redirect URLs (`https://<projet>.vercel.app/auth/confirmer`),
   gabarit « Magic Link » en `{{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&type=email`.
   Vérifier sur `/diagnostic` **avant la fusion** que `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont
   posées sur Vercel : après la fusion, la page est derrière la connexion.
2. Fusion dans `main` — **pas avant le point 1**, sinon `/redaction` devient inaccessible au
   propriétaire lui-même.
3. ~~Commit 5 : retrait des boutons « Triage » et « Brouillon à réviser » de l'accueil public.~~ **Fait le 30/10** : l'accueil ne lit plus la file de veille ; la navigation Rédaction · Triage · Diagnostic vit dans le pied des routes protégées.
4. ~~Commit 6~~ `CLAUDE.md` et `.env.example` faits le 30/10 ; **reste le SQL du rôle admin à versionner dans `supabase/`**.

### Plan initial (validé le 26/10)


**Demande (26/10).** Supabase Auth, un rôle admin, un middleware Next sur les routes
d'administration. Un seul compte, lien magique. `/redaction` et `/triage` protégés **dès
maintenant** (aujourd'hui ouverts à qui connaît l'URL ; le « mot de passe Vercel » de `CLAUDE.md`
n'est pas en place). Plan avant le code, commits séparés.

**Plan proposé (non encore validé) :**
- **Tout côté serveur, aucune variable `NEXT_PUBLIC_`** : Server Action `signInWithOtp`
  (`shouldCreateUser: false`), route `/auth/confirmer` (`exchangeCodeForSession`), session en
  cookie `httpOnly` via `@supabase/ssr`. La clé anonyme lit `brouillons_contexte` et
  `redaction_decisions` : l'exposer au navigateur ouvrirait les brouillons.
- **Rôle** : `app_metadata.role = "admin"`, posé à la main par SQL (adresse hors dépôt) ;
  inscriptions fermées dans Supabase.
- **Middleware à liste positive** : `matcher: ['/redaction/:path*', '/triage/:path*',
  '/diagnostic/:path*']`. Jamais d'exclusion à maintenir : `/api/cron/collect` (protégé par
  `Bearer CRON_SECRET`) ne peut pas être intercepté. Les workflows GitHub n'appellent jamais le
  site (ils écrivent dans Supabase avec la clé de service, ou commitent).
- **Non autorisé → 404** (réécriture vers une page inexistante, corps identique au 404 du site).
  Échec fermé si Supabase est injoignable.
- **Garde aussi dans chaque `layout.tsx` protégé et dans chaque Server Action**
  (`app/redaction/actions.ts`, `app/triage/actions.ts`) : Next les rend appelables par POST
  direct, le middleware seul ne suffit pas.
- **Contournement local** : `ADMIN_LOCAL=1` **et** `NODE_ENV === "development"` **et** `VERCEL`
  absent **et** hôte `localhost`/`127.0.0.1`. `next.config.ts` fait échouer le build si
  `ADMIN_LOCAL` est posé en production ou sur Vercel. Tests des trois refus.
- **Clés** : `SUPABASE_URL` et `SUPABASE_ANON_KEY` côté serveur sur Vercel (la seconde existe
  dans les secrets GitHub ; sur Vercel, à vérifier sur `/diagnostic`). `import "server-only"` dans
  `lib/supabase.ts` et le module d'auth ; test qui refuse tout fichier `"use client"` important
  ces modules ou nommant `SERVICE_ROLE`.
- **Écran `/connexion`** avec les seuls motifs de `DESIGN.md` ; captures à 390px (initial,
  envoyé, erreur). Message identique que l'adresse soit connue ou non.
- **Tests minimum** : requête non authentifiée → 404 sur chaque route protégée ; matcher ne
  correspond ni à `/api/cron/collect`, ni à `/`, ni à `/notes` ; le cron passe avec le bon
  `Bearer` et sans session ; chaque Server Action refuse sans session et n'écrit rien.
- **Commits** : (1) session serveur, garde, contournement verrouillé ; (2) middleware + tests ;
  (3) gardes des layouts et des actions ; (4) `/connexion`, `/auth/confirmer`, déconnexion ;
  (5) retrait des entrées publiques de l'accueil ; (6) `CLAUDE.md`, `.env.example`, SQL du rôle,
  `ETAT.md`.

**Trois décisions (prises le 26/10) :** `/diagnostic` protégé ; boutons « Triage » et « Brouillon
à réviser » retirés de l'accueil public ; montage tout serveur sans `NEXT_PUBLIC_`.

**À faire dans le tableau de bord Supabase (hors dépôt), avant le commit 4** : Site URL et
`https://<domaine>/auth/confirmer` dans les Redirect URLs ; inscriptions par e-mail fermées ;
rôle admin posé par le SQL fourni.

## Pratique

- **Branches par agent, fusion sur `main` par l'orchestrateur seul** (voir `AGENTS.md`). La
  branche `claude/nextjs-tabs-skeleton-np68r6` est ancienne et très en retard, ne pas s'y fier.
- Commits atomiques en français. Avant de pousser : `npx tsc --noEmit`, `npx vitest run`
  (1231 tests verts), `npm run lint` (0 erreur, 7 avertissements anciens).
- **L'environnement de développement n'a pas d'accès réseau sortant** vers les sources (FRED,
  Wikimedia…) ni vers Supabase. Tout passe par le workflow **`verification-sources.yml`**
  (déclenché via les outils GitHub) : `sonder-supabase` (lire une table, ex.
  `observations?instrument_id=eq.brent&order=date.desc&limit=10`), `fred-observation`
  (`ID||début||fin`), `sonder-page`, `sonder-brut`, `sonder-pdf`, `fred-release-dates`, et les
  `*:check` de chaque source. Lister les runs avec `perPage` petit.
- En local, Supabase est injoignable : l'app retombe sur `data/seed.json`, tout s'affiche
  « non collecté ». Captures d'écran à 390px via Playwright (`executablePath:
  '/opt/pw-browsers/chromium'`).

## Ce qui tourne

**Données (Étape 3, faite).** Cron Vercel quotidien à 4 h UTC (`app/api/cron/collect/route.ts`),
orchestrateur de treize modules : FRED, spreads, Twelve Data, Alpha Vantage, Eurostat, ONS,
e-Stat, BoE, BoJ, BRI, IMF, OCDE, veille passe 1. 32 instruments et 57 indicateurs sur 83 et 69
réellement collectés ; le reste affiche « non suivi ». Fraîcheur par série dans `series_health`,
lue sans cache (`getFreshReadClient`). Le détail par source est dans `CLAUDE.md`.

**Calendrier des publications (Macro).** `config/calendrier-publications.ts` : dates relevées
dans les calendriers officiels, jamais extrapolées (relevé du 19/10/2026). `prochainePublication`
alimente `nextRelease` ; `publicationsAVenir` alimente « Cette semaine ». Une **routine
hebdomadaire** (lundi 6 h 47 Paris, `trig_01HVxCJv3pR8fPPukJg5wDif`, liée à cette session)
prolonge les dates.

**Notes et rédaction assistée (Étape 6, paliers 1 à 5 faits).** Guets, pipeline
(`lib/redaction/`, `npm run note:draft`, `note:probe`), portail `/redaction`, workflow
`note-hebdo.yml` **planifié** (samedi 8 h UTC) puis `publier-note.yml`, fiche Notion comme
matière principale, contrôle des chiffres à deux régimes. Notes réelles publiées : S38 à S43 (S43 publiée le 26/10).

**Remise à zéro du corpus (Étape 6.6) — entièrement soldée le 24/10/2026** (purge du 19/10, errata du 20/10 et du 24/10, voir plus bas). Les neuf notes de développement
S24, S26, S26-E1, S27, S28, S28-E1, S29, S31, S32 et tout ce qui en dérivait ont été retirés :
20 versions de scénario (`content/scenarios.ts`), 13 entrées d'historique de tendance
(`content/tendances.ts`), les liens « promue en note » de deux alertes d'exemple du seed.
Restent les notes réelles S38 à S43, les versions que le pipeline a écrites
(`content/generated/`) et la version taux issue de la S38. **Rien n'est reconstitué pour S33 à
S37 : un trou reste un trou.** Cadre posé (option « A », décidée le 19/10) :
- `config/suivi.ts` : début du suivi (S38), note comparée de la S38 (S32, retirée), liste des
  notes retirées. C'est la seule trace de ce qui a été purgé.
- La chaîne des notes accepte `comparesTo: 2026-S32` pour la S38 seule. Les numéros de version
  de scénario peuvent commencer au-dessus de 1 à partir du début du suivi (v4, v5…) ; un trou au
  milieu reste refusé.
- Les anciennes adresses `/notes/<slug retiré>` redirigent (307) vers `/notes`.
- Un driver ou une tendance qu'aucune note n'a révisé affiche « Pas encore révisé(e) par une
  note » (jamais un état hérité) ; la trajectoire porte « Début du suivi : S38 » et ne trace rien
  avant la première révision d'une branche. Le prompt de rédaction applique la même règle aux
  tendances.
- **Aucun test de règle ne lit plus le corpus réel** : fixtures dans `lib/__fixtures__/`,
  graphes synthétiques. Seul `lib/corpus-reel.test.ts` lit le corpus, sans nommer de donnée
  (il ne vérifie que l'assemblage et l'absence de ce qui a été retiré).

**Veille (Étape 5).** Passe 1 dans le cron, passe 2 via `veille-passe2.yml` (7 h UTC), file
`/triage`, angles morts (`angles_morts`, compteur sur la page du driver).

**Outlook.** Cinq outlooks dans `content/outlooks.ts` (J.P. Morgan, HSBC, BNP Paribas, Citi,
Morgan Stanley), rédigés hors de l'app. Modèle `themes` / `points` / `positionnement`. Chaque
point a titre, explication, source, et chiffres/risques/série quand le document les donne — tirés
des condensés, rien d'ajouté. Logos SVG dans `public/outlooks/logos/` (workflow
`logos-outlooks.yml`, Wikidata P154). Sous un filtre de thème, les points s'affichent en phrase.

### Drivers et tendances après la remise à zéro (19/10/2026)

**Aucun driver n'est sans état** : les trois ont des versions réelles. Dernière révision :
IA — S42 (18/10) ; Taux — S40 (03/10) ; Iran — S39 (27/09), le plus anciennement révisé.
Les trois sont donc affichés avec leur branche dominante (IA : plafonne ; Taux : statu quo ;
Iran : enlisement).

**Tendances sans état** (historique vide, affichées « Pas encore révisée par une note ») :
`japon-anomalie` et `recomposition-flux-hors-chine`. Les trois autres (désinflation, capex IA,
prime de risque) ont des passages S39, S40 et S42.

**Consigne pour la S43 (samedi 24/10, 8 h UTC) : réviser en priorité le driver Iran**, dernière
révision S39 — le plus ancien des trois (IA : S42, Taux : S40). Corrige la consigne précédente, qui
visait l'IA : celle-ci a été révisée en S42, la veille de la remise à zéro. Le paquet de contexte
de la S43, construit hors ligne, ne contient plus aucune référence à S24–S32 ; il ne marque aucun
driver « à réviser » (cette notion n'existe pas dans le paquet).

### Errata et renvois à la fiction (20/10/2026)

La remise à zéro a retiré des notes que du texte publié cite encore. **On ne réécrit jamais un
texte publié ni une version validée : on ajoute un erratum** et on corrige l'affichage.
- **Mécanisme** : champ facultatif `erratum` (date + texte, schéma Zod dans `lib/erratum.ts`) au
  frontmatter d'une note et sur une `ScenarioVersion`. Rendu discret (petit corps, couleur
  secondaire, « Erratum du JJ/MM/AAAA ») tout en bas de la note, et sous la version concernée sur
  la page d'un driver. Absent du paquet de contexte et du contrôle des chiffres.
- **Errata posés** :
  - S38 (20/10, élargi le 24/10) : « note d'août », « note précédente » du 13 août, « ouverts en
    août », « première note sur ce dossier », « la semaine dernière » ; les états antérieurs que la
    note décrit (branche dominante précédente, axes présentés comme nouveaux) ; le texte d'attente
    du bloc « Ce que j'avais mal lu ».
  - S39 (24/10) : « ouvert en août » (théâtre élargi), « documenté en août » (statu quo) et
    l'axe « acceptabilité politique » « ouvert en août ». *Correction d'une erreur de cette
    section* : la version du 20/10 affirmait à tort que la S39 ne contenait pas ces mentions.
  - Version taux S38 `rates-baisses` (20/10) : « la même raison qu'en août ».
  Rien dans `content/generated/`, les tendances ni les notes S40 à S42.
- **Non couverts par un erratum** : les « Inchangé… » des impacts des versions taux S38 — la mention
  « Première version suivie » les couvre déjà.
- **Repères de révision** : une version n'est datée que de la note qui l'a produite ; sans version
  précédente suivie (retirée, ou d'avant la S38), la page dit « Première version suivie » et ne
  trace pas l'ancien cran (`lib/revision.ts`). Vaut sur la page d'un driver et dans « Depuis ».
- **Règle de rédaction** : le prompt interdit d'invoquer une note ou une analyse antérieure à la S38
  (un fait de marché daté reste permis) ; un renvoi à une note retirée (« S32 », « la note d'août »,
  « la note du 13 août ») est refusé à la réception (renvoyé au modèle une fois) et bloque la
  publication s'il est réintroduit à la main (`lib/redaction/renvois.ts`). Le prompt n'affiche plus
  que la version en vigueur de chaque branche sous « Scénarios courants ».

### Bloc « Ce que j'avais mal lu » de la S38 (soldé le 24/10/2026)

La S38 avait été publiée avec un **texte d'attente** destiné au rédacteur (« Bloc à compléter — il
ne peut pas être rédigé pour vous… », deux pistes comprises). Il est remplacé par « Bloc non rédigé
à la publication. » — **seule modification autorisée du corps d'une note publiée**, mentionnée dans
l'erratum de la S38. Pour qu'elle ne se reproduise pas, la publication est bloquée tant qu'un bloc
porte encore un texte d'attente (`lib/redaction/texte-attente.ts`, condition `attente:<bloc>`).

## Passation de design mobile (Claude Design) — entièrement faite

`DESIGN.md` amendé, puis toutes les maquettes : **1a** accueil (« Depuis S41 », chiffres clés
vivants, `ChiffreSheet`), **1b** lecture (barre d'ancres, chiffres cités touchables),
**1c** Marchés « Par driver » (`?vue=drivers`), **1d** Macro (« Cette semaine », liste dense
mobile, lien vers le driver), **1e** page d'un driver (dominante encadrée, repère de révision,
trajectoire compacte, instruments en cellules, guets ouverts), **2a/3a/3b/3c** Outlook.

## Portail de rédaction à gestes (26/10/2026)

`/redaction/[slug]` refondu d'après les maquettes 4a/4b/4c : frise de segments (régime puis un
par bloc) où **rien ne verrouille la navigation** ; relecture d'un bloc dans la mise en page de la
note, chiffres non conformes surlignés avec bulle (garder / corriger), barre d'emoji collante,
« Aperçu publié » ; écran « Chiffres à trancher » regroupé par valeur (`grouperParValeur`), un
geste par occurrence. Seule la publication reste conditionnée. Faux positifs du contrôle des
chiffres relevés sur la S43 : issue #2, non corrigés. La S43 a été publiée depuis ce portail le 26/10 (commit `754eea8`).

## À faire par Nicolas dans Supabase — table `decisions` et type `ligne` (J2.6, 30/10/2026)

Deux changements de base de données sont prêts dans `supabase/schema.sql` ; **rien ne change tant
que ce bloc n'est pas exécuté**. Il est sans risque : on peut le rejouer autant de fois qu'on veut,
il ne supprime aucune donnée.

1. Ouvrir le projet sur supabase.com, puis, dans le menu de gauche, **SQL Editor** (icône `>_`).
2. Cliquer sur **New query** (nouvelle requête).
3. Copier le bloc ci-dessous en entier (du premier `create` au dernier `;`) et le coller dans la zone de texte.
4. Cliquer sur **Run** (en bas à droite, ou Ctrl+Entrée).
5. Attendre « Success. No rows returned » : c'est le message attendu. Une erreur en rouge : ne rien
   modifier, copier son texte à l'orchestrateur.
6. Vérifier : menu **Table Editor** ; la table `decisions` doit apparaître, vide, avec un cadenas
   (RLS actif).

```sql
create table if not exists decisions (
  id          text primary key,
  question    text not null,
  recommandation text,
  bloque      text[] not null default '{}',
  statut      text not null default 'ouverte' check (statut in ('ouverte', 'tranchee', 'abandonnee')),
  reponse     text,
  tranchee_le timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table decisions enable row level security;
revoke all privileges on decisions from anon, authenticated;
grant all privileges on decisions to service_role;

alter table redaction_decisions drop constraint if exists redaction_decisions_kind_check;
alter table redaction_decisions add constraint redaction_decisions_kind_check
  check (kind in ('bloc', 'guet', 'revision', 'tendance', 'bloc4', 'regime', 'theme', 'chiffre', 'ligne'));
```

Retour arrière si besoin : `drop table if exists decisions;` (la contrainte `ligne` est inoffensive).

## Décisions récentes (19/10/2026)

- **Brent → « Brent physique ».** FRED `DCOILBRENTEU` est le spot physique de l'EIA, pas le
  contrat à terme ICE (≈ 108 $ contre 126 $ au 14/10). Base et FRED vérifiées identiques.
  Publié avec ~1 semaine de retard. Le rattachement des chiffres passe par l'id `brent`.
- **Cuivre retiré des instruments pilotés du driver IA** (bruité, mensuel). Il reste témoin de
  l'axe « Contrainte physique » dans `content/axes.ts`.
- Questions des drivers reformulées (Fed, Iran, IA). Pictogrammes Macro/Marchés intervertis.

## Discuté, pas encore fait

Chaque point porte entre crochets la ligne de la feuille de route qui le reprend.

**Ouvert dans la dernière session (19/10)**
1. **[J7.3] Source du Brent à terme (ICE).** Proposé : sonder Twelve Data / Alpha Vantage ; à défaut un
   ETF (BNO) — en $/part, donc une approximation à signaler. Non commencé.
2. ~~Cuivre dans l'axe « Contrainte physique »~~ — soldé (J0.3) : gardé comme témoin.
3. ~~Historique Git~~ — soldé (J0.4) : pas de réécriture, `4602cd8` reste dans l'historique.
4. ~~Logo J.P. Morgan~~ — soldé (J0.5) : le logo du groupe (JPMorganChase) est acté.
5. [J7.8] Outlook : aucune capture de graphique original (`imageGraphique`) fournie ; explications
   limitées au contenu des condensés (pour aller plus loin, relire les PDF).

**Prévu par `CLAUDE.md`, non fait**
6. **[J5] Moteur d'alertes (Étape 4)** : non commencé. Les alertes affichées viennent du seed
   (`nonCollecte`). Pas de notes spéciales automatisées (Étape 7) ni d'`AlertEvent` de type
   `evenement`.
7. **[J3.2] Angles morts dans le paquet de contexte** : le compteur se lit, mais n'alimente pas encore
   la rédaction.
8. **[J3.1] `Guet.axeLibelle` → `Axe.id`** : rattachement des guets aux axes, non fait.
9. **[J3.3] Circuit de promotion d'un driver** (candidat → observation → actif) : à spécifier.
10. **[J4.5, J4.6] Étape 4, confort** : recherche dans les notes, export PDF d'une note.
11. **[J5.4] Alertes d'exemple du seed** (`alertEvents`, deux alertes d'août) : toujours des exemples
    écrits à la main, affichés « non collecté » sur les fiches Nasdaq 100 et spread OAT-Bund. Leur
    lien vers des notes S32 inexistantes a été retiré (statut ramené à « nouveau ») ; elles
    disparaîtront avec le moteur d'alertes réel.
12. **[J7.2, J7.4, J7.5, J7.6] Données manquantes** : 12 indicateurs non suivis (six PMI propriétaires, balances
    courantes US/JP/CN, solde budgétaire UK, salaires JP et zone euro) ; Bund/OAT et donc les
    spreads seulement en mensuel ; points à 10 ans Inde/Chine au seed ; Hang Seng sans source ;
    INSEE non branchée.

### Remplir la file « À trancher » (facultatif, après le bloc ci-dessus)

Même méthode : SQL Editor, New query, coller, Run. Les questions sont résumées de `ROADMAP.md` ; le champ `bloque` est vide là où je n'ai pas la liste des tâches débloquées. Rejouable sans risque (`on conflict do nothing`). Puis ouvrir `/admin/decisions`.

```sql
insert into decisions (id, question, recommandation, bloque) values
 ('JA.4', 'Quel budget de tokens hebdomadaire retenir ?', null, '{}'),
 ('J3.3', 'Quel circuit de promotion d''un driver (candidat, observation, actif) ?', null, '{}'),
 ('J6.1', 'Quel périmètre pour l''assistant (explique le mécanisme, refuse le conseil) ?', null, '{J6.2,J6.3,J6.4,J6.5,J6.6,J6.7}'),
 ('J7.6', 'Que faire des 12 indicateurs non suivis : accepter le trou ou payer ?', null, '{}'),
 ('J7.16', 'Quel catalogue cible de newsletters chiffrées par driver ?', null, '{}'),
 ('J7.17', 'Faut-il une boîte dédiée aux newsletters ?', null, '{}'),
 ('JT.1', 'Quel nom et quel logo en maquette ?', null, '{JT.2}'),
 ('J8.1', 'Quelle stratégie newsletter ?', null, '{}'),
 ('J8.3', 'Quel outil d''envoi (UE, API) ?', null, '{}'),
 ('J9.2', 'Quelle stratégie freemium ?', null, '{}')
on conflict (id) do nothing;
```
