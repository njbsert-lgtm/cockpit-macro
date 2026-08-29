import type { ContextePaquet } from "./context";
import { estDegrade } from "./context";
import { BLOCK_TITLES, type BlockName } from "@/lib/note-blocks";

/**
 * Le prompt de rédaction.
 *
 * Trois exigences que le cahier isole, et la troisième est la plus importante :
 * - le ton est **montré** par la note précédente en entier, pas décrit en abstrait ;
 * - tout chiffre vient du paquet, jamais de mémoire ;
 * - **il est explicitement permis de n'avoir rien à réviser.** Sans cette permission écrite,
 *   un rédacteur non supervisé fabriquera une révision de façade chaque semaine pour avoir
 *   l'air actif. C'est le mécanisme le plus probable par lequel ce pipeline produirait du
 *   contenu inventé, et il ne coûte qu'une phrase à désamorcer.
 */

export const SYSTEM_PROMPT = `Tu rédiges le brouillon d'une note d'analyse macroéconomique et géopolitique pour un carnet personnel. Tu écris en français.

## Ce que tu produis, et ce que tu ne produis pas

Tu rédiges un brouillon. Tu ne publies pas. Un humain relit chaque bloc, tranche chaque proposition de révision, et décide seul de publier. Écris donc ce que tu penses réellement défendable, pas ce qui a l'air d'une note finie.

## Le contexte est ton seul horizon

Tu n'as aucun accès au web. Le paquet de contexte qu'on te donne est tout ce qui existe. Ce qui n'y figure pas ne peut pas entrer dans la note.

**Tout chiffre que tu écris doit venir du paquet.** Pas de ta mémoire, pas d'un ordre de grandeur plausible. Un contrôle automatique confronte ensuite chaque nombre du texte au paquet, et un chiffre introuvable bloque la publication. Si tu ne trouves pas la valeur dont tu as besoin, écris la phrase sans chiffre.

Tu ne cites jamais une source par son URL : tu choisis un identifiant d'item de veille dans la liste fournie.

## Le registre

Le corpus dit « nous », jamais « je ». Phrases courtes. Un jugement par paragraphe. Pas de formule d'atténuation en série : une note qui multiplie « pourrait », « semblerait » et « il conviendra de surveiller » n'a rien tranché. La note précédente t'est donnée en entier — c'est le ton à tenir.

## Ce qu'il est permis de ne pas faire

Lis attentivement ce paragraphe, il compte autant que les autres.

- **Il est permis de n'avoir aucune révision de scénario à proposer.** Une semaine où les données n'ont rien déplacé produit une liste de révisions vide. C'est une réponse juste, pas un manque de zèle.
- **Il est permis de n'avoir aucun changement de statut de tendance à proposer.**
- **Il est permis d'écrire que rien n'a changé.** « Rien n'a modifié la thèse cette semaine » est une information de premier ordre, et le bloc « ce qui a changé » a le droit de le dire en trois lignes.
- Si le paquet est pauvre — collecte en échec, aucun item de veille —, écris une note courte qui le dit. Ne comble jamais un contexte vide par des généralités de marché.

Une révision inventée pour meubler est la pire chose que tu puisses produire ici : elle entre dans la trajectoire du scénario et fausse durablement la lecture.

## Le bloc « ce que j'avais mal lu »

Tu ne l'écris pas. Il ne t'est pas demandé. Tu connais les textes de l'auteur, pas ses intentions : une auto-critique écrite par toi serait plausible et creuse, et détruirait ce que ce bloc existe pour capter. Le champ reste vide et l'humain le remplit.

## Les guets

Le bloc « ce que je surveille » est une liste de guets : des attentes pré-inscrites qu'un événement viendra confirmer ou infirmer. Chacun porte un libellé, ce que tu attends, le signal qui le confirmerait, celui qui l'infirmerait, une échéance et la source attendue.

- L'échéance vaut \`null\` quand l'événement n'a pas de date connue — « si le détroit rouvre » n'a pas de date. Un tel guet ne s'éteint jamais tout seul.
- On te dit combien de guets neufs tu peux proposer. Les guets remontés de la note précédente occupent déjà des places.
- Un guet doit être vérifiable : « surveiller l'inflation » n'est pas un guet, « le cœur d'inflation US de septembre publié au-dessus de 2,8 % » en est un.`;

/** Le prompt utilisateur — le paquet mis en forme, sans interprétation. */
export function construirePromptUtilisateur(
  paquet: ContextePaquet,
  blocsAttendus: BlockName[],
): string {
  const sections: string[] = [];

  sections.push(
    [
      "# La note à rédiger",
      "",
      `- Type : ${paquet.noteType === "hebdo" ? "note hebdomadaire" : "note spéciale"}`,
      `- Semaine ISO : ${paquet.isoWeek}`,
      `- Date de parution : ${paquet.date}`,
      paquet.trigger ? `- Seuil déclenché : ${paquet.trigger}` : null,
      "",
      "Blocs à rédiger :",
      ...blocsAttendus.map((b) => `- \`${b}\` — ${BLOCK_TITLES[b]}`),
      "",
      "Le bloc « ce que j'avais mal lu » ne t'est pas demandé : il reste vide.",
    ]
      .filter((l) => l !== null)
      .join("\n"),
  );

  if (estDegrade(paquet)) {
    sections.push(
      [
        "# ⚠︎ Contexte dégradé",
        "",
        "Aucun item de veille et aucune observation fraîche. Écris une note courte qui le dit",
        "explicitement. Ne comble pas par des généralités.",
      ].join("\n"),
    );
  }

  sections.push(rendreNotePrecedente(paquet));
  sections.push(rendreObservations(paquet));
  sections.push(rendreScenarios(paquet));
  sections.push(rendreTendances(paquet));
  sections.push(rendreGuets(paquet));
  sections.push(rendreVeille(paquet));

  return sections.filter(Boolean).join("\n\n---\n\n");
}

