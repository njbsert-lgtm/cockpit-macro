import { describe, expect, it } from "vitest";
import { EDGAR_SOURCE, isMajorEdgarForm, isMinorEdgarItem, parseEdgarSubmissions } from "./edgar";
import type { EdgarIssuer } from "@/config/veille-taxonomy";

const ISSUER: EdgarIssuer = { name: "Nvidia", cik: "0001045810", driverRefs: ["ai"] };
const NOW = new Date("2026-08-16T00:00:00Z");

function submissions(recent: Partial<Record<"form" | "filingDate" | "accessionNumber" | "primaryDocument", string[]>>) {
  return {
    filings: {
      recent: {
        form: [],
        filingDate: [],
        accessionNumber: [],
        primaryDocument: [],
        ...recent,
      },
    },
  };
}

describe("parseEdgarSubmissions", () => {
  it("construit une URL de dépôt et rattache le driver de l'émetteur, pas un mot-clé du titre", () => {
    const candidates = parseEdgarSubmissions(
      ISSUER,
      submissions({
        form: ["8-K"],
        filingDate: ["2026-08-15"],
        accessionNumber: ["0001045810-26-000123"],
        primaryDocument: ["form8k.htm"],
      }),
      NOW,
    );

    expect(candidates).toEqual([
      {
        title: "Nvidia — dépôt 8-K du 2026-08-15",
        url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000123/form8k.htm",
        source: EDGAR_SOURCE,
        sourceAuthority: 3,
        publishedAt: "2026-08-15T00:00:00.000Z",
        zones: ["us"],
        driverRefs: ["ai"],
      },
    ]);
  });

  it("écarte les dépôts plus anciens que la fenêtre de rattrapage", () => {
    const candidates = parseEdgarSubmissions(
      ISSUER,
      submissions({
        form: ["10-Q"],
        filingDate: ["2026-07-01"],
        accessionNumber: ["0001045810-26-000001"],
        primaryDocument: ["form10q.htm"],
      }),
      NOW,
    );
    expect(candidates).toHaveLength(0);
  });

  it("renvoie un tableau vide sur une réponse qui ne respecte pas le schéma attendu", () => {
    expect(parseEdgarSubmissions(ISSUER, { rien: true }, NOW)).toEqual([]);
  });
});

describe("dépôts mineurs — écartés à la collecte", () => {
  it("ne garde que les formulaires qui portent de l'information macro", () => {
    const candidates = parseEdgarSubmissions(
      ISSUER,
      submissions({
        form: ["4", "144", "8-K", "SC 13G", "10-Q", "3", "5", "10-K/A"],
        filingDate: Array(8).fill("2026-08-15"),
        accessionNumber: ["a", "b", "c", "d", "e", "f", "g", "h"].map((x) => `0001045810-26-00000${x}`),
        primaryDocument: Array(8).fill("doc.htm"),
      }),
      NOW,
    );
    expect(candidates.map((c) => c.title)).toEqual([
      "Nvidia — dépôt 8-K du 2026-08-15",
      "Nvidia — dépôt 10-Q du 2026-08-15",
      "Nvidia — dépôt 10-K/A du 2026-08-15",
    ]);
  });

  it("reconnaît les cinq familles majeures et leurs amendements, pas les autres", () => {
    for (const f of ["8-K", "10-K", "10-Q", "S-1", "20-F", "10-K/A", "8-k"]) expect(isMajorEdgarForm(f), f).toBe(true);
    for (const f of ["4", "144", "3", "5", "SC 13D", "SC 13G", "13F-HR", "6-K", "DEF 14A"]) expect(isMajorEdgarForm(f), f).toBe(false);
  });

  it("reconnaît un dépôt mineur déjà en base à son titre, et lui seul", () => {
    expect(isMinorEdgarItem(EDGAR_SOURCE, "Meta Platforms — dépôt 4 du 2026-09-21")).toBe(true);
    expect(isMinorEdgarItem(EDGAR_SOURCE, "Nvidia — dépôt 144 du 2026-09-21")).toBe(true);
    expect(isMinorEdgarItem(EDGAR_SOURCE, "Nvidia — dépôt 8-K du 2026-09-21")).toBe(false);
    // Un titre d'une autre source qui contiendrait le même motif n'est jamais touché.
    expect(isMinorEdgarItem("BCE", "Quelqu'un — dépôt 4 du 2026-09-21")).toBe(false);
  });
});
