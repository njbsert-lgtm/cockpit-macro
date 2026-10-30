import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { parseNote } from "@/lib/notes";
import { rendreMdx } from "./mdx";
import {
  assemblerNoteFinale,
  blocsAAuthorshipDirecte,
  conditionsManquantes,
  construireArtefactsPublication,
  decisionsVides,
  type Decisions,
} from "./publication";
import { etatPublication } from "./etat-publication";
import { REGIMES_TEST } from "./regime-fixture";
import type { ContextePaquet, ObservationContexte } from "./context";
import type { Brouillon } from "./schema";

/**
 * Le portail pour une hebdo de la nouvelle structure : « chaque ligne du bloc marchés a été
 * tranchée » remplace « le bloc 4 est renseigné », ligne par ligne, et l'authorship du bloc se
 * déduit des lignes.
 */

const BRENT: ObservationContexte = {
  instrumentId: "brent",
  label: "Brent",
  unit: "usd",
  valeurs: [
    { date: "2026-11-05", value: 101.4 },
    { date: "2026-11-06", value: 102.96 },
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
    contenu: "Le Brent a fini à 104,00 $ le 06/11 (Zonebourse).",
    sources: ["Zonebourse", "Eurostat"],
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
      instruments: [
        { instrumentId: "brent", label: "Brent", mesure: { instrumentId: "brent", status: "ok", value: 1.5, unit: "pct", fromDate: "2026-10-30", fromValue: 101.4, toDate: "2026-11-06", toValue: 102.96 } },
        { instrumentId: "gold", label: "Or", mesure: { instrumentId: "gold", status: "indisponible", reason: "donnee-absente", message: "donnée absente au 30/10" } },
      ],
    },
  ],
};

function brouillon(cause: string): Brouillon {
  return {
    regimeStatementPropositions: REGIMES_TEST,
    keyIndicators: [{ label: "Régime", value: "Choc" }],
    channels: ["nature-choc"],
    driverOrder: ["iran"],
    trendRefs: [],
    instrumentRefs: [],
    veilleItemRefs: [],
    blocs: {
      CeQuiAChange: "### Un sujet\n\n**Une affirmation.** Le texte.",
      CeQuiSestConfirme: "### Un sujet\n\n**Une affirmation.** Le texte.",
      RevisionDesScenarios: "### Conflit iranien\n\n**Pas de révision.** Le texte.",
      CeQueJeSurveille: "Le texte des guets.",
    },
    sources: [],
    scenarioRevisions: [],
    trendUpdates: [],
    guets: [
      { driverId: "iran", axeLibelle: null, libelle: "Un guet", attendu: "A", confirmeSi: "B", infirmeSi: "C", echeance: "2026-11-20", sourceAttendue: [] },
    ],
    marchesParDriver: [
      {
        driverId: "iran",
        lignes: [
          { instrumentId: "brent", cause, emetteur: "Zonebourse", canal: "nature-choc" },
          { instrumentId: "gold", cause: null, emetteur: null, canal: null },
        ],
      },
    ],
    driverCandidate: null,
    themesProposes: [],
    redactionNotes: "",
  };
}

function note(b: Brouillon) {
  const { mdx } = rendreMdx(b, PAQUET, "2026-11-07");
  return parseNote("2026-S45", mdx);
}

const CAUSE = "La frappe sur le terminal réduit l'offre disponible";

describe("conditions de publication — chaque ligne du bloc marchés est tranchée", () => {
  it("le bloc 4 n'est plus une condition ; chaque ligne où le modèle propose une cause bloque", () => {
    const b = brouillon(CAUSE);
    const codes = conditionsManquantes(note(b), b, decisionsVides()).map((m) => m.code);
    expect(codes).not.toContain("bloc4");
    expect(codes).toContain("ligne:iran/brent");
    // Une ligne sans cause (« donnée absente », « Sans lien clair ») ne porte aucun texte du modèle :
    // elle ne bloque pas (décision d'orchestrateur, J1.4).
    expect(codes).not.toContain("ligne:iran/gold");
  });

  it("tranchée, une ligne ne bloque plus — et les autres conditions ne changent pas", () => {
    const b = brouillon(CAUSE);
    const d: Decisions = { ...decisionsVides(), lignes: { "iran/brent": { action: "accepter" } } };
    const codes = conditionsManquantes(note(b), b, d).map((m) => m.code);
    expect(codes.filter((c) => c.startsWith("ligne:"))).toEqual([]);
    expect(codes).toContain("regime");
    expect(codes).toContain("guet:2026-s45-g1");
  });

  it("le bloc n'a pas d'authorship directe : elle se déduit des lignes", () => {
    expect(blocsAAuthorshipDirecte(note(brouillon(CAUSE)).blocks)).not.toContain("LesMarchesParDriver");
  });
});

