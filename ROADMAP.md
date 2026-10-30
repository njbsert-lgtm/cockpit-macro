# Roadmap — état au 30/10/2026

Source de vérité versionnée de la feuille de route. L'artefact visuel
(https://claude.ai/artifact/KFT6HJ4AJpXFPUUFPkTKDY) en est l'affichage ; en cas d'écart, ce
fichier fait foi et l'orchestrateur resynchronise l'artefact. Mis à jour à chaque fusion.

Légende : `[x]` faite · `[~]` en cours · `[ ]` à faire. **À trancher** = décision de Nicolas
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

**Ordre de travail (advisor-technique, 30/10).** Trois agents exécutants au plus à la fois, deux si
l'un est en L ; aucune tâche L le vendredi soir. Chaînes à livrer **en série**, un seul auteur :
`lib/types.ts` et `supabase/schema.sql` (data) : J7.11 → J7.13 → J2.6 → J3.1 → J5.2 ; `middleware.ts`
(plateforme) : J2.2 → J2.3 → J2.4. Prochaines tâches : data J7.11, J7.13, J7.1 (calcul) · notes J1.7,
J3.1, J3.2 · plateforme J2.3, J2.4, J2.6 · design J2.7 réduit, J4.2, J4.3, J7.12 · veille saisie de
`config/calendrier-drivers.ts`, rejeu des seuils (matière de J5.1).
Bloqué par une décision : J1.1 → J1.3, J1.4, J1.5 ; J5.1 → J5.2 à J5.5 ; J6.1 → J6.2 à J6.7 ; JT.1 → JT.2.

## Socle livré

- [x] S.1 Collecte quotidienne (Étape 3) — cron 4 h UTC, 13 modules, `series_health`
- [x] S.2 Calendrier des publications — dates officielles, « Cette semaine », routine du lundi
- [x] S.3 Notes et rédaction assistée (Étape 6, paliers 1–5) — notes S38 à S43 publiées
- [x] S.4 Veille passes 1 et 2 (Étape 5) — `/triage`, angles morts comptés par driver
- [x] S.5 Outlook : 5 banques — logos SVG
- [x] S.6 Passation design mobile — maquettes 1a à 3c

## JA · Organisation en agents

- [x] JA.1 Agents, advisors, `AGENTS.md`, `ROADMAP.md` versionnée — orchestrateur
- [ ] JA.2 Section « Organisation du développement » dans la cartographie Notion — orchestrateur
- [ ] JA.3 Rapport hebdomadaire des agents, chaque samedi à 11 h (Paris) : fait, situation, reste, délais — routine planifiée à créer **sur accord de Nicolas** (coût en tokens chaque semaine) — orchestrateur + advisor
- [ ] JA.4 Budget de tokens hebdomadaire et tailles S/M/L de chaque tâche, pour que les délais se calculent — **À trancher** (le budget) — nicolas + advisor

## J0 · Assainir

- [x] J0.1 Remise à zéro du corpus (Étape 6.6) — Bloquant — notes
- [x] J0.2 Contrôler trajectoires et historiques après la purge — Bloquant — notes
- [x] J0.3 Cuivre dans l'axe « Contrainte physique » : **gardé comme témoin** (26/10) — nicolas
- [x] J0.4 Historique Git (commit 4602cd8, ~12 Mo) : **pas de réécriture** (26/10) — nicolas
- [x] J0.5 Logo J.P. Morgan : **logo du groupe acté** (26/10) — nicolas

## J1 · Les marchés par driver (remplace « Ce que j'avais mal lu »)

- [x] J1.1 Spécifier le bloc — **tranché le 30/10 par Nicolas** : « Les marchés par driver » **remplace** « Ce que j'avais mal lu » à partir de la S45 ; chiffres écrits par le code (`weeklyChange`), cause proposée par le modèle avec émetteur, « sans lien clair » admis, validation ligne par ligne. Spécification dans `CLAUDE.md` — nicolas
- [x] J1.2 Variations hebdo par classe d'actifs (même calcul que J7.1) — fait le 30/10 : `weeklyChange` / `weeklyChanges` dans `lib/performance.ts`, par instrument, sans agrégat de classe ; J7.1 et J1.3 les réutilisent, sans second calcul — data
- [ ] J1.3 Pipeline de rédaction : prompt, paquet de contexte, contrôle des chiffres — notes
- [ ] J1.4 Composant de note et rendu mobile ; amender `CLAUDE.md` et `DESIGN.md` — design
- [ ] J1.5 Bascule à partir de la note suivante (S38–S43 gardent l'ancien bloc) — notes
- [~] J1.6 Bilan automatique des guets échus — **noyau fait le 30/10** (`bilanGuets` dans `lib/guets.ts`, champ `bilanGuets` du paquet, absent du prompt et du MDX publié). Reste : l'affichage dans le portail (en tête du bloc 5), à valider par Nicolas — notes + design
- [ ] J1.7 Relecture du rédacteur en chef dans `note-hebdo.yml`, avis affiché dans le portail, **consultatif, jamais condition de publication** — notes (+ design pour l'affichage)

## J2 · Back-office /admin

- [x] J2.1 Accès administrateur protégé — **en service le 28/10, accueil public nettoyé le 30/10** (Supabase Auth, middleware, gardes, `/connexion`, bouton « Se connecter », liens d'administration déplacés dans le pied des routes protégées). Reste hors dépôt : J9.3a et J9.3b — plateforme
- [x] J2.2 Accueil /admin : santé des sources et files d'attente — fait le 30/10 (`app/admin`, `lib/admin/files.ts`, lecture seule, « Non mesuré » jamais zéro) — plateforme
- [ ] J2.3 /redaction → /admin/redaction, avec redirection — plateforme
- [ ] J2.4 /triage → /admin/veille — plateforme
- [ ] J2.5 Guets et angles morts côté admin ; décider ce qui reste public — plateforme
- [ ] J2.6 File « À trancher » (table `decisions`) — plateforme
- [~] J2.7 Audit des pages publiques — **en partie fait le 30/10** : E5 (« Non mesuré » seul), E6 (rayons), E2/E3 (cibles de 44 px), E1 (`loading`, `error`, `not-found` publics). Reste : E7 (sélecteur de zone de Macro, proposition : un bouton « Zone : France ▾ » + panneau), E8 à E13, T1 — design

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

- [ ] J5.1 Seuils objectifs par driver — **À trancher** — nicolas + veille
- [ ] J5.2 Moteur évalué après le cron, `AlertEvent` en base — veille (+ data pour la table)
- [ ] J5.3 `AlertEvent` de type `evenement` (géopolitique et macro, passe 2) — veille
- [ ] J5.4 Remplacer les alertes du seed — veille
- [ ] J5.5 Notes spéciales automatisées (Étape 7) : brouillon à trois blocs, validé et publié par Nicolas — notes
- [ ] J5.6 Détection fréquente des breaking news rattachées aux drivers (GitHub Actions, toutes les 2 h en jours ouvrés, coût API chiffré) — veille

## J6 · Assistant IA de la note

- [ ] J6.1 Spécifier le périmètre (explique le mécanisme, refuse le conseil) — **À trancher** — nicolas + notes
- [ ] J6.2 Paquet de contexte — notes
- [ ] J6.3 Route API côté serveur, streaming, quota — plateforme
- [ ] J6.4 Interface : feuille mobile, questions suggérées — design
- [ ] J6.5 Réponses ancrées, aucun chiffre hors base — notes
- [ ] J6.6 Journal des questions dans /admin — plateforme
- [ ] J6.7 Jeu d'évaluation de 20 questions types — notes

## J7 · Sources et outlooks

- [ ] J7.1 Vue YTD multi-actifs dans Marchés (« non suivi » ligne par ligne) — Bloquant — data (+ design)
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
- [ ] J7.12 Sélecteur de millésime sur la page Outlook — design
- [x] J7.13 Prévisions structurées — fait le 30/10 : type `Prevision` (cible du catalogue ou hors catalogue assumé, ponctuelle ou fourchette, jamais de moyenne), champ facultatif `previsions` sur `Outlook`, contrôle d'intégrité (cible, unité, point source, doublon). **Aucune prévision saisie** : la saisie est J7.15, depuis les documents lus (pistes : S&P 500 de Morgan Stanley, taux directeur américain et croissance de HSBC) — data
- [ ] J7.14 Vue de confrontation prévision / valeur, sans jugement — data (base) + design (interface)
- [ ] J7.15 Outlooks 2027 (mi-novembre à début décembre ; + Goldman Sachs, Pictet) — Bloquant — notes
- [ ] J7.16 Catalogue cible des newsletters chiffrées par driver (propositions de notes à chaque hebdo) — **À trancher** — nicolas + veille (+ notes pour les propositions)
- [ ] J7.17 Boîte dédiée aux newsletters — **À trancher** — nicolas
- [ ] J7.18 Ingestion des newsletters dans la veille, audit de rappel — veille

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
