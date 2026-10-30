# Registre de conformité — audit J4.1 (30/10/2026)

Audit seul, aucun composant modifié. Build `next build` + `next start -p 3110`, Playwright
(chromium), 390 px et 1100 px, 17 routes. Réseau coupé : Supabase injoignable, les écrans
retombent sur le seed et affichent « Non collecté » / « Jamais collecté » — **attendu, non
compté comme écart**. IBM Plex Sans ne se charge pas hors ligne (repli système) : non compté.

Captures (scratchpad, non committées) :
`/tmp/claude-0/-home-user-cockpit-macro/4b278022-cb2b-5a77-97bd-7273d3ea976f/scratchpad/shots/<route>-<390|1100>[-fold].png`
avec `<route>` = home, notes, note, driver, tendances, themes, macro, macroind, eq, rates, cm, fx,
instr, outlook, outfiche, outpoint, connexion. Mesures brutes : `.../scratchpad/metrics.json`
(script `.../scratchpad/audit.cjs`).

Limites assumées : la règle chromatique (vert/rouge) et les « chiffres datés » n'ont été vérifiés
que par lecture des captures et un grep, pas exhaustivement ; les cinq états ne sont vérifiés que
par la présence des fichiers Next (`loading.tsx`, `error.tsx`, `not-found.tsx`) et les états
« vide / non collecté » vus à l'écran.

## 1. Tableau route × critère

C = conforme · E = écart · T = à trancher · ? = non vérifié à l'écran.
Mobile = 390 px. « H-scroll » = défilement horizontal de la page.

| Route | Jetons / rayons | Chromatique | Interdits | Chiffres datés | 5 états | Cibles 44 px | H-scroll | 1 primaire | Aria | Public sans statut technique |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | C | C | C | C | E (E1) | E (E2, E3) | C | C | C | **E (E5)** |
| `/notes` | C | C | C | ? | E (E1) | E (E2) | C | T (T1) | C | C |
| `/notes/2026-S43` | **E (E6)** | ? | C | C | E (E1) | **E (E4)** | C | T (T1) | C | C |
| `/notes/drivers/iran` | C | C | C | C | E (E1) | E (E2) | C | C | C | **E (E5)** |
| `/notes/tendances` | C | C | C | ? | E (E1) | E (E2) | C | C | C | C |
| `/notes/themes` | C | C | C | ? | E (E1) | E (E2) | C | C | C | C |
| `/macro` | C | ? | C | C | E (E1) | **E (E7)** | C | T (T1) | C | C |
| `/macro/us-cpi` (fiche) | C | ? | C | C | E (E1) | E (E2, E8) | C | C | C | C |
| `/marches?classe=equity` | C | ? | C | C | E (E1) | E (E2) | C | T (T1) | C | C |
| `/marches?classe=rates` | C | ? | C | C | E (E1) | E (E2) | C | T (T1) | C | C |
| `/marches?classe=commodity` | C | ? | C | C | E (E1) | E (E2) | C | T (T1) | C | C |
| `/marches?classe=fx` | C | ? | C | C | E (E1) | E (E2) | C | T (T1) | C | C |
| `/marches/equity/spx` (fiche) | C | ? | C | C | E (E1) | E (E2, E8) | C | C | C | C |
| `/outlook` | C | C | C | n.a. | E (E1) | E (E2) | C | C | C | C |
| `/outlook/jpmorgan-mid-2026` | C | C | C | n.a. | E (E1) | E (E2) | C | T (T1) | C | C |
| `/outlook/jpmorgan-mid-2026/trois-themes` | C | C | C | n.a. | E (E1) | E (E2) | C | C | C | C |
| `/connexion` | C | C | C | n.a. | E (E1) | E (E2) | C | C | C | C |

Aucune page : défilement horizontal, dégradé, ombre sur carte, mode sombre, monospace, deuxième
famille de police, quatrième rayon hors E6 (mesuré : seuls 999 px, 16 px, 10 px, plus 2 px sur la
note).