describe("le contrôle des chiffres, à la publication, sur les causes", () => {
  const CAUSE_SANS_DATE = "Le Brent cote 102,96 $ après la frappe";

  it("une cause du modèle acceptée telle quelle ne fait pas passer un chiffre du régime A sans date", () => {
    const b = brouillon(CAUSE_SANS_DATE);
    const d: Decisions = { ...decisionsVides(), lignes: { "iran/brent": { action: "accepter" } } };
    const etat = etatPublication(note(b), b, d, PAQUET);
    expect(etat.rapportChiffres.bloque).toBe(true);
    expect(etat.rapportChiffres.bloquants?.map((v) => v.verdict)).toEqual(["sans-date"]);
  });

  it("refuser la cause lève le blocage : il n'y a plus de phrase du modèle", () => {
    const b = brouillon(CAUSE_SANS_DATE);
    const d: Decisions = { ...decisionsVides(), lignes: { "iran/brent": { action: "refuser" } } };
    expect(etatPublication(note(b), b, d, PAQUET).rapportChiffres.bloque).toBe(false);
  });

  it("une cause retapée par l'humain est signalée sans bloquer, comme tout texte corrigé", () => {
    const b = brouillon(CAUSE);
    const d: Decisions = {
      ...decisionsVides(),
      lignes: { "iran/brent": { action: "corriger", cause: "Le Brent cote 102,96 $ après la frappe", emetteur: "Zonebourse" } },
    };
    const etat = etatPublication(note(b), b, d, PAQUET);
    expect(etat.rapportChiffres.verdicts.some((v) => v.verdict === "sans-date")).toBe(true);
    expect(etat.rapportChiffres.bloque).toBe(false);
  });
});

describe("la note finale", () => {
  const decisionsCompletes = (lignes: Decisions["lignes"]): Decisions => ({
    ...decisionsVides(),
    blocs: {
      CeQuiAChange: { authorship: "ia-relue", texte: "### Un sujet\n\n**Une affirmation.** Le texte." },
      CeQuiSestConfirme: { authorship: "ia-relue", texte: "### Un sujet\n\n**Une affirmation.** Le texte." },
      RevisionDesScenarios: { authorship: "ia-relue", texte: "### Conflit iranien\n\n**Pas de révision.** Le texte." },
    },
    guets: { "2026-s45-g1": { action: "accepter" } },
    regime: { choix: "fait", texte: "" },
    lignes,
  });

  it("reconstruit le bloc par le code, décisions appliquées, et déduit l'authorship des lignes", () => {
    const b = brouillon(CAUSE);
    const d = decisionsCompletes({
      "iran/brent": { action: "corriger", cause: "Une cause retouchée", emetteur: "Eurostat" },
      "iran/gold": { action: "refuser" },
    });
    const final = construireArtefactsPublication(note(b), b, PAQUET, d, "2026-11-08").note;
    const fichier = matter(final.mdx);
    expect(fichier.data.authorship.LesMarchesParDriver).toBe("ia-corrigee");
    expect(fichier.content).toContain("- **Brent** : +1,5 % sur la semaine (du 30/10 au 06/11) ; cause : Une cause retouchée (Eurostat).");
    expect(fichier.content).toContain("- **Or** : donnée absente au 30/10 ; Sans lien clair avec ce driver.");
    expect(fichier.content).not.toContain("<CeQueJavaisMalLu>");
    expect(fichier.content).not.toContain(CAUSE);
  });

  it("toutes les lignes relues telles quelles : ia-relue ; une ligne jamais ouverte : ia, donc bloquant", () => {
    const b = brouillon(CAUSE);
    const relues = decisionsCompletes({ "iran/brent": { action: "accepter" }, "iran/gold": { action: "accepter" } });
    expect(matter(assemblerNoteFinale(note(b), relues, "2026-11-08", { brouillon: b, paquet: PAQUET }).mdx).data.authorship.LesMarchesParDriver).toBe("ia-relue");
    // Une ligne sans cause du modèle (l'or) n'a rien à relire : elle ne change pas l'authorship.
    const sansLaLigneVide = decisionsCompletes({ "iran/brent": { action: "accepter" } });
    expect(matter(assemblerNoteFinale(note(b), sansLaLigneVide, "2026-11-08", { brouillon: b, paquet: PAQUET }).mdx).data.authorship.LesMarchesParDriver).toBe("ia-relue");
    // Une cause proposée, jamais ouverte : le bloc reste `ia`.
    const ouverte = decisionsCompletes({});
    expect(matter(assemblerNoteFinale(note(b), ouverte, "2026-11-08", { brouillon: b, paquet: PAQUET }).mdx).data.authorship.LesMarchesParDriver).toBe("ia");
  });

  it("une cause ajoutée à la main sur une ligne sans cause est publiée, et le bloc devient ia-corrigee", () => {
    const b = brouillon(CAUSE);
    const d = decisionsCompletes({
      "iran/brent": { action: "accepter" },
      "iran/gold": { action: "corriger", cause: "Les achats des banques centrales soutiennent l'or", emetteur: "Eurostat" },
    });
    const fichier = matter(assemblerNoteFinale(note(b), d, "2026-11-08", { brouillon: b, paquet: PAQUET }).mdx);
    expect(fichier.data.authorship.LesMarchesParDriver).toBe("ia-corrigee");
    expect(fichier.content).toContain("cause : Les achats des banques centrales soutiennent l'or (Eurostat).");
  });

  it("refuse de reconstruire le bloc sans le brouillon proposé ni le paquet", () => {
    const b = brouillon(CAUSE);
    expect(() => assemblerNoteFinale(note(b), decisionsVides(), "2026-11-08")).toThrow(/requis pour le reconstruire/);
  });
});
