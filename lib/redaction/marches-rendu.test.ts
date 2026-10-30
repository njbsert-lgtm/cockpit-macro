import { describe, expect, it } from "vitest";
import {
  authorshipBlocMarches,
  causesAControler,
  formaterVariation,
  ligneEffective,
  rendreBlocMarches,
} from "./marches-rendu";
import type { MarcheContexte, MarcheDriver } from "./marches";
import { controlerChiffres } from "./figures";
import { rendreMdx } from "./mdx";
import { REGIMES_TEST } from "./regime-fixture";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

const CONTEXTE: MarcheContexte[] = [
  {
    driverId: "rates",
    label: "Taux directeurs",
    instruments: [
      {
        instrumentId: "us10y",
        label: "US 10 ans",
        mesure: { instrumentId: "us10y", status: "ok", value: 12.4, unit: "bps", fromDate: "2026-10-23", fromValue: 4.1, toDate: "2026-10-30", toValue: 4.224 },
      },
      {
        instrumentId: "spx",
        label: "S&P 500",
        mesure: { instrumentId: "spx", status: "ok", value: -2.34, unit: "pct", fromDate: "2026-10-23", fromValue: 7000, toDate: "2026-10-30", toValue: 6836.2 },
      },
      { instrumentId: "bund", label: "Bund 10 ans", mesure: { instrumentId: "bund", status: "indisponible", reason: "non-suivi", message: "non suivi" } },
    ],
  },
];

const MARCHES: MarcheDriver[] = [
  {
    driverId: "rates",
    lignes: [
      { instrumentId: "us10y", cause: "Les rendements remontent avec la réévaluation du cycle de la Fed.", emetteur: "Zonebourse", canal: "fonction-reaction" },
      { instrumentId: "spx", cause: null, emetteur: null, canal: null },
      { instrumentId: "bund", cause: null, emetteur: null, canal: null },
    ],
  },
];