## 2. Écarts par gravité

### Gravité haute (coût direct pour le lecteur mobile)

- **E4 — La note à 390 px fait 7 866 px, soit 9,3 écrans** (`note-390.png`). « Ce qui a changé » seul
  occupe 3 291 px (3,9 écrans) ; « Ce qui s'est confirmé » 1 178 px ; l'ensemble 2 038 mots. Le
  premier écran ne contient que retour, chips d'ancre, pastille de canal, titre en 26 px et les
  trois premières lignes du bloc 1 : **ni chiffres clés, ni vue d'ensemble de la thèse**. Les
  chips d'ancre (« Changé 5 », « Confirmé 3 »…) consomment 56 px collants sur tout le défilement.
  Texte justifié en 14,5 px sur ~300 px de colonne : lézardes et coupures visibles (« l'es-pace »,
  « déploie-ment ») malgré `hyphens:auto` (`note-390-fold.png`).
- **E7 — Sélecteur de zone de `/macro` : 14 boutons de 31 px de haut** (11 zones + modes), sous
  les 44 px de la charte. Macro est aussi la page la plus longue après la note (6 327 px, 7,5
  écrans, 41 mentions « Non collecté »).
- **E5 — Statut technique côté public (J2.7)** : « La table des angles morts n'est pas lisible —
  migration non appliquée ou base injoignable » sur `/` et sur la page driver
  (`AnglesMortsAccueil.tsx:58`, `AnglesMortsDriver.tsx:29`). C'est le libellé d'erreur de la charte
  (« Non mesuré »), mais sa phrase nomme des causes d'exploitation. À trancher avec Nicolas :
  garder (diagnostic honnête) ou reformuler pour le public.
- **E1 — Cinq états incomplets** : aucun `loading.tsx`, `error.tsx` ni `not-found.tsx` pour les
  routes publiques (recherche dans `app/`, hors routes protégées). États 2 (chargement, squelettes)
  et 5 (erreur) non dessinés au niveau route ; seuls les états vide / non collecté de composants
  existent.

### Gravité moyenne

- **E2 — Bouton de fraîcheur de la barre persistante : 114 × 29 px**, présent sur les 17 routes
  (« aucune donnée / Jamais collecté »). Cible tactile < 44 px (`DESIGN.md` : « 44 px sur tout
  contrôle principal » ; le point de fraîcheur est cliquable pour le détail par source).
- **E3 — En-tête de section « Notes › » de l'accueil : 58 × 26 px.** `CLAUDE.md` : l'en-tête est
  « entièrement cliquable » car le chevron seul est trop petit au pouce ; la zone mesurée n'est que
  le texte du titre.
- **E8 — Fiches indicateur / instrument** : lien de retour « ← Actions » 57 × 19 px, « ← États-Unis »
  76 × 19 px.
- **E9 — Pastilles de chiffres cités dans la note** (`ChiffreCite`) : 20 boutons de 24 px de haut
  (« 115,22 $ », « 4,96 % »…), qui ouvrent la feuille de contrôle. Lien « 2026-S42 » (comparaison)
  57 × 14 px.
- **E10 — Densité typographique : 12 tailles de texte sur l'accueil mobile**
  (9,5 · 10,5 · 11 · 11,5 · 12 · 12,5 · 13 · 13,5 · 15 · 15,5 · 17 · 24 px) ; 10 sur la note
  (9,5 · 10 · 11 · 12 · 12,5 · 13 · 14,5 · 15,5 · 26) ; 12 sur `/macro`. La charte en fixe 8 niveaux ;
  11,5, 13,5 et 10 px n'y figurent pas (11,5 px : 42 occurrences sur `/outlook`, 13,5 px : cartes
  texte d'outlook, ce dernier est pourtant écrit dans la charte pour la carte texte). **9,5 px est
  la taille la plus utilisée (34 occurrences sur `/`)** : étiquettes en capitales, sous le seuil de
  lisibilité au pouce.
