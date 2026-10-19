# État du projet — au 19/10/2026

Point d'entrée pour reprendre le travail. **`CLAUDE.md` (cahier des charges) et `DESIGN.md`
(charte) font autorité** ; ce fichier dit où on en est par rapport à eux, et ce qui a été discuté
sans être fait. `CHAINE-REACTION.md`, `couche-intelligence.md` et `newsletters-veille.md` sont des
documents de cadrage plus anciens (début octobre) : utiles pour l'historique, pas à jour.

## Pratique

- Travail directement sur **`main`** (les sessions précédentes y poussent ; la branche
  `claude/nextjs-tabs-skeleton-np68r6` est ancienne et très en retard, ne pas s'y fier).
- Commits atomiques en français. Avant de pousser : `npx tsc --noEmit`, `npx vitest run`
  (1088 tests verts), `npm run lint` (0 erreur, 7 avertissements anciens).
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
matière principale, contrôle des chiffres à deux régimes. Notes réelles publiées : S38 à S42.

**Veille (Étape 5).** Passe 1 dans le cron, passe 2 via `veille-passe2.yml` (7 h UTC), file
`/triage`, angles morts (`angles_morts`, compteur sur la page du driver).

**Outlook.** Cinq outlooks dans `content/outlooks.ts` (J.P. Morgan, HSBC, BNP Paribas, Citi,
Morgan Stanley), rédigés hors de l'app. Modèle `themes` / `points` / `positionnement`. Chaque
point a titre, explication, source, et chiffres/risques/série quand le document les donne — tirés
des condensés, rien d'ajouté. Logos SVG dans `public/outlooks/logos/` (workflow
`logos-outlooks.yml`, Wikidata P154). Sous un filtre de thème, les points s'affichent en phrase.

## Passation de design mobile (Claude Design) — entièrement faite

`DESIGN.md` amendé, puis toutes les maquettes : **1a** accueil (« Depuis S41 », chiffres clés
vivants, `ChiffreSheet`), **1b** lecture (barre d'ancres, chiffres cités touchables),
**1c** Marchés « Par driver » (`?vue=drivers`), **1d** Macro (« Cette semaine », liste dense
mobile, lien vers le driver), **1e** page d'un driver (dominante encadrée, repère de révision,
trajectoire compacte, instruments en cellules, guets ouverts), **2a/3a/3b/3c** Outlook.

## Décisions récentes (19/10/2026)

- **Brent → « Brent physique ».** FRED `DCOILBRENTEU` est le spot physique de l'EIA, pas le
  contrat à terme ICE (≈ 108 $ contre 126 $ au 14/10). Base et FRED vérifiées identiques.
  Publié avec ~1 semaine de retard. Le rattachement des chiffres passe par l'id `brent`.
- **Cuivre retiré des instruments pilotés du driver IA** (bruité, mensuel). Il reste témoin de
  l'axe « Contrainte physique » dans `content/axes.ts`.
- Questions des drivers reformulées (Fed, Iran, IA). Pictogrammes Macro/Marchés intervertis.

## Discuté, pas encore fait

**Ouvert dans la dernière session (19/10)**
1. **Source du Brent à terme (ICE).** Proposé : sonder Twelve Data / Alpha Vantage ; à défaut un
   ETF (BNO) — en $/part, donc une approximation à signaler. Non commencé.
2. **Cuivre dans l'axe « Contrainte physique »** : le garder comme témoin ou le retirer aussi ?
   Question posée, sans réponse.
3. **Historique Git** : le premier passage de `logos-outlooks.yml` a commité ~12 Mo de photos
   (commit `4602cd8`), retirées ensuite mais présentes dans l'historique de `main`. Réécriture
   proposée, **en attente d'accord** — ne pas la faire sans.
4. **Logo J.P. Morgan** : c'est celui du groupe (JPMorganChase) ; la marque « J.P. Morgan » de
   la banque privée n'existe pas en SVG sur Commons. À remplacer si l'utilisateur fournit le
   fichier.
5. Outlook : aucune capture de graphique original (`imageGraphique`) fournie ; explications
   limitées au contenu des condensés (pour aller plus loin, relire les PDF).

**Prévu par `CLAUDE.md`, non fait**
6. **Moteur d'alertes (Étape 4)** : non commencé. Les alertes affichées viennent du seed
   (`nonCollecte`). Pas de notes spéciales automatisées (Étape 7) ni d'`AlertEvent` de type
   `evenement`.
7. **Remise à zéro du corpus (Étape 6.6)** : les notes de développement fictives S24 à S32
   (et les trajectoires/historiques qui s'y accrochent) sont toujours dans `content/notes/`.
8. **Angles morts dans le paquet de contexte** : le compteur se lit, mais n'alimente pas encore
   la rédaction.
9. **`Guet.axeLibelle` → `Axe.id`** : rattachement des guets aux axes, non fait.
10. **Circuit de promotion d'un driver** (candidat → observation → actif) : à spécifier.
11. **Étape 4, confort** : recherche dans les notes, export PDF d'une note.
12. **Données manquantes** : 12 indicateurs non suivis (six PMI propriétaires, balances
    courantes US/JP/CN, solde budgétaire UK, salaires JP et zone euro) ; Bund/OAT et donc les
    spreads seulement en mensuel ; points à 10 ans Inde/Chine au seed ; Hang Seng sans source ;
    INSEE non branchée.
