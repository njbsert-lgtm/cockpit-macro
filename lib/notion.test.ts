import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chercherFiche,
  configNotion,
  couvre,
  emetteursCites,
  lireSemaine,
  marquerLue,
  normaliserIdBase,
  rendreBloc,
  texteDePropriete,
  type NotionConfig,
} from "./notion";

// ---------------------------------------------------------------------------
// L'identifiant de base — les deux formes que Notion affiche
// ---------------------------------------------------------------------------

describe("normaliserIdBase — avec ou sans tirets, une seule forme en sortie", () => {
  const CANONIQUE = "3dbda7c5-2a16-8130-b6be-e24962e15933";

  it("accepte la forme sans tirets, celle de l'URL brute d'une base", () => {
    expect(normaliserIdBase("3dbda7c52a168130b6bee24962e15933")).toBe(CANONIQUE);
  });

  it("accepte la forme déjà groupée avec des tirets, et la rend identique", () => {
    expect(normaliserIdBase(CANONIQUE)).toBe(CANONIQUE);
  });

  it("ignore la casse", () => {
    expect(normaliserIdBase("3DBDA7C52A168130B6BEE24962E15933")).toBe(CANONIQUE);
  });

  it("tolère les espaces en bout de chaîne", () => {
    expect(normaliserIdBase(`  ${CANONIQUE}  `)).toBe(CANONIQUE);
  });

  it("refuse un identifiant trop court plutôt que d'appeler une base qui n'existe pas", () => {
    expect(normaliserIdBase("3dbda7c5")).toBeNull();
  });

  it("refuse l'URL entière collée par erreur, plutôt que la fiche à l'intérieur", () => {
    expect(
      normaliserIdBase("https://notion.so/monworkspace/3dbda7c52a168130b6bee24962e15933?v=abc"),
    ).toBeNull();
  });

  it("refuse une chaîne vide", () => {
    expect(normaliserIdBase("")).toBeNull();
  });
});