- **E11 — Accueil : l'angle mort « Non mesuré » et les trois cartes de driver** occupent 1 084 px
  (« Ce qui fait bouger le marché » : 767 → 1851) avant d'atteindre « Notes ». La rangée des notes
  récentes, pourtant le cœur de l'onglet (CLAUDE.md), n'arrive qu'à 2 232 px (2,6 écrans).

### Gravité basse

- **E6 — Quatrième rayon : 2 px** sur `ChiffreCite.tsx:28` (`rounded-[2px]`) et `rounded-sm` sur les
  `<mark>` du portail (`BlocRelecture`, `ChiffresATrancher`, `ChiffresParValeur`) — la charte interdit
  explicitement un quatrième rayon. Aussi `shadow-[0_-8px_30px…]` et `rgba(18,22,26,…)` en dur dans
  `components/states/ChiffreSheet.tsx` : ombre admise (feuille modale flottante), mais la couleur
  est en dur au lieu d'un jeton.
- **E12 — `ChiffreSheet`** : valeur de voile `rgba(18,22,26,.16)` en dur (jeton absent de la charte).
- **E13 — Emoji hors vocabulaire fermé** : 3 sur la page driver, 2 sur `/notes/tendances`, 2 sur le
  point d'outlook ; à confirmer un par un qu'ils relèvent du vocabulaire d'outlook ou de note
  (non audité au détail).
- **E14 — `/notes/2026-S43` : un aplat `--encre` actif (chip « Changé »)** plus le fond de la barre
  d'onglets ; dans la limite des deux aplats mais proche. Aucun second primaire mesuré.

### À trancher

- **T1 — « Un seul bouton primaire »** : le critère ne s'applique qu'aux boutons d'action. Les
  segments, filtres et chips actifs sont en aplat `--encre` (jusqu'à 3 aplats sur `/marches?classe=rates` :
  « Classes d'actifs », « Obligations », « Toutes » ; 2 sur `/macro` ; 2 sur `/notes`). La charte
  plafonne à deux aplats par écran : `rates` en compte trois. À arbitrer : le fil d'Ariane
  « Classes d'actifs » doit-il être en aplat ? (`rates`, `cm`, `fx`, `eq` : tous).
- **T2 — Accueil : le bouton de fraîcheur lit « Jamais collecté »** sur toutes les pages. Sans
  réseau c'est attendu, mais le libellé du détail par source n'a pas été ouvert ; à vérifier en
  ligne.

## 3. Densité (J4.1)

| | `/` | `/notes/2026-S43` |
|---|---|---|
| Hauteur totale à 390 px | 2 852 px = **3,4 écrans** | 7 866 px = **9,3 écrans** |
| Premier écran (844 px) | marque, point de fraîcheur, phrase de régime (24 px), « Depuis S42 » (2 changements), « Chiffres clés » (5 cellules dont 4 « NON COLLECTÉ ») ; entame de « Ce qui fait bouger le marché » masquée par la barre d'onglets | retour, chips d'ancre, pastille de canal, titre 26 px, « Comparée à… », premières lignes du bloc 1 ; **aucun chiffre clé visible** |
| Sections (y de départ, px) | régime 93 · Depuis S42 232 · Chiffres clés 466 · Drivers 767 · Angles morts 1 851 · Notes 2 232 · fin 2 852 | titre 235 · Ce qui a changé 406 · Confirmé 3 697 · Scénarios 4 875 · Mal lu 6 232 · Surveille 6 331 |
| Hauteur par section | régime 139 · Depuis S42 234 · Chiffres clés 301 · **Drivers 1 084** · Angles morts 381 · Notes + pied 620 | titre 171 · **Changé 3 291** · **Confirmé 1 178** · Scénarios 1 357 · Mal lu 99 · Surveille 1 535 |
| Tailles de texte distinctes | 12 | 10 |
| Corps de texte | 12,5 px (cartes), 15 px, 13 px | 14,5 px justifié (12 paragraphes) |
| Tailles de 9,5–11 px | 34 / 27 occurrences | 10 / 45 occurrences |

Lecture : l'accueil est correct en longueur ; son défaut est l'ordre (drivers avant notes) et la
présence de quatre étiquettes « Non collecté » sur cinq chiffres. La note est le vrai problème de
densité : un seul bloc fait près de 4 écrans, sans repli.

## 4. Les 5 écarts qui coûtent le plus au lecteur mobile

1. **E4** — la note : 9,3 écrans, premier écran sans chiffre ni vue d'ensemble, bloc « Ce qui a changé »
   à 3,9 écrans, justification fautive. (Cible naturelle de J4.2 / J4.4.)
2. **E7** — le sélecteur de zone de Macro en 31 px de haut : geste le plus fréquent du lecteur sur cet onglet.
3. **E11** — accueil : 1 084 px de drivers avant d'atteindre les notes récentes (cœur de l'onglet).
4. **E2 + E3** — bouton de fraîcheur (29 px) sur toutes les pages et en-tête « Notes › » (26 px) : la cible
   d'entrée vers le fil n'est que le texte.