function rendreNotePrecedente(paquet: ContextePaquet): string {
  if (!paquet.notePrecedente) {
    return "# Note précédente\n\nAucune : c'est la première note du fil. Le bloc « ce qui a changé » n'a pas de point de comparaison — dis-le.";
  }

  const { slug, regimeStatement, driverOrder, blocs } = paquet.notePrecedente;
  const corps = Object.entries(blocs)
    .map(([nom, texte]) => `### ${BLOCK_TITLES[nom as BlockName] ?? nom}\n\n${texte}`)
    .join("\n\n");

  return [
    `# Note précédente (${slug}) — le ton à tenir, et ce à quoi « ce qui a changé » se compare`,
    "",
    `**Régime affiché :** ${regimeStatement}`,
    `**Ordre des drivers :** ${driverOrder.join(" › ")}`,
    "",
    corps,
  ].join("\n");
}

function rendreObservations(paquet: ContextePaquet): string {
  if (paquet.observations.length === 0) {
    return "# Observations\n\nAucune. Tu ne peux citer aucun chiffre de marché cette semaine.";
  }

  const lignes = paquet.observations.map((o) => {
    const derniere = o.valeurs.at(-1);
    const valeur = derniere ? `${derniere.value} au ${derniere.date}` : "aucun relevé";
    const semaine = o.variationSemaine === null ? "n/d" : `${o.variationSemaine.toFixed(2)} %`;
    const ytd = o.variationYTD === null ? "n/d" : `${o.variationYTD.toFixed(2)} %`;
    const alerte = o.fraicheur === "ok" ? "" : `  ⚠︎ ${o.fraicheur}`;
    return `| ${o.instrumentId} | ${o.label} | ${valeur} | ${semaine} | ${ytd} |${alerte}`;
  });

  return [
    "# Observations — les seuls chiffres de marché que tu peux citer",
    "",
    "| id | libellé | dernière valeur | var. semaine | var. YTD |",
    "|---|---|---|---|---|",
    ...lignes,
  ].join("\n");
}

function rendreScenarios(paquet: ContextePaquet): string {
  if (paquet.scenariosCourants.length === 0) return "# Scénarios courants\n\nAucun.";

  const parDriver = new Map<string, string[]>();
  for (const v of paquet.scenariosCourants) {
    const lignes = parDriver.get(v.driverId) ?? [];
    lignes.push(
      `- \`${v.branchId}\` — **${v.likelihood}** (version ${v.version}) : ${v.thesis}`,
    );
    parDriver.set(v.driverId, lignes);
  }

  return [
    "# Scénarios courants",
    "",
    "Réviser un driver, c'est réémettre ses trois branches, avec une seule « central ».",
    "Ne propose une révision que si le contexte la justifie ; une liste vide est une réponse valide.",
    "",
    ...[...parDriver.entries()].flatMap(([driverId, lignes]) => [`## ${driverId}`, ...lignes, ""]),
  ].join("\n");
}

function rendreTendances(paquet: ContextePaquet): string {
  if (paquet.tendancesCourantes.length === 0) return "";
  return [
    "# Tendances de fond",
    "",
    ...paquet.tendancesCourantes.map((t) => `- \`${t.id}\` — **${t.status}** : ${t.title}`),
  ].join("\n");
}

function rendreGuets(paquet: ContextePaquet): string {
  const sections = [`# Guets — tu peux en proposer ${paquet.budgetGuets} de plus`];

  if (paquet.guetsOuverts.length > 0) {
    sections.push(
      "",
      "## Encore ouverts, posés précédemment",
      ...paquet.guetsOuverts.map(
        (g) =>
          `- \`${g.id}\` (${g.noteSlug}) — ${g.libelle} · échéance ${g.echeance ?? "aucune"}`,
      ),
    );
  }

  if (paquet.guetsExpires.length > 0) {
    sections.push(
      "",
      "## Expirés sans résolution — ils remontent dans cette note",
      ...paquet.guetsExpires.map((g) => `- \`${g.id}\` (${g.noteSlug}) — ${g.libelle}`),
      "",
      "Un guet expiré est une question qu'on a cessé de se poser sans le décider. Dis-le dans le bloc « ce qui a changé » si ça compte.",
    );
  }

  if (paquet.echeancesSemaine.length > 0) {
    sections.push(
      "",
      "## Échéances connues de la semaine à venir",
      ...paquet.echeancesSemaine.map(
        (e) => `- ${e.date} — ${e.libelle} (driver \`${e.driverId}\`, source ${e.source})`,
      ),
      "",
      "On ne pose pas un guet sur un événement qu'on a oublié.",
    );
  } else {
    sections.push("", "Aucune échéance au calendrier pour la semaine à venir.");
  }

  return sections.join("\n");
}

function rendreVeille(paquet: ContextePaquet): string {
  if (paquet.itemsVeille.length === 0) {
    return "# Items de veille\n\nAucun. Tu ne peux citer aucune source cette semaine : laisse `sources` et `veilleItemRefs` vides.";
  }

  return [
    "# Items de veille — les seules sources citables",
    "",
    "Cite un item par son identifiant dans `sources` et `veilleItemRefs`. N'écris jamais d'URL.",
    "",
    ...paquet.itemsVeille.map(
      (i) => `- \`${i.id}\` — [${i.source}] ${i.title} (${i.publishedAt})`,
    ),
  ].join("\n");
}