describe("configNotion — normalise l'identifiant de base à la lecture", () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rend un config utilisable à partir d'un identifiant sans tirets", () => {
    process.env.NOTION_TOKEN = "secret_test";
    process.env.NOTION_VUES_MACRO_DB = "3dbda7c52a168130b6bee24962e15933";
    expect(configNotion()).toEqual({
      token: "secret_test",
      databaseId: "3dbda7c5-2a16-8130-b6be-e24962e15933",
    });
  });

  it("rend le même config, tirets déjà présents dans la variable", () => {
    process.env.NOTION_TOKEN = "secret_test";
    process.env.NOTION_VUES_MACRO_DB = "3dbda7c5-2a16-8130-b6be-e24962e15933";
    expect(configNotion()?.databaseId).toBe("3dbda7c5-2a16-8130-b6be-e24962e15933");
  });

  it("rend null quand une variable manque", () => {
    process.env.NOTION_TOKEN = "secret_test";
    delete process.env.NOTION_VUES_MACRO_DB;
    expect(configNotion()).toBeNull();
  });

  it("rend null quand l'identifiant ne se ramène pas à 32 caractères hexadécimaux", () => {
    process.env.NOTION_TOKEN = "secret_test";
    process.env.NOTION_VUES_MACRO_DB = "pas-un-identifiant";
    expect(configNotion()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// La propriété `Semaine`
// ---------------------------------------------------------------------------

describe("lireSemaine — 'S38 — lundi 14/09 au dimanche 20/09'", () => {
  it("lit le numéro et le lundi couvert", () => {
    expect(lireSemaine("S38 — lundi 14/09 au dimanche 20/09")).toEqual({
      numero: 38,
      lundi: { jour: 14, mois: 9 },
    });
  });

  it("accepte un libellé qui ne porte que le numéro", () => {
    expect(lireSemaine("S07")).toEqual({ numero: 7, lundi: null });
  });

  it("rend null quand aucun numéro de semaine ne se lit", () => {
    expect(lireSemaine("Synthèse de septembre")).toBeNull();
  });
});

describe("couvre — la sélection se fait sur la semaine, jamais sur la date de création", () => {
  it("accepte la fiche dont le numéro et le lundi correspondent", () => {
    expect(couvre("S38 — lundi 14/09 au dimanche 20/09", "2026-S38")).toBe(true);
  });

  it("refuse un autre numéro de semaine", () => {
    // Le cas qui justifie la règle : une fiche créée en avance pour la semaine suivante ne
    // doit pas être ramenée parce qu'elle est la plus récente.
    expect(couvre("S39 — lundi 21/09 au dimanche 27/09", "2026-S38")).toBe(false);
  });

  it("refuse la même semaine d'une autre année", () => {
    // Le libellé ne porte pas l'année : c'est le lundi qui tranche.
    expect(couvre("S38 — lundi 15/09 au dimanche 21/09", "2026-S38")).toBe(false);
  });

  it("accepte un libellé sans lundi, faute de mieux", () => {
    expect(couvre("S38", "2026-S38")).toBe(true);
  });

  it("refuse un libellé illisible plutôt que de deviner", () => {
    expect(couvre("Semaine du 14 septembre", "2026-S38")).toBe(false);
  });
});

describe("texteDePropriete", () => {
  it("lit un titre", () => {
    expect(
      texteDePropriete({ type: "title", title: [{ plain_text: "S38 — lundi 14/09" }] }),
    ).toBe("S38 — lundi 14/09");
  });

  it("lit un rich_text en plusieurs morceaux", () => {
    expect(
      texteDePropriete({
        type: "rich_text",
        rich_text: [{ plain_text: "S38" }, { plain_text: " — lundi 14/09" }],
      }),
    ).toBe("S38 — lundi 14/09");
  });

  it("lit un select et une formule", () => {
    expect(texteDePropriete({ type: "select", select: { name: "S38" } })).toBe("S38");
    expect(texteDePropriete({ type: "formula", formula: { string: "S38" } })).toBe("S38");
  });

  it("rend une chaîne vide sur un type non textuel plutôt que de planter", () => {
    expect(texteDePropriete({ type: "checkbox", checkbox: true })).toBe("");
    expect(texteDePropriete(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Les blocs
// ---------------------------------------------------------------------------

function richText(texte: string, annotations = {}) {
  return { rich_text: [{ plain_text: texte, annotations }] };
}

describe("rendreBloc — Notion vers markdown", () => {
  it("rend les titres et les paragraphes", () => {
    expect(rendreBloc({ type: "heading_2", heading_2: richText("Banques centrales") })).toBe(
      "## Banques centrales",
    );
    expect(rendreBloc({ type: "paragraph", paragraph: richText("La Fed a relevé.") })).toBe(
      "La Fed a relevé.",
    );
  });

  it("rend les listes et les cases à cocher", () => {
    expect(
      rendreBloc({ type: "bulleted_list_item", bulleted_list_item: richText("Un point") }),
    ).toBe("- Un point");
    expect(rendreBloc({ type: "to_do", to_do: { ...richText("Fait"), checked: true } })).toBe(
      "- [x] Fait",
    );
  });

  it("conserve gras, italique, code et liens", () => {
    expect(
      rendreBloc({ type: "paragraph", paragraph: richText("Fed", { bold: true }) }),
    ).toBe("**Fed**");
    expect(
      rendreBloc({
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "communiqué", href: "https://fed.gov/a" }] },
      }),
    ).toBe("[communiqué](https://fed.gov/a)");
  });

  it("ignore un paragraphe vide — une respiration n'est pas du contenu", () => {
    expect(rendreBloc({ type: "paragraph", paragraph: { rich_text: [] } })).toBeNull();
  });

  it("ignore un type sans traduction textuelle honnête plutôt que d'en inventer une", () => {
    // Une image ou une base embarquée n'a pas d'équivalent en texte : en fabriquer un ferait
    // croire au modèle qu'il a lu quelque chose.
    expect(rendreBloc({ type: "image", image: {} })).toBeNull();
    expect(rendreBloc({ type: "child_database", child_database: {} })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Les émetteurs
// ---------------------------------------------------------------------------

describe("emetteursCites — le vivier des autorités citables", () => {
  const fiche = `La Fed a maintenu son taux (communiqué FOMC).
L'IPCH ressort à 2,4 % (Eurostat, publication du 17/09).
Le Brent finit à 102,96 $ (Zonebourse).
Peter Oppenheimer (Goldman Sachs) note la concentration.`;

  it("retient les noms cités entre parenthèses", () => {
    const trouves = emetteursCites(fiche);
    expect(trouves).toContain("Eurostat");
    expect(trouves).toContain("Zonebourse");
    expect(trouves).toContain("Goldman Sachs");
  });

  it("coupe au premier séparateur : « Eurostat », pas « Eurostat, publication du 17/09 »", () => {
    expect(emetteursCites(fiche)).not.toContain("Eurostat, publication du 17/09");
  });

  it("écarte ce qui n'est pas un nom — dates, nombres, URL", () => {
    const trouves = emetteursCites("Hausse (25 bps) le 16/09 (2026) voir (https://x.org/a).");
    expect(trouves).toEqual([]);
  });

  it("dédoublonne et trie", () => {
    expect(emetteursCites("(Eurostat) puis (Eurostat) et (BCE)")).toEqual(["BCE", "Eurostat"]);
  });

  it("retient un émetteur cité en lien markdown, dont la parenthèse ne porte que l'URL", () => {
    const trouves = emetteursCites(
      "Selon [brief.eco](http://brief.eco/), le déficit atteindrait 5 % du PIB.",
    );
    expect(trouves).toContain("brief.eco");
    expect(trouves).not.toContain("http://brief.eco/");
  });

  it("coupe aussi au premier séparateur dans un lien markdown avec sous-titre", () => {
    const trouves = emetteursCites(
      "[brief.eco, édition du 23/09](http://brief.eco/) rapporte que...",
    );
    expect(trouves).toContain("brief.eco");
    expect(trouves).not.toContain("brief.eco, édition du 23/09");
  });
});

// ---------------------------------------------------------------------------
// La recherche
// ---------------------------------------------------------------------------

function reponse(donnees: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => donnees,
    text: async () => JSON.stringify(donnees),
  } as unknown as Response;
}

function page(semaine: string, id = "page-1", edite = "2026-09-20T08:00:00Z") {
  return {
    id,
    url: `https://notion.so/${id}`,
    last_edited_time: edite,
    properties: { Semaine: { type: "title", title: [{ plain_text: semaine }] } },
  };
}

function blocsDe(...textes: string[]) {
  return {
    results: textes.map((t, i) => ({
      id: `b${i}`,
      type: "paragraph",
      has_children: false,
      paragraph: { rich_text: [{ plain_text: t }] },
    })),
    next_cursor: null,
    has_more: false,
  };
}

/** Un faux Notion : la requête de base d'abord, puis les blocs de la page retenue. */
function faux(pages: unknown[], blocs: unknown = blocsDe("Contenu.")) {
  const appels: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    appels.push({ url, init });
    if (url.includes("/databases/")) {
      return reponse({ results: pages, next_cursor: null, has_more: false });
    }
    if (url.includes("/blocks/")) return reponse(blocs);
    return reponse({});
  });
  return { fetcher, appels };
}

const CONFIG = (fetcher: NotionConfig["fetcher"]): NotionConfig => ({
  token: "secret_test",
  databaseId: "db-1",
  fetcher,
});

describe("chercherFiche", () => {
  it("retient la fiche de la semaine demandée, pas la plus récente", async () => {
    const { fetcher } = faux([
      page("S39 — lundi 21/09 au dimanche 27/09", "avance", "2026-09-21T10:00:00Z"),
      page("S38 — lundi 14/09 au dimanche 20/09", "bonne"),
    ]);
    const r = await chercherFiche("2026-S38", CONFIG(fetcher), "2026-09-20T09:00:00Z");

    expect(r.ok).toBe(true);
    if (!r.ok || !r.fiche) throw new Error("fiche attendue");
    expect(r.fiche.pageId).toBe("bonne");
    expect(r.fiche.semaine).toContain("S38");
    expect(r.fiche.recupereLe).toBe("2026-09-20T09:00:00Z");
  });

  it("récupère le contenu en markdown et les émetteurs cités", async () => {
    const { fetcher } = faux(
      [page("S38 — lundi 14/09 au dimanche 20/09")],
      blocsDe("La Fed a relevé (communiqué FOMC).", "Le Brent finit à 102,96 $ (Zonebourse)."),
    );
    const r = await chercherFiche("2026-S38", CONFIG(fetcher));

    if (!r.ok || !r.fiche) throw new Error("fiche attendue");
    expect(r.fiche.contenu).toContain("La Fed a relevé");
    expect(r.fiche.contenu).toContain("Zonebourse");
    expect(r.fiche.sources).toContain("Zonebourse");
  });

  it("distingue la base vide — le partage oublié — d'une semaine sans fiche", async () => {
    const vide = await chercherFiche("2026-S38", CONFIG(faux([]).fetcher));
    expect(vide).toMatchObject({ ok: true, fiche: null });
    if (!vide.ok || vide.fiche) throw new Error("absence attendue");
    expect(vide.raison).toContain("partages");

    const sansFiche = await chercherFiche(
      "2026-S38",
      CONFIG(faux([page("S30 — lundi 20/07 au dimanche 26/07")]).fetcher),
    );
    if (!sansFiche.ok || sansFiche.fiche) throw new Error("absence attendue");
    expect(sansFiche.raison).toContain("aucune fiche ne couvre");
  });

  it("remonte une erreur d'appel sans la confondre avec une absence", async () => {
    const fetcher = vi.fn(async () => reponse({ message: "Unauthorized" }, 401));
    const r = await chercherFiche("2026-S38", CONFIG(fetcher));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erreur).toContain("401");
  });

  it("porte le jeton et la version d'API sur chaque appel", async () => {
    const { fetcher, appels } = faux([page("S38 — lundi 14/09 au dimanche 20/09")]);
    await chercherFiche("2026-S38", CONFIG(fetcher));

    for (const { init } of appels) {
      const entetes = init.headers as Record<string, string>;
      expect(entetes.Authorization).toBe("Bearer secret_test");
      expect(entetes["Notion-Version"]).toBeTruthy();
    }
  });

  it("départage deux fiches de la même semaine par la dernière modification", async () => {
    const { fetcher } = faux([
      page("S38 — lundi 14/09 au dimanche 20/09", "vieille", "2026-09-18T08:00:00Z"),
      page("S38 — lundi 14/09 au dimanche 20/09", "fraiche", "2026-09-20T08:00:00Z"),
    ]);
    const r = await chercherFiche("2026-S38", CONFIG(fetcher));
    if (!r.ok || !r.fiche) throw new Error("fiche attendue");
    expect(r.fiche.pageId).toBe("fraiche");
  });
});

describe("marquerLue", () => {
  it("bascule la propriété par un PATCH sur la page", async () => {
    const appels: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      appels.push({ url, init });
      return reponse({});
    });

    expect(await marquerLue("page-1", CONFIG(fetcher))).toEqual({ ok: true });
    expect(appels[0].url).toContain("/pages/page-1");
    expect(appels[0].init.method).toBe("PATCH");
    expect(JSON.parse(appels[0].init.body as string)).toEqual({
      properties: { Lue: { checkbox: true } },
    });
  });

  it("rend un échec plutôt que de lever — un brouillon écrit ne doit pas être perdu", async () => {
    const fetcher = vi.fn(async () => reponse({ message: "Forbidden" }, 403));
    const r = await marquerLue("page-1", CONFIG(fetcher));
    expect(r).toMatchObject({ ok: false });
  });
});