describe("rendreBlocMarches — écrit par le code", () => {
  const texte = rendreBlocMarches(MARCHES, CONTEXTE);

  it("sous-titre = nom du driver ; une ligne par instrument, sens, ampleur, unité et les deux dates", () => {
    expect(texte).toMatch(/^### Taux directeurs\n\n/);
    expect(texte).toContain("- **US 10 ans** : +12 bps sur la semaine (du 23/10 au 30/10) ; cause : Les rendements remontent avec la réévaluation du cycle de la Fed (Zonebourse).");
    expect(texte).toContain("- **S&P 500** : −2,3 % sur la semaine (du 23/10 au 30/10) ; Sans lien clair avec ce driver.");
  });

  it("un instrument sans variation est écrit « non suivi » — jamais un tiret ni un zéro", () => {
    expect(texte).toContain("- **Bund 10 ans** : non suivi ; Sans lien clair avec ce driver.");
    expect(texte).not.toMatch(/ : [—-] /);
  });

  it("aucune moyenne ni agrégat par classe d'actifs", () => {
    expect(texte).not.toMatch(/moyenne|agrégat|ensemble des|classe/i);
    expect(texte.match(/^- /gm)).toHaveLength(3);
  });

  it("formate le signe et l'unité", () => {
    const ok = (value: number, unit: "bps" | "pct") =>
      formaterVariation({ instrumentId: "x", status: "ok", value, unit, fromDate: "", fromValue: 0, toDate: "", toValue: 0 });
    expect(ok(-5.4, "bps")).toBe("−5 bps");
    expect(ok(0, "bps")).toBe("0 bps");
    expect(ok(4, "pct")).toBe("+4,0 %");
  });

  it("sans driver instrumenté, aucune ligne inventée", () => {
    expect(rendreBlocMarches([], CONTEXTE)).toMatch(/Aucun instrument collecté/);
  });
});

describe("les décisions par ligne", () => {
  const ligne = MARCHES[0].lignes[0];

  it("refuser écarte la cause : le mouvement reste, la ligne dit « Sans lien clair »", () => {
    const t = rendreBlocMarches(MARCHES, CONTEXTE, { "rates/us10y": { action: "refuser" } });
    expect(t).toContain("+12 bps sur la semaine (du 23/10 au 30/10) ; Sans lien clair avec ce driver.");
  });

  it("corriger remplace la cause et garde l'émetteur, ou en prend un autre de la fiche", () => {
    expect(ligneEffective(ligne, { action: "corriger", cause: "Une cause retouchée." })).toMatchObject({ cause: "Une cause retouchée.", emetteur: "Zonebourse" });
    expect(ligneEffective(ligne, { action: "corriger", cause: "Autre.", emetteur: "Eurostat" })).toMatchObject({ emetteur: "Eurostat" });
  });

  it("une cause corrigée sur une ligne sans émetteur ne se publie pas : elle n'est pas attribuable", () => {
    const sans = MARCHES[0].lignes[1];
    expect(ligneEffective(sans, { action: "corriger", cause: "Une cause." })).toMatchObject({ cause: null, emetteur: null });
  });

  it("l'authorship du bloc se déduit des lignes, comme celle des guets", () => {
    const toutes = { "rates/us10y": { action: "accepter" }, "rates/spx": { action: "refuser" }, "rates/bund": { action: "accepter" } } as const;
    expect(authorshipBlocMarches(MARCHES, { ...toutes })).toBe("ia-relue");
    expect(authorshipBlocMarches(MARCHES, { ...toutes, "rates/spx": { action: "corriger", cause: "x", emetteur: "Eurostat" } })).toBe("ia-corrigee");
    // Une cause proposée jamais ouverte : le bloc reste `ia`, donc la publication est bloquée.
    expect(authorshipBlocMarches(MARCHES, {})).toBe("ia");
    // Les lignes sans cause du modèle n'ont rien à relire : elles ne comptent pas (J1.4).
    expect(authorshipBlocMarches(MARCHES, { "rates/us10y": { action: "accepter" } })).toBe("ia-relue");
    expect(authorshipBlocMarches([], {})).toBe("ia-relue");
  });

  it("sépare les causes du modèle des causes retapées", () => {
    const { modele, corrigees } = causesAControler(MARCHES, { "rates/us10y": { action: "corriger", cause: "Retouchée." } });
    expect(modele).toBe("");
    expect(corrigees).toBe("Retouchée (Zonebourse).");
  });
});

// ---------------------------------------------------------------------------
// Le contrôle des chiffres s'applique aux causes — régime A compris
// ---------------------------------------------------------------------------

const BRENT: ObservationContexte = {
  instrumentId: "brent",
  label: "Brent",
  unit: "usd",
  valeurs: [
    { date: "2026-09-03", value: 101.4 },
    { date: "2026-09-04", value: 102.96 },
  ],
  ytdBasis: null,
  variationSeance: 1.5,
  variationYTD: null,
  fraicheur: "ok",
};

const PAQUET: ContextePaquet = {
  noteType: "hebdo",
  slug: "2026-S45",
  isoWeek: "2026-S45",
  date: "2026-11-07",
  comparesTo: "2026-S44",
  specialesDeLaSemaine: [],
  notePrecedente: null,
  ficheNotion: {
    pageId: "p",
    url: "https://notion.so/p",
    semaine: "S45 — lundi 02/11 au dimanche 08/11",
    contenu: "La BCE porte sa facilité de dépôt à 2,50 % (communiqué BCE).\nLe Brent a fini à 104,00 $ le 04/09 (Zonebourse).",
    sources: ["communiqué BCE", "Zonebourse"],
    recupereLe: "2026-11-07T09:00:00Z",
  },
  observations: [BRENT],
  drivers: [],
  itemsVeille: [],
  scenariosCourants: [],
  tendancesCourantes: [],
  guetsOuverts: [],
  guetsExpires: [],
  budgetGuets: 3,
  placesThemes: 5,
  themesExistants: [],
  echeancesSemaine: [],
  trigger: null,
  marchesParDriver: [
    {
      driverId: "iran",
      label: "Conflit iranien",
      instruments: [{ instrumentId: "brent", label: "Brent", mesure: { instrumentId: "brent", status: "ok", value: 1.5, unit: "pct", fromDate: "2026-09-03", fromValue: 101.4, toDate: "2026-09-04", toValue: 102.96 } }],
    },
  ],
};

function brouillon(cause: string, emetteur: string): Brouillon {
  return {
    regimeStatementPropositions: REGIMES_TEST,
    keyIndicators: [{ label: "Régime", value: "Choc" }],
    channels: ["nature-choc"],
    driverOrder: ["iran"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: { CeQuiAChange: "Rien n'a changé." },
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [],
    marchesParDriver: [{ driverId: "iran", lignes: [{ instrumentId: "brent", cause, emetteur, canal: "nature-choc" }] }],
    driverCandidate: null,
    themesProposes: [],
    redactionNotes: "",
  };
}

describe("le contrôle des chiffres sur les causes", () => {
  const verdicts = (cause: string, emetteur: string) =>
    controlerChiffres(brouillon(cause, emetteur), PAQUET).verdicts.filter((v) => v.bloc === "LesMarchesParDriver");

  it("une cause ne fait pas passer un chiffre du régime A sans date", () => {
    const v = verdicts("Le Brent cote 102,96 $ après la frappe", "Zonebourse");
    expect(v.map((x) => x.verdict)).toEqual(["sans-date"]);
    expect(controlerChiffres(brouillon("Le Brent cote 102,96 $ après la frappe", "Zonebourse"), PAQUET).bloque).toBe(true);
  });

  it("une valeur de la fiche qui contredit la base bloque : c'est la base qui fait foi", () => {
    const v = verdicts("Le Brent finit à 104,00 $ au 04/09 après la frappe", "Zonebourse");
    expect(v.map((x) => x.verdict)).toEqual(["ecart"]);
  });

  it("le même chiffre, daté et conforme à la base, passe", () => {
    const c = controlerChiffres(brouillon("Le Brent finit à 102,96 $ au 04/09 après la frappe", "Zonebourse"), PAQUET);
    expect(c.verdicts.filter((v) => v.bloc === "LesMarchesParDriver").map((v) => v.verdict)).toEqual(["conforme"]);
    expect(c.bloque).toBe(false);
  });

  it("un chiffre du régime B se retrouve dans la fiche, avec son émetteur dans la phrase", () => {
    expect(verdicts("La facilité de dépôt est portée à 2,50 %", "communiqué BCE").map((x) => x.verdict)).toEqual(["conforme"]);
    expect(verdicts("La facilité de dépôt est portée à 2,60 %", "communiqué BCE").map((x) => x.verdict)).toEqual(["introuvable"]);
  });

  it("une cause sans chiffre ne produit aucun verdict, et une ligne « sans lien clair » aucune phrase", () => {
    expect(verdicts("La frappe réduit l'offre disponible", "Zonebourse")).toEqual([]);
  });
});

describe("rendreMdx — la hebdo de la nouvelle structure", () => {
  it("porte « Les marchés par driver » à la place du bloc 4, rendu par le code", () => {
    const { mdx } = rendreMdx(brouillon("La frappe réduit l'offre disponible", "Zonebourse"), { ...PAQUET, specialesDeLaSemaine: [] }, "2026-11-07");
    expect(mdx).toContain("<LesMarchesParDriver>");
    expect(mdx).not.toContain("<CeQueJavaisMalLu>");
    expect(mdx).toContain("### Conflit iranien");
    expect(mdx).toContain("- **Brent** : +1,5 % sur la semaine (du 03/09 au 04/09) ; cause : La frappe réduit l'offre disponible (Zonebourse).");
    // L'ordre canonique : après la révision des scénarios, avant le bloc 5.
    expect(mdx.indexOf("<RevisionDesScenarios>")).toBeLessThan(mdx.indexOf("<LesMarchesParDriver>"));
    expect(mdx.indexOf("<LesMarchesParDriver>")).toBeLessThan(mdx.indexOf("<CeQueJeSurveille>"));
  });

  it("l'ancienne structure garde son bloc 4 vide", () => {
    const { mdx } = rendreMdx(brouillon("x", "Zonebourse"), { ...PAQUET, isoWeek: "2026-S44", slug: "2026-S44", marchesParDriver: null }, "2026-10-31");
    expect(mdx).toContain("<CeQueJavaisMalLu>");
    expect(mdx).not.toContain("<LesMarchesParDriver>");
  });
});
