# Contenu généré — ne rien éditer ici à la main

Les fichiers `*.generated.ts` de ce dossier sont écrits par
`scripts/publier-note.mts`, au moment où une note est publiée depuis
`/redaction` — jamais par la rédaction du brouillon
(`scripts/rediger-note.mts`), qui ne fait que proposer des révisions sans
les appliquer. Ils sont réécrits **intégralement** à chaque publication —
pas de mutation en place, pas de patch.

Ils sont volontairement séparés du contenu écrit à la main
(`content/scenarios.ts`, `content/tendances.ts`) pour trois raisons :

- **`git blame` reste net** — on voit d'un coup d'œil ce qu'un humain a
  écrit et ce que la machine a produit.
- **Annuler l'historique automatique est trivial** :
  `git checkout content/generated/` (ou vider les tableaux exportés) efface
  tout ce que le pipeline a écrit, sans toucher au corpus manuel.
- **Un bogue du rédacteur ne peut pas corrompre l'analyse manuscrite.**

Si vous voulez corriger à la main une entrée que le pipeline a écrite,
déplacez-la dans le fichier manuel correspondant (`content/scenarios.ts` ou
`content/tendances.ts`) et retirez-la d'ici — sinon le prochain passage la
réécrira.