5. **E1** — pas de `loading.tsx` / `error.tsx` / `not-found.tsx` publics : sur une collecte lente,
   l'écran est blanc, et une erreur affiche la page par défaut de Next.

Hors top 5 mais à ne pas perdre : E5 (libellé d'exploitation côté public, à arbitrer) et E10 (douze
tailles, 9,5 px dominant).

## 5. Règles mécanisables (candidats à un test statique, à la manière de `lib/auth/frontiere.test.ts`)

1. Aucune valeur de couleur hexadécimale ou `rgb(a)` en dur dans `components/**` et `app/**/*.tsx`
   (hors `ChiffreSheet`, à convertir en jeton) — grep.
2. Aucun rayon hors `rounded-rc|rb|rp` (`rounded-[…]`, `rounded-sm`, `rounded-md`…) — grep ; attrape E6.
3. Aucun `shadow-*` hors liste blanche (barre d'onglets, `ChiffreSheet`).
4. Aucun `gradient`, `animate-*` (hors `reduced-motion`), `font-mono` hors `code`/`pre`/URL.
5. Tailles de texte : aucune classe `text-[…px]` hors l'échelle de la charte (liste fermée de jetons).
6. Existence de `loading.tsx`, `error.tsx`, `not-found.tsx` pour chaque segment public de premier niveau.
7. Aucune occurrence de `seed`, `migration`, `Supabase`, `injoignable` dans le texte rendu des
   composants publics (liste blanche de composants admin).
8. Chaque `<button>` / `<a>` dont le libellé n'est pas dans un paragraphe porte une classe de hauteur
   `min-h-11` ou équivalent (cibles de 44 px) — approximatif statiquement ; la mesure Playwright
   (script `audit.cjs`) est plus fiable, à promouvoir en test e2e hors ligne.
9. `text-hausse` / `text-baisse` interdits hors composants de chiffres (liste blanche : variation,
   `GuetLine` « Infirmé si », compteur de validation) ; aucune classe `text-k-*` sur un composant
   rendant un nombre.
10. `aria-pressed` sur tout bouton de filtre, `aria-expanded` + `aria-controls` sur tout dépliant.
11. Un seul `bg-encre` hors état actif par route (compte statique grossier ; la mesure Playwright
    des aplats est plus précise).

## 6. Proposition pour J4.2 (trois lignes)

Faire de la note une page à trois niveaux : thèse + 3 chiffres clés + « ce qui a bougé » en moins
d'un écran, puis blocs **repliés par défaut** (premier bloc ouvert), puis pièces à conviction.
Passer le corps en 14,5 px non justifié (ou justifié seulement ≥ 768 px) et garder les chips
d'ancre allégées. Sur l'accueil, remonter les notes récentes avant les drivers ou raccourcir la
carte de driver (un cran par ligne).
