import { describe, expect, it } from "vitest";
import { EDGAR_SOURCE, parseEdgarSubmissions } from "./edgar";
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
