# Roadmap — état au 30/10/2026

Source de vérité versionnée de la feuille de route. L'artefact visuel
(https://claude.ai/artifact/KFT6HJ4AJpXFPUUFPkTKDY) en est l'affichage ; en cas d'écart, ce
fichier fait foi et l'orchestrateur resynchronise l'artefact. Mis à jour à chaque fusion.

**Avancement au 30/10 (fin de journée) : 21 faites, 4 en cours, 64 à faire, sur 89.** Légende : `[x]` faite · `[~]` en cours · `[ ]` à faire. **À trancher** = décision de Nicolas
avant tout code. **Bloquant** = d'autres tâches en dépendent. Le dernier champ est l'agent
propriétaire (voir `AGENTS.md`) ; `nicolas` = décision ou action hors dépôt.

**Budget de tokens hebdomadaire : à renseigner par Nicolas.** Tant qu'il manque, les rapports du
samedi (voir `AGENTS.md`) ne donnent aucun délai, seulement l'ordre et la charge relative. Taille
des tâches : S, M, L, ajoutée par `advisor-technique` à la première passe et calibrée sur la
consommation réelle (JA.4).

**Tailles (JA.4) — calibrage provisoire, sur deux mesures seulement** (J1.2 ≈ 140 000 tokens d'agent,
J4.1 ≈ 166 000) : **S** < 80 000 (un module ou une config, ses tests, ni interface ni migration) ·
**M** 80 000 à 200 000 (un module et ses tests, un audit, ou une interface sur un seul couloir) ·
**L** > 200 000 (plusieurs couloirs, migration avec interface, prompt avec contrôle des chiffres).
S : J7.11, J3.2, J2.4, J2.7 (réduit), J7.12, J1.5 · M : J7.13, J7.1, J1.7, J3.1, J2.3, J2.6, J4.2,
J4.3, J1.4 · L : J1.3, J5.2, J7.15. À recaler après deux rapports hebdomadaires.

**Ordre de travail (advisor-technique, 30/10, mis à jour en fin de journée).** Trois agents exécutants au
plus à la fois, deux si l'un est en grande tâche ; aucune tâche L le vendredi soir. Chaînes à livrer
**en série**, un seul auteur : `lib/types.ts` et `supabase/schema.sql` (data) : J7.11 ✔ → J7.13 ✔ → J2.6 →
J3.1 → J5.2 ; `middleware.ts` (plateforme) : J2.2 ✔ → J2.3 → J2.4. **J2.3 attend la fusion de J1.4** (les deux
touchent `app/redaction/`). Prochaines tâches : design J1.4 (en cours), J4.2, J4.3 · notes J1.5, J1.7, J3.1,
J3.2 · plateforme J2.3, J2.4, J2.6 · data J7.1 (interface avec design), migration `kind='ligne'` de
`redaction_decisions` · veille saisie de `config/calendrier-drivers.ts`, rejeu des seuils (matière de J5.1).
Débloqué le 30/10 : J5.2 à J5.5 (J5.1 tranché ; J5.2 attend la chaîne `schema.sql` : J2.6 → J3.1 → J5.2). Bloqué par une décision de Nicolas : J6.1 → J6.2 à J6.7 ; JT.1 → JT.2 ; J1.6 (affichage du bilan).

## Socle livré

- [x] S.1 Collecte quotidienne (Étape 3) — cron 4 h UTC, 13 modules, `series_health`
- [x] S.2 Calendrier des publications — dates officielles, « Cette semaine », routine du lundi
- [x] S.3 Notes et rédaction assistée (Étape 6, paliers 1–5) — notes S38 à S43 publiées
- [x] S.4 Veille passes 1 et 2 (Étape 5) — `/triage`, angles morts comptés par driver
- [x] S.5 Outlook : 5 banques — logos SVG
- [x] S.6 Passation design mobile — maquettes 1a à 3c

## JA · Organisation en agents

- [x] JA.1 Agents, advisors, `AGENTS.md`, `ROADMAP.md` versionnée — orchestrateur
- [ ] JA.2 Section « Organisation du développement » dans la cartographie Notion — orchestrateur — **prévu samedi 31/10, après la réinitialisation de 10 h, avec la resynchronisation de l'artefact de la roadmap (accord de Nicolas)**
- [ ] JA.3 Rapport hebdomadaire des agents, chaque samedi à 11 h (Paris) : fait, situation, reste, délais — routine planifiée à créer **sur accord de Nicolas** (coût en tokens chaque semaine) — orchestrateur + advisor
- [ ] JA.4 Budget de tokens hebdomadaire et tailles S/M/L de chaque tâche, pour que les délais se calculent — **À trancher** (le budget) — nicolas + advisor
  - *Première calibration, 30/10 (Claude Pro) :* environ 900 000 tokens d'agents (J7.11, J7.13, J7.12, J1.3, E8/E9/E12 et le début de J1.4) ont fait passer la **limite de 5 heures de 38 % à 80 %** et la **limite hebdomadaire de 48 % à 53 %**. Si ces lectures sont bien celles de ces deux jauges, **le facteur limitant est la fenêtre de 5 heures**, pas la semaine : ≈ 21 000 tokens d'agent par point de la fenêtre, soit une fenêtre pleine ≈ 2 millions. Les premières lectures de la journée (« 60 % », « 72 % ») étaient peut-être celles de la fenêtre de 5 heures ; à confirmer au prochain relevé.

## J0 · Assainir

- [x] J0.1 Remise à zéro du corpus (Étape 6.6) — Bloquant — notes
- [x] J0.2 Contrôler trajectoires et historiques après la purge — Bloquant — notes
- [x] J0.3 Cuivre dans l'axe « Contrainte physique » : **gardé comme témoin** (26/10) — nicolas
- [x] J0.4 Historique Git (commit 4602cd8, ~12 Mo) : **pas de réécriture** (26/10) — nicolas
- [x] J0.5 Logo J.P. Morgan : **logo du groupe acté** (26/10) — nicolas

## J1 · Les marchés par driver (remplace « Ce que j'avais mal lu »)

- [x] J1.1 Spécifier le bloc — **tranché le 30/10 par Nicolas** : « Les marchés par driver » **remplace** « Ce que j'avais mal lu » à partir de la S45 ; chiffres écrits par le code (`weeklyChange`), cause proposée par le modèle avec émetteur, « sans lien clair » admis, validation ligne par ligne. Spécification dans `CLAUDE.md` — nicolas
- [x] J1.2 Variations hebdo par classe d'actifs (même calcul que J7.1) — fait le 30/10 : `weeklyChange` / `weeklyChanges` dans `lib/performance.ts`, par instrument, sans agrégat de classe ; J7.1 et J1.3 les réutilisent, sans second calcul — data
- [x] J1.3 Pipeline de rédaction du bloc « Les marchés par driver » — fait le 30/10 (six paliers, `agent/notes/J1.3`) : structure d'une hebdo versionnée par semaine ISO (`MARCHES_PAR_DRIVER_A_PARTIR_DE = 2026-S45`, notes S38 à S44 inchangées, prompt système S44 identique à l'octet près), schéma Zod, paquet, prompt, rendu MDX par le code, logique de validation ligne par ligne. **Jamais exercé sur une vraie fiche** : `note:draft --dry-run` sur la S45 reste à faire (J1.5) — notes
- [x] J1.4 Composant de note et rendu mobile, portail ligne par ligne — fait le 30/10 (`agent/design/J1.4`, 3 commits) : tableau par driver dans la note (signe écrit, deux dates, cause + émetteur), segment « Marchés » dans la frise, gestes Refuser / Corriger / Accepter à 44 px, groupe replié « Sans cause proposée (N) », `CLAUDE.md` et `DESIGN.md` alignés. **Suites pour notes** : le canal n'est pas corrigeable dans le portail (`DecisionLigne` sans `canal`), aucun geste pour retirer une cause ajoutée à la main, `authorshipBlocMarches` ignore les lignes sans cause tant qu'aucune décision n'y est posée (à valider) — design
- [~] J1.5 Bascule à partir de la note suivante — **posée par une constante** (`MARCHES_PAR_DRIVER_A_PARTIR_DE = 2026-S45`, J1.3 ; S38 à S44 gardent « Ce que j'avais mal lu »). Reste : un `note:draft --dry-run` sur la vraie fiche S45, et le contrôle à la première publication — notes
- [~] J1.6 Bilan automatique des guets échus — **noyau fait le 30/10** (`bilanGuets` dans `lib/guets.ts`, champ `bilanGuets` du paquet, absent du prompt et du MDX publié). Reste : l'affichage dans le portail (en tête du bloc 5), à valider par Nicolas — notes + design
- [ ] J1.7 Relecture du rédacteur en chef dans `note-hebdo.yml`, avis affiché dans le portail, **consultatif, jamais condition de publication** — notes (+ design pour l'affichage)

## J2 · Back-office /admin

- [x] J2.1 Accès administrateur protégé — **en service le 28/10, accueil public nettoyé le 30/10** (Supabase Auth, middleware, gardes, `/connexion`, bouton « Se connecter », liens d'administration déplacés dans le pied des routes protégées). Reste hors dépôt : J9.3a et J9.3b — plateforme
- [x] J2.2 Accueil /admin : santé des sources et files d'attente — fait le 30/10 (`app/admin`, `lib/admin/files.ts`, lecture seule, « Non mesuré » jamais zéro) — plateforme
- [ ] J2.3 /redaction → /admin/redaction, avec redirection — plateforme
- [x] J2.4 /triage → /admin/veille — plateforme — fait le 30/10 (`/triage` redirige derrière la garde)
- [ ] J2.5 Guets et angles morts côté admin ; décider ce qui reste public — plateforme
- [ ] J2.6 File « À trancher » (table `decisions`) — plateforme
- [~] J2.7 Audit des pages publiques — **en grande partie fait le 30/10** : E5, E6, E2/E3, E1, puis E8 (retours des fiches), E9 (chiffres cités), E12 (jeton `--voile`), cibles de 44 px par pseudo-élément sans changer la hauteur de page. **E7 fait le 30/10** (sélecteur de zone à panneau : bouton « Zone : France ▾ » de 44 px, onze zones en grille, état dans `?zone=`). Reste : E10 (échelle typographique), E11 (ordre de l'accueil), E13 (emoji : à repérer au rendu, ils viennent des données), E14, T1 — design

## J3 · Modèle analytique

- [ ] J3.1 `Guet.axeLibelle` → `Axe.id` : migration et rattachement — notes (+ data pour la migration)
- [ ] J3.2 Angles morts dans le paquet de contexte de rédaction — notes
- [ ] J3.3 Circuit de promotion d'un driver (candidat → observation → actif) — **À trancher** — nicolas + notes

## J4 · Refonte de la page Notes

- [x] J4.1 Audit de densité à 390 px — fait le 30/10 : `rapports/conformite-2026-10-30.md` (17 routes ; 4 écarts hauts, 7 moyens, 3 bas, 2 à trancher) — design
- [ ] J4.2 Nouvelle hiérarchie : thèse, ce qui a bougé, mécanisme, marchés par driver, guets — design + notes
- [ ] J4.3 Maquette Claude Design et amendement `DESIGN.md`, avant tout code — design
- [ ] J4.4 Intégration : sections repliables, barre d'ancres allégée — design
- [ ] J4.5 Liste des notes : filtres driver et axe, recherche — design
- [ ] J4.6 Export PDF d'une note — design

## J5 · Moteur d'alertes et notes spéciales

- [x] J5.1 Seuils objectifs par driver — **tranché le 30/10 par Nicolas** : actions et devises ±5 %, taux et spreads ±50 bps, Brent ±8 %, géopolitique = début ou fin de guerre, cessez-le-feu majeur ou flux physique, **résultats des dix premières capitalisations mondiales** ajoutés ; règles de consensus et de banque centrale **dormantes** (aucune donnée), instruments sans driver **sans alerte** jusqu'à J3.3. Tableau et précisions dans `CLAUDE.md`. Spreads à ±50 bps **confirmés par Nicolas le 30/10**. **Reste à valider** : le critère « réaction du titre ≥ 5 % ou guet résolu » pour les résultats — nicolas + veille
- [ ] J5.2 Moteur évalué après le cron, `AlertEvent` en base — veille (+ data pour la table)
- [ ] J5.3 `AlertEvent` de type `evenement` (géopolitique et macro, passe 2) — veille
- [ ] J5.4 Remplacer les alertes du seed — veille
- [ ] J5.5 Notes spéciales automatisées (Étape 7) : brouillon à trois blocs, validé et publié par Nicolas — notes
- [ ] J5.6 Détection fréquente des breaking news rattachées aux drivers (GitHub Actions, toutes les 2 h en jours ouvrés, coût API chiffré) — veille
- [~] J5.7 Résultats des dix premières capitalisations mondiales — **structure livrée le 30/10, liste vide** (`config/emetteurs-majeurs.ts` : type, source datée obligatoire, avertissement au-delà de 100 jours, `preparerSuivi` ; aucun branchement, collecte inchangée). L'agent n'a pas de réseau : **rien n'est écrit de mémoire**. **Nicolas doit fournir** : (1) un classement public des dix premières capitalisations, avec libellé, URL et date, et la liste relevée ; (2) le CIK sec.gov de chaque émetteur américain (les six CIK déjà suivis sont annotés « recopiés de mémoire » : à confronter) ; (3) le driver de chaque émetteur EDGAR non encore suivi, ou la décision de ne pas le suivre ; (4) la source de communiqués des émetteurs hors EDGAR ; (5) les dates de résultats, lues sur le calendrier officiel de chaque émetteur ; (6) la validation du critère « titre ≥ 5 % à la séance suivante ou guet résolu ». Si ce critère est retenu : collecter la clôture des dix titres (data, ~10 appels par jour, à chiffrer avec les séries déjà collectées par ce fournisseur) — veille + data + nicolas

## J6 · Assistant IA de la note

- [ ] J6.1 Spécifier le périmètre (explique le mécanisme, refuse le conseil) — **À trancher** — nicolas + notes
- [ ] J6.2 Paquet de contexte — notes
- [ ] J6.3 Route API côté serveur, streaming, quota — plateforme
- [ ] J6.4 Interface : feuille mobile, questions suggérées — design
- [ ] J6.5 Réponses ancrées, aucun chiffre hors base — notes
- [ ] J6.6 Journal des questions dans /admin — plateforme
- [ ] J6.7 Jeu d'évaluation de 20 questions types — notes

## J7 · Sources et outlooks

- [x] J7.1 Vue YTD multi-actifs dans Marchés (« non suivi » ligne par ligne) — fait le 30/10 : `/marches?vue=ytd`, `lib/performance-ytd.ts`, aucune moyenne par classe. Reste : validation du bouton « YTD » et de la ligne à deux bornes par design (DESIGN.md) ; base du 31/12 déduite du dernier relevé (pas de `ytdBasisYear`) — data (+ design)
- [ ] J7.2 Bund et OAT quotidiens, donc spreads quotidiens — data
- [ ] J7.3 Brent à terme ICE (Twelve Data, à défaut Alpha Vantage, puis ETF BNO signalé) — data
- [ ] J7.4 10 ans Inde et Chine, Hang Seng — data
- [ ] J7.5 Brancher l'INSEE — data
- [ ] J7.6 12 indicateurs non suivis : accepter le trou ou payer — **À trancher** — nicolas
- [ ] J7.7 Collecte des outlooks : PDF → condensé → points validés — notes (+ plateforme pour le dépôt dans /admin)
- [ ] J7.8 Graphiques originaux des outlooks (`imageGraphique`) — notes
- [ ] J7.9 Rattacher les points d'outlook aux scénarios — notes
- [ ] J7.10 Matrice scénarios × banques — notes (+ design)
- [x] J7.11 Millésime sur chaque outlook — fait le 30/10 : `Outlook.millesime` (entier, obligatoire), contrôle d'intégrité (doublon banque + millésime + période refusé, 2026 et 2027 coexistent). **Tout outlook 2027 doit porter `millesime`, sinon le site répond 500 au chargement** — notes, à la saisie de J7.15 — data
- [x] J7.12 Sélecteur de millésime sur la page Outlook — fait le 30/10 (`?millesime=`, plus récent par défaut, caché avec un seul millésime) ; le millésime n'est pas répété dans l'en-tête de `/outlook/[id]`, `periodCovered` le porte déjà — design
- [x] J7.13 Prévisions structurées — fait le 30/10 : type `Prevision` (cible du catalogue ou hors catalogue assumé, ponctuelle ou fourchette, jamais de moyenne), champ facultatif `previsions` sur `Outlook`, contrôle d'intégrité (cible, unité, point source, doublon). **Aucune prévision saisie** : la saisie est J7.15, depuis les documents lus (pistes : S&P 500 de Morgan Stanley, taux directeur américain et croissance de HSBC) — data
- [ ] J7.14 Vue de confrontation prévision / valeur, sans jugement — data (base) + design (interface)
- [ ] J7.15 Outlooks 2027 (mi-novembre à début décembre ; + Goldman Sachs, Pictet) — Bloquant — notes
- [ ] J7.16 Catalogue cible des newsletters chiffrées par driver (propositions de notes à chaque hebdo) — **À trancher** — nicolas + veille (+ notes pour les propositions)
- [ ] J7.17 Boîte dédiée aux newsletters — **À trancher** — nicolas
- [ ] J7.18 Ingestion des newsletters dans la veille, audit de rappel — veille
- [ ] J7.19 Chiffres clés de l'accueil : ajouter **les taux de la BCE, l'inflation américaine et le MSCI World** — demandé par Nicolas le 30/10. État : taux BCE (`ez-policy-rate`, FRED) et inflation américaine (`us-cpi`, FRED) sont collectés ; **le MSCI World n'existe pas au catalogue** (il porte MSCI ACWI, en ETF iShares, en $/part, repère « monde développé + émergents » — pas la même chose) : source à trouver (ETF de repli via Alpha Vantage ou Twelve Data, à signaler comme approximation) ou accepter l'ACWI. Aujourd'hui les chiffres clés sont **choisis par le modèle dans le frontmatter de chaque note** (`keyIndicators`) et résolus en valeur vivante ; pour qu'ils soient toujours là, il faut un **socle fixe** de chiffres clés (configuration), affiché en plus de ceux de la note — data (source du MSCI World, `lib/chiffres-vivants*.ts`) + design (grille) + notes (paquet)

## JT · Marque Transmission

- [ ] JT.1 Nom et logo en maquette (tech et média traditionnel dépoussiéré) — **À trancher** — nicolas + design
- [ ] JT.2 Intégration de la marque dans l'interface (le nom de code reste dans le code) — design

## J8 · Newsletter

- [ ] J8.1 Stratégie newsletter — **À trancher** — nicolas
- [ ] J8.2 Cadre minimal avant le premier envoi externe (voir J9.1) — Bloquant — nicolas
- [ ] J8.3 Choix de l'outil d'envoi (UE, API) — **À trancher** — nicolas
- [ ] J8.4 Domaine d'envoi, SPF, DKIM, DMARC — plateforme
- [ ] J8.5 Inscription et désinscription, double opt-in, RGPD — plateforme
- [ ] J8.6 Gabarit de la note hebdo — design
- [ ] J8.7 Envoi branché sur `publier-note.yml`, après validation de Nicolas — plateforme
- [ ] J8.8 Gabarit et envoi de la note spéciale (dépend de J5.5) — plateforme + design
- [ ] J8.9 Mesure : abonnés, ouvertures, clics, désinscriptions — plateforme

## J9 · Ouverture et freemium

- [ ] J9.1 Cadre réglementaire et employeur (MAR, CIF, conflits d'intérêts, contrat de travail) — Bloquant — nicolas, **conseil humain**
- [ ] J9.2 Stratégie freemium — **À trancher** — nicolas
- [ ] J9.3 Authentification des utilisateurs (lien magique) — plateforme
- [ ] J9.3a Connexion par Google à l'ouverture au public ; le rôle admin reste posé à la main, une inscription publique ne le donne jamais — plateforme
- [ ] J9.3b Lien magique utilisable depuis tous les navigateurs : SMTP personnalisé (avec J8.3 / J8.4) puis modèle d'e-mail `token_hash`, déjà accepté par `/auth/confirmer` — Bloquant avant l'ouverture au public — plateforme
- [ ] J9.4 Droits par niveau (RLS, paywall) — plateforme
- [ ] J9.5 Paiement et abonnements (Stripe) — plateforme
- [ ] J9.6 CGU, mentions légales, confidentialité, avertissement — plateforme + nicolas
- [ ] J9.7 Mesure : inscriptions, conversion, rétention — plateforme
